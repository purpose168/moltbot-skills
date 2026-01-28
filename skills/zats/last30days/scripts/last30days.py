#!/usr/bin/env python3
"""
last30days - 研究Reddit和X(原Twitter)上过去30天内关于某个话题的内容。

用法:
    python3 last30days.py <话题> [选项]

选项:
    --mock              使用测试数据代替真实的API调用
    --emit=MODE         输出模式: compact|json|md|context|path (默认: compact)
    --sources=MODE      数据源选择: auto|reddit|x|both (默认: auto)
    --quick             快速研究，使用较少的来源 (每个8-12条)
    --deep              全面研究，使用更多的来源 (Reddit 50-70条，X 40-60条)
    --debug             启用详细的调试日志
"""

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

# 将lib目录添加到系统路径中
SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

# 导入所需的库模块
from lib import (
    dates,
    dedupe,
    env,
    http,
    models,
    normalize,
    openai_reddit,
    reddit_enrich,
    render,
    schema,
    score,
    ui,
    websearch,
    xai_x,
)


def load_fixture(name: str) -> dict:
    """加载测试数据文件。

    Args:
        name: 测试数据文件名

    Returns:
        包含测试数据的字典，如果文件不存在则返回空字典
    """
    fixture_path = SCRIPT_DIR.parent / "fixtures" / name
    if fixture_path.exists():
        with open(fixture_path) as f:
            return json.load(f)
    return {}


def _search_reddit(
    topic: str,
    config: dict,
    selected_models: dict,
    from_date: str,
    to_date: str,
    depth: str,
    mock: bool,
) -> tuple:
    """通过OpenAI搜索Reddit（在线程中运行）。

    Returns:
        元组 (reddit_items, raw_openai, error)
        - reddit_items: 解析后的Reddit帖子列表
        - raw_openai: 原始的OpenAI API响应
        - error: 错误信息，如果没有错误则为None
    """
    raw_openai = None
    reddit_error = None

    if mock:
        # 模拟模式：加载测试数据
        raw_openai = load_fixture("openai_sample.json")
    else:
        try:
            # 真实模式：调用OpenAI API搜索Reddit
            raw_openai = openai_reddit.search_reddit(
                config["OPENAI_API_KEY"],
                selected_models["openai"],
                topic,
                from_date,
                to_date,
                depth=depth,
            )
        except http.HTTPError as e:
            raw_openai = {"error": str(e)}
            reddit_error = f"API错误: {e}"
        except Exception as e:
            raw_openai = {"error": str(e)}
            reddit_error = f"{type(e).__name__}: {e}"

    # 解析OpenAI响应，提取Reddit帖子
    reddit_items = openai_reddit.parse_reddit_response(raw_openai or {})

    # 如果结果太少，使用更简单的话题重新搜索
    if len(reddit_items) < 5 and not mock and not reddit_error:
        # 提取核心话题
        core = openai_reddit._extract_core_subject(topic)
        if core.lower() != topic.lower():
            try:
                retry_raw = openai_reddit.search_reddit(
                    config["OPENAI_API_KEY"],
                    selected_models["openai"],
                    core,
                    from_date, to_date,
                    depth=depth,
                )
                retry_items = openai_reddit.parse_reddit_response(retry_raw)
                # 添加之前未找到的帖子（通过URL去重）
                existing_urls = {item.get("url") for item in reddit_items}
                for item in retry_items:
                    if item.get("url") not in existing_urls:
                        reddit_items.append(item)
            except Exception:
                pass

    return reddit_items, raw_openai, reddit_error


def _search_x(
    topic: str,
    config: dict,
    selected_models: dict,
    from_date: str,
    to_date: str,
    depth: str,
    mock: bool,
) -> tuple:
    """通过xAI搜索X(原Twitter)（在线程中运行）。

    Returns:
        元组 (x_items, raw_xai, error)
        - x_items: 解析后的X帖子列表
        - raw_xai: 原始的xAI API响应
        - error: 错误信息，如果没有错误则为None
    """
    raw_xai = None
    x_error = None

    if mock:
        # 模拟模式：加载测试数据
        raw_xai = load_fixture("xai_sample.json")
    else:
        try:
            # 真实模式：调用xAI API搜索X
            raw_xai = xai_x.search_x(
                config["XAI_API_KEY"],
                selected_models["xai"],
                topic,
                from_date,
                to_date,
                depth=depth,
            )
        except http.HTTPError as e:
            raw_xai = {"error": str(e)}
            x_error = f"API错误: {e}"
        except Exception as e:
            raw_xai = {"error": str(e)}
            x_error = f"{type(e).__name__}: {e}"

    # 解析xAI响应，提取X帖子
    x_items = xai_x.parse_x_response(raw_xai or {})

    return x_items, raw_xai, x_error


def run_research(
    topic: str,
    sources: str,
    config: dict,
    selected_models: dict,
    from_date: str,
    to_date: str,
    depth: str = "default",
    mock: bool = False,
    progress: ui.ProgressDisplay = None,
) -> tuple:
    """运行研究流程。

    Returns:
        元组包含:
        - reddit_items: Reddit帖子列表
        - x_items: X帖子列表
        - web_needed: 是否需要WebSearch
        - raw_openai: 原始OpenAI响应
        - raw_xai: 原始xAI响应
        - raw_reddit_enriched: 增强后的Reddit数据
        - reddit_error: Reddit搜索错误
        - x_error: X搜索错误

    Note: web_needed为True时表示需要通过Claude进行WebSearch。
    脚本会输出一个标记，Claude会在会话中处理WebSearch。
    """
    reddit_items = []
    x_items = []
    raw_openai = None
    raw_xai = None
    raw_reddit_enriched = []
    reddit_error = None
    x_error = None

    # 检查是否需要WebSearch（仅网络模式下总是需要）
    web_needed = sources in ("all", "web", "reddit-web", "x-web")

    # 仅网络模式：不需要API调用，Claude处理所有内容
    if sources == "web":
        if progress:
            progress.start_web_only()
            progress.end_web_only()
        return reddit_items, x_items, True, raw_openai, raw_xai, raw_reddit_enriched, reddit_error, x_error

    # 确定需要运行哪些搜索
    run_reddit = sources in ("both", "reddit", "all", "reddit-web")
    run_x = sources in ("both", "x", "all", "x-web")

    # 使用线程池并行运行Reddit和X搜索
    reddit_future = None
    x_future = None

    with ThreadPoolExecutor(max_workers=2) as executor:
        # 提交两个搜索任务
        if run_reddit:
            if progress:
                progress.start_reddit()
            reddit_future = executor.submit(
                _search_reddit, topic, config, selected_models,
                from_date, to_date, depth, mock
            )

        if run_x:
            if progress:
                progress.start_x()
            x_future = executor.submit(
                _search_x, topic, config, selected_models,
                from_date, to_date, depth, mock
            )

        # 收集结果
        if reddit_future:
            try:
                reddit_items, raw_openai, reddit_error = reddit_future.result()
                if reddit_error and progress:
                    progress.show_error(f"Reddit错误: {reddit_error}")
            except Exception as e:
                reddit_error = f"{type(e).__name__}: {e}"
                if progress:
                    progress.show_error(f"Reddit错误: {e}")
            if progress:
                progress.end_reddit(len(reddit_items))

        if x_future:
            try:
                x_items, raw_xai, x_error = x_future.result()
                if x_error and progress:
                    progress.show_error(f"X错误: {x_error}")
            except Exception as e:
                x_error = f"{type(e).__name__}: {e}"
                if progress:
                    progress.show_error(f"X错误: {e}")
            if progress:
                progress.end_x(len(x_items))

    # 使用真实数据增强Reddit帖子（逐个处理，包含错误处理）
    if reddit_items:
        if progress:
            progress.start_reddit_enrich(1, len(reddit_items))

        for i, item in enumerate(reddit_items):
            if progress and i > 0:
                progress.update_reddit_enrich(i + 1, len(reddit_items))

            try:
                if mock:
                    mock_thread = load_fixture("reddit_thread_sample.json")
                    reddit_items[i] = reddit_enrich.enrich_reddit_item(item, mock_thread)
                else:
                    reddit_items[i] = reddit_enrich.enrich_reddit_item(item)
            except Exception as e:
                # 记录日志但不崩溃 - 保留未增强的帖子
                if progress:
                    progress.show_error(f"增强失败 {item.get('url', 'unknown')}: {e}")

            raw_reddit_enriched.append(reddit_items[i])

        if progress:
            progress.end_reddit_enrich()

    return reddit_items, x_items, web_needed, raw_openai, raw_xai, raw_reddit_enriched, reddit_error, x_error


def main():
    """主函数：解析参数并运行研究流程。"""
    parser = argparse.ArgumentParser(
        description="研究Reddit和X上过去30天内关于某个话题的内容"
    )
    parser.add_argument("topic", nargs="?", help="要研究的话题")
    parser.add_argument("--mock", action="store_true", help="使用测试数据")
    parser.add_argument(
        "--emit",
        choices=["compact", "json", "md", "context", "path"],
        default="compact",
        help="输出模式",
    )
    parser.add_argument(
        "--sources",
        choices=["auto", "reddit", "x", "both"],
        default="auto",
        help="数据源选择",
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="快速研究，使用较少的来源 (每个8-12条)",
    )
    parser.add_argument(
        "--deep",
        action="store_true",
        help="全面研究，使用更多的来源 (Reddit 50-70条，X 40-60条)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="启用详细的调试日志",
    )
    parser.add_argument(
        "--include-web",
        action="store_true",
        help="在Reddit/X之外同时包含通用网络搜索（权重较低）",
    )

    args = parser.parse_args()

    # 如果请求了调试日志，启用它
    if args.debug:
        os.environ["LAST30DAYS_DEBUG"] = "1"
        # 重新导入http模块以应用调试标志
        from lib import http as http_module
        http_module.DEBUG = True

    # 确定搜索深度
    if args.quick and args.deep:
        print("错误: 不能同时使用 --quick 和 --deep", file=sys.stderr)
        sys.exit(1)
    elif args.quick:
        depth = "quick"
    elif args.deep:
        depth = "deep"
    else:
        depth = "default"

    if not args.topic:
        print("错误: 请提供一个要研究的话题。", file=sys.stderr)
        print("用法: python3 last30days.py <话题> [选项]", file=sys.stderr)
        sys.exit(1)

    # 加载配置
    config = env.get_config()

    # 检查可用的数据源
    available = env.get_available_sources(config)

    # 模拟模式可以在没有密钥的情况下工作
    if args.mock:
        if args.sources == "auto":
            sources = "both"
        else:
            sources = args.sources
    else:
        # 验证请求的数据源是否可用
        sources, error = env.validate_sources(args.sources, available, args.include_web)
        if error:
            # 如果是关于WebSearch回退的警告，打印但继续
            if "WebSearch fallback" in error:
                print(f"注意: {error}", file=sys.stderr)
            else:
                print(f"错误: {error}", file=sys.stderr)
                sys.exit(1)

    # 获取日期范围
    from_date, to_date = dates.get_date_range(30)

    # 检查缺少哪些密钥，用于提示信息
    missing_keys = env.get_missing_keys(config)

    # 初始化进度显示
    progress = ui.ProgressDisplay(args.topic, show_banner=True)

    # 在研究之前显示缺少密钥的提示
    if missing_keys != 'none':
        progress.show_promo(missing_keys)

    # 选择模型
    if args.mock:
        # 使用模拟模型
        mock_openai_models = load_fixture("models_openai_sample.json").get("data", [])
        mock_xai_models = load_fixture("models_xai_sample.json").get("data", [])
        selected_models = models.get_models(
            {
                "OPENAI_API_KEY": "mock",
                "XAI_API_KEY": "mock",
                **config,
            },
            mock_openai_models,
            mock_xai_models,
        )
    else:
        selected_models = models.get_models(config)

    # 确定模式字符串
    if sources == "all":
        mode = "all"  # reddit + x + web
    elif sources == "both":
        mode = "both"  # reddit + x
    elif sources == "reddit":
        mode = "reddit-only"
    elif sources == "reddit-web":
        mode = "reddit-web"
    elif sources == "x":
        mode = "x-only"
    elif sources == "x-web":
        mode = "x-web"
    elif sources == "web":
        mode = "web-only"
    else:
        mode = sources

    # 运行研究
    reddit_items, x_items, web_needed, raw_openai, raw_xai, raw_reddit_enriched, reddit_error, x_error = run_research(
        args.topic,
        sources,
        config,
        selected_models,
        from_date,
        to_date,
        depth,
        args.mock,
        progress,
    )

    # 处理阶段
    progress.start_processing()

    # 标准化项目
    normalized_reddit = normalize.normalize_reddit_items(reddit_items, from_date, to_date)
    normalized_x = normalize.normalize_x_items(x_items, from_date, to_date)

    # 硬性日期过滤：排除验证日期在范围外的项目
    # 这是安全网 - 即使提示词让旧内容通过了，这个过滤器也会过滤掉
    filtered_reddit = normalize.filter_by_date_range(normalized_reddit, from_date, to_date)
    filtered_x = normalize.filter_by_date_range(normalized_x, from_date, to_date)

    # 为项目评分
    scored_reddit = score.score_reddit_items(filtered_reddit)
    scored_x = score.score_x_items(filtered_x)

    # 对项目排序
    sorted_reddit = score.sort_items(scored_reddit)
    sorted_x = score.sort_items(scored_x)

    # 去除重复项目
    deduped_reddit = dedupe.dedupe_reddit(sorted_reddit)
    deduped_x = dedupe.dedupe_x(sorted_x)

    progress.end_processing()

    # 创建报告
    report = schema.create_report(
        args.topic,
        from_date,
        to_date,
        mode,
        selected_models.get("openai"),
        selected_models.get("xai"),
    )
    report.reddit = deduped_reddit
    report.x = deduped_x
    report.reddit_error = reddit_error
    report.x_error = x_error

    # 生成上下文片段
    report.context_snippet_md = render.render_context_snippet(report)

    # 写入输出
    render.write_outputs(report, raw_openai, raw_xai, raw_reddit_enriched)

    # 显示完成
    if sources == "web":
        progress.show_web_only_complete()
    else:
        progress.show_complete(len(deduped_reddit), len(deduped_x))

    # 输出结果
    output_result(report, args.emit, web_needed, args.topic, from_date, to_date, missing_keys)


def output_result(
    report: schema.Report,
    emit_mode: str,
    web_needed: bool = False,
    topic: str = "",
    from_date: str = "",
    to_date: str = "",
    missing_keys: str = "none",
):
    """根据输出模式输出结果。

    Args:
        report: 研究报告对象
        emit_mode: 输出模式
        web_needed: 是否需要WebSearch
        topic: 研究话题
        from_date: 开始日期
        to_date: 结束日期
        missing_keys: 缺少的API密钥
    """
    if emit_mode == "compact":
        print(render.render_compact(report, missing_keys=missing_keys))
    elif emit_mode == "json":
        print(json.dumps(report.to_dict(), indent=2))
    elif emit_mode == "md":
        print(render.render_full_report(report))
    elif emit_mode == "context":
        print(report.context_snippet_md)
    elif emit_mode == "path":
        print(render.get_context_path())

    # 如果需要，输出WebSearch指令
    if web_needed:
        print("\n" + "="*60)
        print("### 需要WEBSEARCH ###")
        print("="*60)
        print(f"话题: {topic}")
        print(f"日期范围: {from_date} 到 {to_date}")
        print("")
        print("Claude: 使用你的WebSearch工具查找8-15个相关的网页。")
        print("排除: reddit.com, x.com, twitter.com（如上已涵盖）")
        print("包含: 博客、文档、新闻、教程，来自过去30天")
        print("")
        print("搜索后，综合WebSearch结果与上面的Reddit/X结果。")
        print("WebSearch项目的排名应低于同等的Reddit/X项目（它们缺乏参与度指标）。")
        print("="*60)


if __name__ == "__main__":
    main()
