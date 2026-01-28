#!/bin/bash
# Ensue API 包装脚本 - 第二大脑技能
# 用法: ./scripts/ensue-api.sh <method> '<json_args>'
#
# 方法:
#   list_keys        - 按前缀列出键
#   get_memory       - 获取特定条目
#   create_memory    - 创建新条目
#   update_memory    - 更新现有条目
#   delete_memory    - 删除条目
#   discover_memories - 语义搜索
#
# 示例:
#   ./scripts/ensue-api.sh list_keys '{"prefix": "public/concepts/", "limit": 10}'
#   ./scripts/ensue-api.sh discover_memories '{"query": "缓存是如何工作的", "limit": 5}'

METHOD="$1"
ARGS="$2"

# 检查环境变量中是否设置了 API 密钥
if [ -z "$ENSUE_API_KEY" ]; then
  echo '{"error":"未设置 ENSUE_API_KEY。请在 clawdbot.json 的 skills.entries.second-brain.apiKey 下配置，或在 https://www.ensue-network.ai/dashboard 获取密钥"}'
  exit 1
fi

# 检查是否指定了方法
if [ -z "$METHOD" ]; then
  echo '{"error":"未指定方法。可用方法: list_keys, get_memory, create_memory, update_memory, delete_memory, discover_memories"}'
  exit 1
fi

# 默认空参数为空 JSON 对象
[ -z "$ARGS" ] && ARGS='{}'

# 调用 Ensue API
# 使用 curl 发送 POST 请求到 Ensue API 端点
curl -s -X POST https://api.ensue-network.ai/ \
  -H "Authorization: Bearer $ENSUE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"$METHOD\",\"arguments\":$ARGS},\"id\":1}" \
  | sed 's/^data: //'
