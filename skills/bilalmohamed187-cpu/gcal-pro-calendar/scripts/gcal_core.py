#!/usr/bin/env python3
"""
gcal-pro: 核心日历操作模块
处理所有 Google Calendar API 操作，具有完整的时区支持。

主要功能：
1. 日历事件的增删改查操作
2. 自然语言日期时间解析
3. 时区感知处理
4. 查找空闲时间段
5. 生成每日简报（专业版功能）

架构设计：
- 免费层：只读操作（列出事件、搜索、查看日历等）
- 专业层：读写操作（创建、更新、删除事件等）
"""

import sys
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from zoneinfo import ZoneInfo

from dateutil import parser as date_parser
from dateutil.relativedelta import relativedelta

from gcal_auth import get_calendar_service, is_pro_user

# 默认时区配置（可以通过配置文件覆盖）
DEFAULT_TIMEZONE = "America/New_York"


def get_timezone() -> ZoneInfo:
    """
    获取配置的时区。

    此函数目前返回固定的默认时区，
    未来可以扩展为从配置文件读取用户偏好的时区设置。

    Returns:
        ZoneInfo: 时区信息对象
    """
    return ZoneInfo(DEFAULT_TIMEZONE)


def now_local() -> datetime:
    """
    获取当前时间的本地时区版本。

    Returns:
        datetime: 带有时区信息的当前时间
    """
    return datetime.now(get_timezone())


def format_datetime(dt: datetime) -> str:
    """
    格式化日期时间用于显示。

    输出格式示例："周一, 一月 27 下午 01:30"

    Args:
        dt: 要格式化的日期时间对象

    Returns:
        str: 格式化的日期时间字符串
    """
    return dt.strftime("%a, %b %d at %I:%M %p")


def format_datetime_iso(dt: datetime) -> str:
    """
    格式化日期时间为 ISO 8601 格式供 API 使用。

    输出格式示例："2026-01-27T13:30:00-05:00"

    Args:
        dt: 要格式化的日期时间对象

    Returns:
        str: ISO 8601 格式的日期时间字符串
    """
    return dt.isoformat()


def parse_datetime(text: str, reference: datetime = None) -> datetime:
    """
    解析自然语言日期时间字符串。

    支持多种自然语言输入格式：
    - 相对时间：today, tomorrow, next week
    - 具体时间：tomorrow 2pm, next Friday, 2026年1月27日
    - 模糊输入：由 dateutil 库处理

    Args:
        text: 自然语言日期时间字符串（例如："明天下午2点"、"下周五"）
        reference: 参考日期时间，用于相对解析（默认为当前时间）

    Returns:
        datetime: 解析后的带时区日期时间

    Raises:
        ValueError: 无法解析输入的日期时间
    """
    if reference is None:
        reference = now_local()

    tz = get_timezone()

    # 处理常见的相对时间术语
    text_lower = text.lower().strip()

    if text_lower == "today":
        return reference.replace(hour=9, minute=0, second=0, microsecond=0)
    elif text_lower == "tomorrow":
        return (reference + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    elif text_lower == "next week":
        return (reference + timedelta(weeks=1)).replace(hour=9, minute=0, second=0, microsecond=0)

    # 使用 dateutil 解析器处理其他情况
    try:
        parsed = date_parser.parse(text, fuzzy=True, default=reference)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=tz)
        return parsed
    except Exception:
        raise ValueError(f"无法解析日期时间：{text}")


# =============================================================================
# 读取操作（免费层）
# =============================================================================

def list_events(
    time_min: datetime = None,
    time_max: datetime = None,
    max_results: int = 10,
    calendar_id: str = "primary"
) -> List[Dict[str, Any]]:
    """
    列出指定时间范围内的日历事件。

    此函数是日历查询的核心方法，其他查询函数（如 get_today、get_week）
    都是基于此函数实现的封装。

    Args:
        time_min: 时间范围开始（默认为当前时间）
        time_max: 时间范围结束（默认为当天结束）
        max_results: 返回的最大事件数量
        calendar_id: 日历 ID（默认为 "primary" 即主日历）

    Returns:
        List[Dict[str, Any]]: 事件字典列表，每个事件包含：
            - id: 事件唯一标识符
            - summary: 事件标题
            - description: 事件描述
            - location: 事件位置
            - start: 开始时间（ISO 格式）
            - end: 结束时间（ISO 格式）
            - start_dt: 开始时间（datetime 对象）
            - end_dt: 结束时间（datetime 对象）
            - all_day: 是否为全天事件
            - attendees: 参与者邮箱列表
            - html_link: Google 日历链接
            - status: 事件状态
            - organizer: 组织者邮箱
    """
    service = get_calendar_service()
    if not service:
        return []

    # 设置默认时间范围
    if time_min is None:
        time_min = now_local()
    if time_max is None:
        time_max = time_min.replace(hour=23, minute=59, second=59)

    try:
        # 调用 Google Calendar API
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=format_datetime_iso(time_min),
            timeMax=format_datetime_iso(time_max),
            maxResults=max_results,
            singleEvents=True,  # 展开重复事件
            orderBy="startTime"  # 按开始时间排序
        ).execute()

        events = events_result.get("items", [])
        return [_parse_event(e) for e in events]
    except Exception as e:
        print(f"列出事件时出错：{e}")
        return []


def get_today() -> List[Dict[str, Any]]:
    """
    获取今天的所有事件。

    Returns:
        List[Dict[str, Any]]: 今天的事件列表
    """
    now = now_local()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = now.replace(hour=23, minute=59, second=59, microsecond=0)
    return list_events(time_min=start, time_max=end, max_results=20)


def get_tomorrow() -> List[Dict[str, Any]]:
    """
    获取明天的所有事件。

    Returns:
        List[Dict[str, Any]]: 明天的事件列表
    """
    now = now_local()
    tomorrow = now + timedelta(days=1)
    start = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
    end = tomorrow.replace(hour=23, minute=59, second=59, microsecond=0)
    return list_events(time_min=start, time_max=end, max_results=20)


def get_week() -> List[Dict[str, Any]]:
    """
    获取未来 7 天的事件。

    Returns:
        List[Dict[str, Any]]: 本周的事件列表
    """
    now = now_local()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=7)
    return list_events(time_min=start, time_max=end, max_results=50)


def get_event(event_id: str, calendar_id: str = "primary") -> Optional[Dict[str, Any]]:
    """
    根据事件 ID 获取单个事件的详细信息。

    Args:
        event_id: 要获取的事件 ID
        calendar_id: 日历 ID（默认为主日历）

    Returns:
        Optional[Dict[str, Any]]: 事件字典，如果未找到返回 None
    """
    service = get_calendar_service()
    if not service:
        return None

    try:
        event = service.events().get(
            calendarId=calendar_id,
            eventId=event_id
        ).execute()
        return _parse_event(event)
    except Exception as e:
        print(f"获取事件时出错：{e}")
        return None


def search_events(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """
    根据关键词搜索事件。

    搜索范围包括事件标题、描述和位置。

    Args:
        query: 搜索关键词
        max_results: 返回的最大事件数量

    Returns:
        List[Dict[str, Any]]: 匹配的事件列表
    """
    service = get_calendar_service()
    if not service:
        return []

    now = now_local()

    try:
        events_result = service.events().list(
            calendarId="primary",
            timeMin=format_datetime_iso(now - timedelta(days=30)),  # 搜索过去 30 天
            timeMax=format_datetime_iso(now + timedelta(days=90)),  # 到未来 90 天
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
            q=query  # 搜索关键词
        ).execute()

        events = events_result.get("items", [])
        return [_parse_event(e) for e in events]
    except Exception as e:
        print(f"搜索事件时出错：{e}")
        return []


def find_free_time(
    duration_minutes: int = 60,
    time_min: datetime = None,
    time_max: datetime = None,
    calendar_id: str = "primary"
) -> List[Tuple[datetime, datetime]]:
    """
    查找指定时间范围内的空闲时间段。

    此函数通过分析现有事件的安排来找出连续的空闲时段。
    适用于安排会议或活动的场景。

    Args:
        duration_minutes: 所需的最小空闲时段长度（分钟）
        time_min: 搜索范围开始
        time_max: 搜索范围结束
        calendar_id: 日历 ID

    Returns:
        List[Tuple[datetime, datetime]]: 空闲时段列表，每个元素为 (开始, 结束) 元组
    """
    if time_min is None:
        time_min = now_local()
    if time_max is None:
        time_max = time_min + timedelta(days=7)

    # 获取范围内的所有事件
    events = list_events(time_min=time_min, time_max=time_max, max_results=100)

    # 查找空闲间隙
    free_slots = []
    current = time_min

    for event in events:
        event_start = event.get("start_dt")
        event_end = event.get("end_dt")

        # 检查事件开始前是否有空闲
        if event_start and current < event_start:
            gap = (event_start - current).total_seconds() / 60
            if gap >= duration_minutes:
                free_slots.append((current, event_start))

        # 更新当前时间到事件结束
        if event_end and event_end > current:
            current = event_end

    # 检查最后一个事件后的剩余时间
    if current < time_max:
        gap = (time_max - current).total_seconds() / 60
        if gap >= duration_minutes:
            free_slots.append((current, time_max))

    return free_slots


def list_calendars() -> List[Dict[str, Any]]:
    """
    列出用户可访问的所有日历。

    Returns:
        List[Dict[str, Any]]: 日历列表，每个日历包含：
            - id: 日历 ID
            - summary: 日历名称
            - primary: 是否为主日历
            - access_role: 访问角色
    """
    service = get_calendar_service()
    if not service:
        return []

    try:
        calendars_result = service.calendarList().list().execute()
        calendars = calendars_result.get("items", [])
        return [
            {
                "id": cal.get("id"),
                "summary": cal.get("summary"),
                "primary": cal.get("primary", False),
                "access_role": cal.get("accessRole")
            }
            for cal in calendars
        ]
    except Exception as e:
        print(f"列出日历时出错：{e}")
        return []


# =============================================================================
# 写入操作（专业层专用）
# =============================================================================

def _require_pro(operation: str) -> bool:
    """
    检查操作是否需要专业版许可证。

    如果用户不是专业版，此函数会打印提示信息。

    Args:
        operation: 操作名称（用于错误提示）

    Returns:
        bool: 如果是专业版用户返回 True，否则返回 False
    """
    if not is_pro_user():
        print(f"⚠️ {operation} 需要 gcal-pro 专业版许可证（一次性 $12）。")
        print("  升级地址：[您的 Gumroad 链接]")
        return False
    return True


def create_event(
    summary: str,
    start: datetime,
    end: datetime = None,
    description: str = None,
    location: str = None,
    attendees: List[str] = None,
    calendar_id: str = "primary",
    confirmed: bool = False
) -> Optional[Dict[str, Any]]:
    """
    创建新的日历事件。

    【专业版功能】此功能仅对专业版用户开放。

    Args:
        summary: 事件标题
        start: 开始时间
        end: 结束时间（默认为开始时间后 1 小时）
        description: 事件描述
        location: 事件位置
        attendees: 参与者邮箱列表
        calendar_id: 目标日历 ID
        confirmed: 是否跳过确认提示

    Returns:
        Optional[Dict[str, Any]]: 创建的事件，如果失败返回 None
    """
    if not _require_pro("创建事件"):
        return None

    service = get_calendar_service()
    if not service:
        return None

    # 默认结束时间为开始时间后 1 小时
    if end is None:
        end = start + timedelta(hours=1)

    # 构建事件体
    event_body = {
        "summary": summary,
        "start": {
            "dateTime": format_datetime_iso(start),
            "timeZone": str(get_timezone())
        },
        "end": {
            "dateTime": format_datetime_iso(end),
            "timeZone": str(get_timezone())
        }
    }

    # 添加可选字段
    if description:
        event_body["description"] = description
    if location:
        event_body["location"] = location
    if attendees:
        event_body["attendees"] = [{"email": email} for email in attendees]

    # 显示确认信息（除非已确认）
    if not confirmed:
        print(f"\n📅 创建事件：")
        print(f"   标题：{summary}")
        print(f"   时间：{format_datetime(start)} - {format_datetime(end)}")
        if location:
            print(f"   地点：{location}")
        if attendees:
            print(f"   参与者：{', '.join(attendees)}")

    try:
        event = service.events().insert(
            calendarId=calendar_id,
            body=event_body,
            sendUpdates="all" if attendees else "none"
        ).execute()

        print(f"✓ 事件已创建：{event.get('htmlLink')}")
        return _parse_event(event)
    except Exception as e:
        print(f"创建事件时出错：{e}")
        return None


def quick_add(text: str, calendar_id: str = "primary") -> Optional[Dict[str, Any]]:
    """
    使用自然语言快速添加事件。

    【专业版功能】此功能仅对专业版用户开放。

    利用 Google Calendar 的 quickAdd API，
    可以解析自然语言描述并自动创建事件。

    Args:
        text: 自然语言事件描述（例如："明天下午2点与 Alex 在 Cafe Roma 午餐"）
        calendar_id: 目标日历 ID

    Returns:
        Optional[Dict[str, Any]]: 创建的事件，如果失败返回 None
    """
    if not _require_pro("快速添加"):
        return None

    service = get_calendar_service()
    if not service:
        return None

    try:
        event = service.events().quickAdd(
            calendarId=calendar_id,
            text=text
        ).execute()

        parsed = _parse_event(event)
        print(f"✓ 事件已创建：{parsed.get('summary')}")
        print(f"   时间：{format_datetime(parsed.get('start_dt'))}")
        return parsed
    except Exception as e:
        print(f"快速添加时出错：{e}")
        return None


def update_event(
    event_id: str,
    summary: str = None,
    start: datetime = None,
    end: datetime = None,
    description: str = None,
    location: str = None,
    calendar_id: str = "primary",
    confirmed: bool = False
) -> Optional[Dict[str, Any]]:
    """
    更新现有事件的详细信息。

    【专业版功能】此功能仅对专业版用户开放。

    Args:
        event_id: 要更新的事件 ID
        summary: 新标题（可选）
        start: 新开始时间（可选）
        end: 新结束时间（可选）
        description: 新描述（可选）
        location: 新位置（可选）
        calendar_id: 日历 ID
        confirmed: 是否跳过确认提示

    Returns:
        Optional[Dict[str, Any]]: 更新后的事件，如果失败返回 None
    """
    if not _require_pro("更新事件"):
        return None

    service = get_calendar_service()
    if not service:
        return None

    # 获取现有事件
    try:
        event = service.events().get(
            calendarId=calendar_id,
            eventId=event_id
        ).execute()
    except Exception as e:
        print(f"事件未找到：{e}")
        return None

    # 应用更新
    if summary:
        event["summary"] = summary
    if start:
        event["start"] = {
            "dateTime": format_datetime_iso(start),
            "timeZone": str(get_timezone())
        }
    if end:
        event["end"] = {
            "dateTime": format_datetime_iso(end),
            "timeZone": str(get_timezone())
        }
    if description is not None:
        event["description"] = description
    if location is not None:
        event["location"] = location

    # 显示确认信息
    if not confirmed:
        print(f"\n✏️ 更新事件：{event.get('summary')}")
        if summary:
            print(f"   新标题：{summary}")
        if start:
            print(f"   新开始：{format_datetime(start)}")
        if end:
            print(f"   新结束：{format_datetime(end)}")

    try:
        updated = service.events().update(
            calendarId=calendar_id,
            eventId=event_id,
            body=event
        ).execute()

        print(f"✓ 事件已更新")
        return _parse_event(updated)
    except Exception as e:
        print(f"更新事件时出错：{e}")
        return None


def delete_event(
    event_id: str,
    calendar_id: str = "primary",
    confirmed: bool = False
) -> bool:
    """
    删除指定的日历事件。

    【专业版功能】此功能仅对专业版用户开放。

    Args:
        event_id: 要删除的事件 ID
        calendar_id: 日历 ID
        confirmed: 是否跳过确认提示

    Returns:
        bool: 如果成功删除返回 True
    """
    if not _require_pro("删除事件"):
        return False

    service = get_calendar_service()
    if not service:
        return False

    # 获取事件详情用于确认
    try:
        event = service.events().get(
            calendarId=calendar_id,
            eventId=event_id
        ).execute()
    except Exception as e:
        print(f"事件未找到：{e}")
        return False

    parsed = _parse_event(event)

    if not confirmed:
        print(f"\n🗑️ 删除事件：")
        print(f"   标题：{parsed.get('summary')}")
        print(f"   时间：{format_datetime(parsed.get('start_dt'))}")
        print(f"\n   ⚠️ 此操作无法撤销！")

    try:
        service.events().delete(
            calendarId=calendar_id,
            eventId=event_id
        ).execute()

        print(f"✓ 事件已删除")
        return True
    except Exception as e:
        print(f"删除事件时出错：{e}")
        return False


# =============================================================================
# 辅助函数
# =============================================================================

def _parse_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    解析原始 API 事件数据为标准化格式。

    此函数将 Google Calendar API 返回的原始事件对象
    转换为更易于使用的字典格式，并确保时区信息正确。

    Args:
        event: Google Calendar API 返回的原始事件字典

    Returns:
        Dict[str, Any]: 解析后的事件字典，包含所有关键字段
    """
    tz = get_timezone()

    # 解析开始时间
    start = event.get("start", {})
    start_dt = None
    if "dateTime" in start:
        start_dt = date_parser.parse(start["dateTime"])
        if start_dt.tzinfo is None:
            start_dt = start_dt.replace(tzinfo=tz)
    elif "date" in start:
        # 全天事件
        start_dt = date_parser.parse(start["date"]).replace(tzinfo=tz)

    # 解析结束时间
    end = event.get("end", {})
    end_dt = None
    if "dateTime" in end:
        end_dt = date_parser.parse(end["dateTime"])
        if end_dt.tzinfo is None:
            end_dt = end_dt.replace(tzinfo=tz)
    elif "date" in end:
        end_dt = date_parser.parse(end["date"]).replace(tzinfo=tz)

    return {
        "id": event.get("id"),
        "summary": event.get("summary", "(无标题)"),
        "description": event.get("description"),
        "location": event.get("location"),
        "start": start.get("dateTime") or start.get("date"),
        "end": end.get("dateTime") or end.get("date"),
        "start_dt": start_dt,
        "end_dt": end_dt,
        "all_day": "date" in start,
        "attendees": [a.get("email") for a in event.get("attendees", [])],
        "html_link": event.get("htmlLink"),
        "status": event.get("status"),
        "organizer": event.get("organizer", {}).get("email")
    }


def format_events_for_display(events: List[Dict[str, Any]]) -> str:
    """
    格式化事件列表用于聊天显示。

    生成适合在聊天界面显示的格式，
    自动按日期分组并显示时间线。

    Args:
        events: 事件列表

    Returns:
        str: 格式化的事件列表字符串
    """
    if not events:
        return "📭 未找到事件。"

    lines = []
    current_date = None

    for event in events:
        start_dt = event.get("start_dt")
        if not start_dt:
            continue

        # 新日期时添加日期标题
        event_date = start_dt.date()
        if event_date != current_date:
            current_date = event_date
            lines.append(f"\n📅 **{start_dt.strftime('%A, %B %d')}**")

        # 格式化事件
        if event.get("all_day"):
            time_str = "全天"
        else:
            time_str = start_dt.strftime("%I:%M %p").lstrip("0")

        summary = event.get("summary", "(无标题)")
        location = event.get("location")

        line = f"  • {time_str} — {summary}"
        if location:
            line += f" 📍 {location}"

        lines.append(line)

    return "\n".join(lines)


# =============================================================================
# 每日简报（专业版功能）
# =============================================================================

def generate_morning_brief() -> str:
    """
    生成每日晨间简报。

    【专业版功能】此功能仅对专业版用户开放。

    为 Clawdbot 定时任务设计，
    生成包含今日事件概览和明日预览的格式化文本。

    Returns:
        str: 格式化的晨间简报文本
    """
    now = now_local()
    today_events = get_today()

    # 构建简报
    lines = [f"☀️ **早上好！以下是您今天的日程：**"]
    lines.append(f"📆 {now.strftime('%A, %B %d, %Y')}")
    lines.append("")

    if not today_events:
        lines.append("🎉 您今天的日历是空的！")
    else:
        lines.append(f"今天有 **{len(today_events)} 个事件**：")
        lines.append(format_events_for_display(today_events))

    # 添加明日预览
    tomorrow_events = get_tomorrow()
    if tomorrow_events:
        lines.append(f"\n👀 **明天：** {len(tomorrow_events)} 个事件")

    return "\n".join(lines)


# =============================================================================
# 命令行界面
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="gcal-pro 日历操作")
    parser.add_argument("command", choices=[
        "today", "tomorrow", "week", "search", "brief",
        "create", "quick", "delete", "calendars", "free"
    ], help="""可用命令：
    today   - 查看今天的事件
    tomorrow - 查看明天的事件
    week    - 查看本周的事件
    search  - 搜索事件
    brief   - 生成晨间简报
    create  - 创建事件
    quick   - 快速添加事件
    delete  - 删除事件
    calendars - 列出所有日历
    free    - 查找空闲时段""")
    parser.add_argument("--query", "-q", help="搜索查询或事件文本")
    parser.add_argument("--id", help="删除/更新操作的事件 ID")
    parser.add_argument("--yes", "-y", action="store_true", help="跳过确认提示")

    args = parser.parse_args()

    if args.command == "today":
        events = get_today()
        print(format_events_for_display(events))

    elif args.command == "tomorrow":
        events = get_tomorrow()
        print(format_events_for_display(events))

    elif args.command == "week":
        events = get_week()
        print(format_events_for_display(events))

    elif args.command == "search":
        if not args.query:
            print("错误：搜索需要使用 --query 参数")
            sys.exit(1)
        events = search_events(args.query)
        print(format_events_for_display(events))

    elif args.command == "brief":
        print(generate_morning_brief())

    elif args.command == "quick":
        if not args.query:
            print("错误：快速添加需要使用 --query 参数")
            sys.exit(1)
        quick_add(args.query)

    elif args.command == "delete":
        if not args.id:
            print("错误：删除操作需要使用 --id 参数")
            sys.exit(1)
        delete_event(args.id, confirmed=args.yes)

    elif args.command == "calendars":
        cals = list_calendars()
        for cal in cals:
            primary = "（主日历）" if cal.get("primary") else ""
            print(f"  • {cal.get('summary')}{primary}")
            print(f"    ID: {cal.get('id')}")

    elif args.command == "free":
        slots = find_free_time(duration_minutes=60)
        if not slots:
            print("未来 7 天未找到空闲时段。")
        else:
            print("本周可用 1 小时时段：")
            for start, end in slots[:10]:
                print(f"  • {format_datetime(start)} - {format_datetime(end)}")
