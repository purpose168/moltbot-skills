# ddevaal 技能模块翻译待办列表

## 翻译指南

### 翻译原则
1. **保持功能不变**：翻译过程中确保代码功能完全保持不变
2. **专业术语准确**：技术术语应使用准确的中文对应词汇
3. **注释详细**：为代码文件添加详细的中文注释，解释代码逻辑
4. **格式一致**：保持文件格式和结构与原文一致
5. **时区设置**：涉及时间的配置文件应更新为 Asia/Shanghai 时区

### 翻译范围
- **文档文件** (.md)：全文翻译，包括标题、正文、代码注释
- **配置文件** (.json)：注释和说明部分翻译，键名保持英文
- **脚本文件** (.sh)：注释翻译，变量名和函数名保持英文
- **其他文件**：根据内容类型适当翻译

## 翻译状态

### 状态标识
- ✅ 已翻译
- 🔄 翻译中
- ⏳ 待翻译

## 文件翻译列表

### 1. azure-cli 模块
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/_meta.json`
- ✅ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/README.md`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/references/REFERENCE.md`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/scripts/azure-resource-cleanup.sh`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/scripts/azure-rg-deploy.sh`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/scripts/azure-storage-analysis.sh`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/scripts/azure-subscription-info.sh`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/scripts/azure-vm-status.sh`
- ✅ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/SKILL.md`

### 2. kubectl 模块
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/_meta.json`
- ✅ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/README.md`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/references/REFERENCE.md`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/scripts/kubectl-cluster-info.sh`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/scripts/kubectl-deploy-update.sh`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/scripts/kubectl-node-drain.sh`
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/scripts/kubectl-pod-debug.sh`
- ✅ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/SKILL.md`

### 3. 根目录文件
- ⏳ `/home/pps/github/skills/moltbot-skills/skills/ddevaal/translation_todo.md`

## 翻译进度

### 统计信息
- **总文件数**：18
- **已翻译**：4
- **翻译中**：0
- **待翻译**：14
- **完成率**：22.2%

### 优先级排序
1. **高优先级**：SKILL.md 文件（用户直接查看的文档）
2. **中优先级**：README.md、REFERENCE.md（说明文档）
3. **低优先级**：_meta.json、脚本文件（配置和工具文件）

## 翻译日志

### 2026-01-30
- 创建翻译待办列表文件
- 开始翻译工作
- 完成 `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/SKILL.md` 翻译
- 完成 `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/SKILL.md` 翻译
- 完成 `/home/pps/github/skills/moltbot-skills/skills/ddevaal/azure-cli/README.md` 翻译
- 完成 `/home/pps/github/skills/moltbot-skills/skills/ddevaal/kubectl/README.md` 翻译

## 注意事项

1. **备份**：翻译前建议备份原始文件
2. **测试**：翻译后应检查文件格式是否正确
3. **一致性**：保持相同模块内的术语翻译一致
4. **更新**：及时更新翻译状态和进度

---

*本待办列表将根据翻译进度持续更新*