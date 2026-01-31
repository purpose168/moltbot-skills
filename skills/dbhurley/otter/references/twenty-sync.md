# Twenty CRM 集成

将 Otter.ai 转录同步到 Twenty CRM 作为联系人或公司的备注。

## 设置

设置环境变量：
```bash
export TWENTY_API_URL="https://api.your-twenty-instance.com"
export TWENTY_API_TOKEN="your-api-token"
```

## 工作流程

### 1. 获取转录摘要
```bash
uv run skills/otter/scripts/otter.py summary <speech_id>
```

### 2. 同步到联系人
```bash
uv run skills/otter/scripts/otter.py sync-twenty <speech_id> --contact "张三"
```

### 3. 同步到公司
```bash
uv run skills/otter/scripts/otter.py sync-twenty <speech_id> --company "示例公司"
```

## 代理集成

当运行 `sync-twenty` 命令时，它会输出代理应该处理的 JSON：

```json
{
  "action": "sync_to_twenty",
  "title": "每周站会",
  "speech_id": "abc123",
  "transcript_text": "...",
  "contact": "张三",
  "company": null
}
```

然后代理应该：
1. 总结转录内容（关键点、行动项）
2. 在 Twenty CRM 中查找联系人/公司
3. 创建包含摘要的备注
4. 可选地附加完整转录

## 使用的 Twenty API 端点

- `POST /api/notes` - 创建备注
- `GET /api/people?filter[name]` - 查找联系人
- `GET /api/companies?filter[name]` - 查找公司

## 备注格式示例

```markdown
## 会议摘要：每周站会
**日期：** 2026-01-06
**时长：** 45 分钟
**参与者：** 张三、李四、王五

### 关键点
- 项目时间线按计划进行
- 需要预算审查
- 客户提出新功能请求

### 行动项
- [ ] 张三：周五前发送预算提案
- [ ] 李四：安排客户演示

### 完整转录
[作为单独备注附加或链接到 Otter]
```

## 自动同步（Cron）

设置 cron 作业来检查新的转录并自动同步：

```json
{
  "name": "otter-sync",
  "schedule": {"kind": "cron", "expr": "*/30 * * * *"},
  "payload": {
    "kind": "agentTurn",
    "message": "检查 Otter 是否有新的转录。如果找到，总结并询问是否应同步到 Twenty CRM。"
  }
}
```
