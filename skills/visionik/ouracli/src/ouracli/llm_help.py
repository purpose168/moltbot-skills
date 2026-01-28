"""OuraCLI 的 LLM 帮助文档。"""

import json
from typing import Any, Literal


def _get_spec_dict() -> dict[str, Any]:
    """返回符合 dashdash-spec v0.2.0 的元数据。"""
    return {
        "specVersion": "0.2.0",
        "name": "ouracli",
        "version": "0.1.0",
        "description": "用于从您的 Oura Ring 设备访问 Oura Ring 健康和健康数据的命令行工具。",  # noqa: E501
        "usageContext": (
            "当用户需要从他们的 Oura Ring 检索健康指标（睡眠、活动、准备度、"
            "心率、血氧、压力、锻炼等）时使用。 "
            "需要 Oura 个人访问令牌。"
        ),
        "webUI": "https://cloud.ouraring.com",
        "apiDocs": "https://cloud.ouraring.com/v2/docs",
        "installation": {
            "method": "pip",
            "command": "pip install -e .[dev]",
            "notes": "先克隆仓库，然后运行 `task py:install` 或直接使用 pip install。",  # noqa: E501
        },
        "authentication": {
            "required": True,
            "type": "bearer_token",
            "envVar": "PERSONAL_ACCESS_TOKEN",
            "instructions": (
                "在 https://cloud.ouraring.com/personal-access-tokens 获取令牌。 "
                "通过环境变量、secrets/oura.env 或 ~/.secrets/oura.env 设置。"  # noqa: E501
            ),
        },
        "commands": [
            {
                "name": "activity",
                "description": "获取每日活动数据（步数、MET 值、卡路里）。",
                "examples": [
                    {
                        "command": "ouracli activity today --json",
                        "description": "今天的活动（JSON 格式）",
                    },
                    {"command": 'ouracli activity "7 days" --json', "description": "最近 7 天"},
                    {
                        "command": 'ouracli activity "2025-12-01 28 days" --html > dec.html',
                        "description": "12 月数据（带图表）",
                    },
                ],
                "notes": "支持 --tree、--json、--markdown、--html、--dataframe 格式。",  # noqa: E501
            },
            {
                "name": "sleep",
                "description": "获取每日睡眠数据（睡眠阶段、效率、睡眠期间的心率）。",  # noqa: E501
                "examples": [
                    {"command": "ouracli sleep today --json", "description": "今天的睡眠"},
                    {"command": 'ouracli sleep "30 days" --json', "description": "最近 30 天"},
                ],
            },
            {
                "name": "readiness",
                "description": "获取每日准备度分数和贡献因素。",
                "examples": [
                    {"command": 'ouracli readiness "7 days" --json', "description": "上周数据"}
                ],
                "notes": "contributors.resting_heart_rate 是一个分数（0-100），不是 BPM。",
            },
            {
                "name": "heartrate",
                "description": "获取 5 分钟分辨率的心率时间序列数据。",
                "examples": [
                    {
                        "command": "ouracli heartrate today --json",
                        "description": "今天的心率时间序列",
                    },
                    {
                        "command": 'ouracli heartrate "2025-12-15 1 days" --html > hr.html',
                        "description": "12 月 15 日图表",
                    },
                ],
            },
            {
                "name": "spo2",
                "description": "获取每日血氧数据。",
                "examples": [
                    {"command": 'ouracli spo2 "7 days" --json', "description": "上周血氧数据"}
                ],
            },
            {
                "name": "stress",
                "description": "获取每日压力数据。",
                "examples": [
                    {"command": 'ouracli stress "7 days" --json', "description": "上周压力数据"}
                ],
            },
            {
                "name": "workout",
                "description": "获取锻炼会话数据。",
                "examples": [
                    {
                        "command": 'ouracli workout "7 days" --json',
                        "description": "上周锻炼数据",
                    }
                ],
            },
            {
                "name": "session",
                "description": "获取活动会话数据。",
                "examples": [
                    {
                        "command": 'ouracli session "7 days" --json',
                        "description": "上周会话数据",
                    }
                ],
            },
            {
                "name": "tag",
                "description": "获取用户添加的标签。",
                "examples": [
                    {"command": 'ouracli tag "7 days" --json', "description": "上周标签"}
                ],
            },
            {
                "name": "rest_mode",
                "description": "获取休息模式期间的数据。",
                "examples": [
                    {
                        "command": 'ouracli rest_mode "7 days" --json',
                        "description": "上周休息模式",
                    }
                ],
            },
            {
                "name": "personal_info",
                "description": "获取用户个人资料信息。",
                "examples": [
                    {"command": "ouracli personal_info --json", "description": "用户资料"}
                ],
                "notes": "不接受日期范围。",
            },
            {
                "name": "all",
                "description": "获取所有可用的数据类型。",
                "examples": [
                    {
                        "command": 'ouracli all "7 days" --json',
                        "description": "所有数据，最近 7 天",
                    },
                    {
                        "command": 'ouracli all "30 days" --by-day --html > report.html',
                        "description": "月度报告",
                    },
                ],
                "notes": "支持 --by-day（默认）或 --by-method 分组。",
            },
        ],
        "dateRanges": {
            "description": "所有命令（除了 personal_info）都接受灵活的日期范围参数。",  # noqa: E501
            "supportedFormats": [
                "today",
                "yesterday",
                "YYYY-MM-DD",
                '"N days"',
                '"N weeks"',
                '"N months"',
                '"YYYY-MM-DD N days"',
            ],
            "unsupportedFormats": [
                "YYYY-MM-DD YYYY-MM-DD (two separate args)",
                '"YYYY-MM-DD to YYYY-MM-DD"',
                '"YYYY-MM-DD..YYYY-MM-DD"',
                "--start-date / --end-date flags",
                '"N months ago"',
            ],
            "notes": (
                "当日期范围包含空格时使用引号。 "
                "要查询两个特定日期之间的日期范围，计算天数并使用 'YYYY-MM-DD N days'。"  # noqa: E501
            ),
        },
        "outputFormats": {
            "description": "所有命令都支持通过标志指定多种输出格式（一次只能使用一种）。",  # noqa: E501
            "formats": [
                {"flag": "--tree", "default": True, "description": "人类可读的树状结构"},
                {
                    "flag": "--json",
                    "default": False,
                    "description": "原始 JSON（推荐 LLM 使用）",
                },
                {"flag": "--markdown", "default": False, "description": "Markdown 格式"},
                {
                    "flag": "--html",
                    "default": False,
                    "description": "带有 Chart.js 的交互式 HTML",
                },
                {"flag": "--dataframe", "default": False, "description": "Pandas 数据框"},
            ],
            "recommendation": "对于程序化分析和 LLM 处理，始终使用 --json 格式。",
        },
        "bestPractices": [
            "在自动化工作流中，始终使用 --json 格式以确保可靠解析。",
            "使用日期范围（例如，'YYYY-MM-DD 2 days'）而不是单个日期，以避免时区问题。",  # noqa: E501
            "在准备度数据中，contributors.resting_heart_rate 是一个分数（0-100），不是实际的 BPM。",  # noqa: E501
            "将 HTML/Markdown 输出重定向到文件以便查看：ouracli activity today --html > output.html",  # noqa: E501
            "在运行命令前检查 PERSONAL_ACCESS_TOKEN 是否已设置。",
        ],
        "troubleshooting": [
            {
                "error": "Got unexpected extra argument",
                "cause": "两个单独的日期参数而不是一个带引号的范围。",
                "solution": "使用 'YYYY-MM-DD N days' 格式而不是两个日期。",
            },
            {
                "error": "Invalid date specification",
                "cause": "不支持的语法，如 'to'、'..' 或相对表达式。",
                "solution": "使用支持的格式：'N days'、'YYYY-MM-DD N days'。",
            },
            {
                "error": "No such option: --start-date",
                "cause": "不支持基于标志的日期指定。",
                "solution": "使用位置日期范围参数。",
            },
            {
                "error": "No data returned",
                "cause": "设备未同步、日期超出范围或时区问题。",
                "solution": "尝试使用更广泛的日期范围或添加缓冲天数。",
            },
        ],
        "relatedTools": [
            {
                "name": "Oura Web UI",
                "url": "https://cloud.ouraring.com",
                "description": "官方网页界面",
            },
            {
                "name": "Oura API",
                "url": "https://cloud.ouraring.com/v2/docs",
                "description": "REST API 文档",
            },
        ],
    }


def _render_markdown(spec: dict[str, Any]) -> str:
    """将 dashdash-spec 渲染为带有 YAML 前置内容的 Markdown。"""
    # YAML 前置内容
    front_matter = f"""---
name: {spec['name']}
version: {spec['version']}
specVersion: {spec['specVersion']}
usageContext: {spec['usageContext']}
webUI: {spec.get('webUI', '')}
apiDocs: {spec.get('apiDocs', '')}
---
"""
    body = [
        "# OuraCLI LLM 使用指南",
        "",
        "## 概述",
        spec["description"],
        "",
        "## 使用场景",
        spec["usageContext"],
        "",
        "## 替代访问方法",
        f"- Web UI: {spec.get('webUI', '')}",
        f"- API Docs: {spec.get('apiDocs', '')}",
        "",
        "## 安装",
        f"方法: {spec['installation']['method']}",
        f"命令: `{spec['installation']['command']}`",
        f"备注: {spec['installation'].get('notes', '')}",
        "",
        "## 认证",
        f"必需: {spec['authentication']['required']}",
        f"类型: {spec['authentication']['type']}",
        f"环境变量: `{spec['authentication']['envVar']}`",
        spec["authentication"]["instructions"],
        "",
        "## 日期范围指定",
        "### 支持的格式",
        "- " + "\n-".join(spec["dateRanges"]["supportedFormats"]),
        "",
        "### 不支持的格式（常见 LLM 错误）",
        "- " + "\n-".join(spec["dateRanges"]["unsupportedFormats"]),
        "",
        f"备注: {spec['dateRanges']['notes']}",
        "",
        "## 输出格式",
        "- "
        + "\n-".join(
            [
                f"{fmt['flag']}{' (默认)' if fmt.get('default') else ''} - {fmt['description']}"
                for fmt in spec["outputFormats"]["formats"]
            ]
        ),
        "",
        f"建议: {spec['outputFormats']['recommendation']}",
        "",
        "## 命令",
    ]

    for cmd in spec["commands"]:
        body.extend(
            [
                f"### {cmd['name']}",
                cmd["description"],
            ]
        )
        if cmd.get("notes"):
            body.append(f"备注: {cmd['notes']}")
        if examples := cmd.get("examples"):
            body.append("示例")
            body.append("```bash")
            for ex in examples:
                body.append(ex["command"])
            body.append("```")
        body.append("")

    body.extend(
        [
            "## 最佳实践",
            "- " + "\n-".join(spec["bestPractices"]),
            "",
            "## 故障排除",
            "- " + "\n-".join([f"{t['error']}: {t['solution']}" for t in spec["troubleshooting"]]),
            "",
            "## 相关工具",
            "- " + "\n-".join([f"{t['name']}: {t['url']}" for t in spec["relatedTools"]]),
        ]
    )

    return front_matter + "\n".join(body)


def _render_json(spec: dict[str, Any]) -> str:
    """渲染紧凑的 JSON 表示以供程序化使用。"""
    return json.dumps(spec, indent=2)


def show_llm_help(format_type: Literal["markdown", "json"] = "markdown") -> str:
    """以请求的格式返回符合 dashdash-spec v0.2.0 的使用指南。"""
    spec = _get_spec_dict()
    if format_type.lower() == "json":
        return _render_json(spec)
    return _render_markdown(spec)
