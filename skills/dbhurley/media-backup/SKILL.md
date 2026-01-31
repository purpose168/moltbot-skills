---
name: media-backup
description: 将 Clawdbot 对话媒体（照片、视频）存档到本地文件夹。适用于任何同步服务（Dropbox、iCloud、Google Drive、OneDrive）。
metadata: {"clawdbot":{"env":["MEDIA_BACKUP_DEST"]}}
---

# 媒体备份

将 Clawdbot 入站媒体简单备份到本地文件夹。无需 API，无需 OAuth - 只需文件复制。

适用于任何云同步服务，因为它只是复制到本地文件夹。

## 设置

设置您的目标文件夹：
```bash
export MEDIA_BACKUP_DEST="$HOME/Dropbox/Clawdbot/media"
# 或
export MEDIA_BACKUP_DEST="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Clawdbot/media"  # iCloud
# 或  
export MEDIA_BACKUP_DEST="$HOME/Google Drive/Clawdbot/media"
```

或添加到 clawdbot 配置：
```json
{
  "skills": {
    "entries": {
      "media-backup": {
        "env": {
          "MEDIA_BACKUP_DEST": "/path/to/your/folder"
        }
      }
    }
  }
}
```

## 使用方法

```bash
# 运行备份
uv run skills/media-backup/scripts/backup.py

# 干运行（仅预览）
uv run skills/media-backup/scripts/backup.py --dry-run

# 自定义源/目标
uv run skills/media-backup/scripts/backup.py --source ~/.clawdbot/media/inbound --dest ~/Backups/media

# 检查状态
uv run skills/media-backup/scripts/backup.py status
```

## 工作原理

1. 扫描 `~/.clawdbot/media/inbound/` 中的媒体文件
2. 按日期组织：`YYYY-MM-DD/filename.jpg`
3. 通过内容哈希跟踪已存档文件（无重复）
4. 您的云服务自动同步该文件夹

## 定时任务设置

每小时运行备份：
```
0 * * * * cd ~/clawd && uv run skills/media-backup/scripts/backup.py >> /tmp/media-backup.log 2>&1
```

或通过 Clawdbot 定时任务：
```
Run media backup: uv run skills/media-backup/scripts/backup.py
If files archived, reply: 📸 Archived [N] media files
If none, reply: HEARTBEAT_OK
```

## 支持的格式

jpg, jpeg, png, gif, webp, heic, mp4, mov, m4v, webm
