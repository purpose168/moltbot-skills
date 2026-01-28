"""OuraCLI 的命令行应用程序。"""

from enum import Enum
from typing import Any, Literal

import typer

from ouracli.client import OuraClient
from ouracli.date_parser import parse_date_range
from ouracli.formatters import format_output
from ouracli.llm_help import show_llm_help

app = typer.Typer(
    help=(
        "用于访问 Oura Ring 数据的命令行工具。\n"
        "💡 LLM/智能体：运行 'ouracli --ai-help' 获取详细的使用指南。"
    ),
    context_settings={"help_option_names": ["-h", "--help"]},
)


@app.callback(invoke_without_command=True)
def main_callback(
    ctx: typer.Context,
    ai_help: bool = typer.Option(
        False,
        "--ai-help",
        is_eager=True,
        help="显示 LLM/智能体的综合使用指南并退出。",
    ),
    ai_help_format: Literal["markdown", "json"] = typer.Option(
        "markdown",
        "--ai-help-format",
        help="--ai-help 输出的格式（markdown 或 json）",
        show_choices=True,
        case_sensitive=False,
    ),
) -> None:
    """用于访问 Oura Ring 数据的命令行工具。"""
    # 如果请求了 --ai-help，输出 dashdash-spec 帮助并提前退出
    if ai_help:
        typer.echo(show_llm_help(format_type=ai_help_format))
        raise typer.Exit()

    # 如果没有调用命令，显示帮助
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit()


class OutputFormat(str, Enum):
    """输出格式选项。"""

    TREE = "tree"
    JSON = "json"
    DATAFRAME = "dataframe"
    MARKDOWN = "markdown"
    HTML = "html"


def get_output_format(
    json_flag: bool,
    tree_flag: bool,
    markdown_flag: bool,
    dataframe_flag: bool,
    html_flag: bool,
) -> str:
    """根据标志确定输出格式。默认使用 tree。"""
    format_flags = [
        (json_flag, "json"),
        (tree_flag, "tree"),
        (markdown_flag, "markdown"),
        (dataframe_flag, "dataframe"),
        (html_flag, "html"),
    ]
    active_flags = [fmt for flag, fmt in format_flags if flag]

    if len(active_flags) > 1:
        raise typer.BadParameter(
            "一次只能指定一个格式标志："
            "--json、--tree、--markdown、--dataframe 或 --html"
        )

    return active_flags[0] if active_flags else "tree"


def create_format_options() -> tuple[
    typer.models.OptionInfo,
    typer.models.OptionInfo,
    typer.models.OptionInfo,
    typer.models.OptionInfo,
    typer.models.OptionInfo,
]:
    """为命令创建标准格式选项标志。"""
    return (
        typer.Option(False, "--json", help="以 JSON 格式输出"),
        typer.Option(False, "--tree", help="以树状格式输出（默认）"),
        typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
        typer.Option(False, "--dataframe", help="以数据框格式输出"),
        typer.Option(False, "--html", help="以 HTML 格式输出"),
    )


def execute_data_command(
    date_range: str,
    fetch_func: Any,
    output_format: str,
    wrap_key: str | None = None,
) -> None:
    """执行标准的数据获取命令。

    参数:
        date_range: 要解析的日期范围字符串
        fetch_func: 用于获取数据的客户端方法（接收 start_date, end_date）
        output_format: 输出格式
        wrap_key: 用于 markdown/html 包装列表结果的可选键
    """
    client = OuraClient()
    start_date, end_date = parse_date_range(date_range)
    data = fetch_func(client, start_date, end_date)
    result = data.get("data", [])

    # 用类别键包装在字典中，以便在 markdown/html 中正确显示标题
    if wrap_key and output_format in ("markdown", "html") and isinstance(result, list):
        result = {wrap_key: result}

    output = format_output(result, output_format)
    typer.echo(output)


@app.command()
def activity(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取每日活动数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(
        date_range,
        lambda c, s, e: c.get_daily_activity(s, e),
        output_format,
        "activity",
    )


@app.command()
def sleep(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取每日睡眠数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(date_range, lambda c, s, e: c.get_daily_sleep(s, e), output_format)


@app.command()
def readiness(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取每日准备度数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(date_range, lambda c, s, e: c.get_daily_readiness(s, e), output_format)


@app.command()
def spo2(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取每日血氧数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(date_range, lambda c, s, e: c.get_daily_spo2(s, e), output_format)


@app.command()
def stress(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取每日压力数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(date_range, lambda c, s, e: c.get_daily_stress(s, e), output_format)


@app.command()
def heartrate(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取心率时间序列数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    # 心率端点使用日期时间格式，而不仅仅是日期
    execute_data_command(
        date_range,
        lambda c, s, e: c.get_heartrate(f"{s}T00:00:00", f"{e}T23:59:59"),
        output_format,
    )


@app.command()
def workout(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取锻炼数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(date_range, lambda c, s, e: c.get_workouts(s, e), output_format)


@app.command()
def session(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取会话数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(date_range, lambda c, s, e: c.get_sessions(s, e), output_format)


@app.command()
def tag(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取标签数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(date_range, lambda c, s, e: c.get_tags(s, e), output_format)


@app.command()
def rest_mode(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取休息模式期间的数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    execute_data_command(date_range, lambda c, s, e: c.get_rest_mode_periods(s, e), output_format)


@app.command()
def personal_info(
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
) -> None:
    """获取个人信息。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    client = OuraClient()
    data = client.get_personal_info()
    output = format_output(data, output_format)
    typer.echo(output)


@app.command(name="all")
def get_all(
    date_range: str = typer.Argument("today", help="日期范围（例如，'today'、'7 days'）"),
    json_flag: bool = typer.Option(False, "--json", help="以 JSON 格式输出"),
    tree_flag: bool = typer.Option(False, "--tree", help="以树状格式输出（默认）"),
    markdown_flag: bool = typer.Option(False, "--markdown", help="以 Markdown 格式输出"),
    dataframe_flag: bool = typer.Option(False, "--dataframe", help="以数据框格式输出"),
    html_flag: bool = typer.Option(False, "--html", help="以 HTML 格式输出"),
    by_day_flag: bool = typer.Option(
        True,
        "--by-day/--by-method",
        help="按天（默认）或按方法分组数据",
    ),
) -> None:
    """获取所有可用数据。"""
    output_format = get_output_format(
        json_flag, tree_flag, markdown_flag, dataframe_flag, html_flag
    )
    client = OuraClient()
    start_date, end_date = parse_date_range(date_range)
    data = client.get_all_data(start_date, end_date)
    output = format_output(data, output_format, by_day=by_day_flag)
    typer.echo(output)


def main() -> None:
    """CLI 的主入口点。"""
    app()


if __name__ == "__main__":
    main()
