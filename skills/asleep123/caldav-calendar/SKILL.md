---
name: caldav-calendar
description: 使用 vdirsyncer + khal 同步和查询 CalDAV 日历（iCloud、Google、Fastmail、Nextcloud 等）。适用于 Linux 系统。
metadata: {"clawdbot":{"emoji":"📅","os":["linux"],"requires":{"bins":["vdirsyncer","khal"]},"install":[{"id":"apt","kind":"apt","packages":["vdirsyncer","khal"],"bins":["vdirsyncer","khal"],"label":"通过 apt 安装 vdirsyncer + khal"}]}}
---

# CalDAV 日历（vdirsyncer + khal）

**vdirsyncer** 将 CalDAV 日历同步到本地的 `.ics` 文件。**khal** 用于读取和写入日历。

## 首先同步

在查询之前或进行更改之后，始终先执行同步：
```bash
vdirsyncer sync
```

## 查看事件

```bash
khal list                        # 今天
khal list today 7d               # 接下来 7 天
khal list tomorrow               # 明天
khal list 2026-01-15 2026-01-20  # 日期范围
khal list -a Work today          # 特定日历
```

## 搜索

```bash
khal search "会议"
khal search "牙医" --format "{start-date} {title}"
```

## 创建事件

```bash
khal new 2026-01-15 10:00 11:00 "会议标题"
khal new 2026-01-15 "全天事件"
khal new tomorrow 14:00 15:30 "电话" -a Work
khal new 2026-01-15 10:00 11:00 "带备注" :: 这里填写描述
```

创建后，同步以推送更改：
```bash
vdirsyncer sync
```

## 编辑事件（交互式）

`khal edit` 是交互式的，需要 TTY。如果需要自动化，请使用 tmux：

```bash
khal edit "搜索词"
khal edit -a 日历名称 "搜索词"
khal edit --show-past "旧事件"
```

菜单选项：
- `s` → 编辑摘要
- `d` → 编辑描述
- `t` → 编辑日期时间范围
- `l` → 编辑位置
- `D` → 删除事件
- `n` → 跳过（保存更改，处理下一个匹配项）
- `q` → 退出

编辑后，同步：
```bash
vdirsyncer sync
```

## 删除事件

使用 `khal edit`，然后按 `D` 删除。

## 输出格式

用于脚本编程：
```bash
khal list --format "{start-date} {start-time}-{end-time} {title}" today 7d
khal list --format "{uid} | {title} | {calendar}" today
```

占位符：`{title}`、`{description}`、`{start}`、`{end}`、`{start-date}`、`{start-time}`、`{end-date}`、`{end-time}`、`{location}`、`{calendar}`、`{uid}`

## 缓存

khal 将事件缓存在 `~/.local/share/khal/khal.db`。如果同步后数据看起来过时：
```bash
rm ~/.local/share/khal/khal.db
```

## 初始设置

### 1. 配置 vdirsyncer（`~/.config/vdirsyncer/config`）

iCloud 配置示例：
```ini
[general]
status_path = "~/.local/share/vdirsyncer/status/"

[pair icloud_calendar]
a = "icloud_remote"
b = "icloud_local"
collections = ["from a", "from b"]
conflict_resolution = "a wins"

[storage icloud_remote]
type = "caldav"
url = "https://caldav.icloud.com/"
username = "your@icloud.com"
password.fetch = ["command", "cat", "~/.config/vdirsyncer/icloud_password"]

[storage icloud_local]
type = "filesystem"
path = "~/.local/share/vdirsyncer/calendars/"
fileext = ".ics"
```

服务商 URLs：
- iCloud: `https://caldav.icloud.com/`
- Google: 使用 `google_calendar` 存储类型
- Fastmail: `https://caldav.fastmail.com/dav/calendars/user/邮箱/`
- Nextcloud: `https://您的域名/remote.php/dav/calendars/用户名/`

### 2. 配置 khal（`~/.config/khal/config`）

```ini
[calendars]
[[my_calendars]]
path = ~/.local/share/vdirsyncer/calendars/*
type = discover

[default]
default_calendar = Home
highlight_event_days = True

[locale]
timeformat = %H:%M
dateformat = %Y-%m-%d
```

### 3. 发现并同步

```bash
vdirsyncer discover   # 仅首次使用
vdirsyncer sync
```
