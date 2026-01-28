---
name: security-audit
description: 为 Clawdbot 部署提供全面的安全审计。扫描暴露的凭据、开放端口、弱配置和漏洞。支持自动修复模式。
---

# 安全审计技能 (Security Audit Skill)

## 使用场景

在部署之前或按计划运行安全审计，以识别 Clawdbot 设置中的漏洞。使用自动修复来自动修复常见问题。

## 初始设置

无需外部依赖。尽可能使用原生系统工具。

## 使用方法

### 快速审计（常见问题）

```bash
node skills/security-audit/scripts/audit.cjs
```

### 完整审计（全面扫描）

```bash
node skills/security-audit/scripts/audit.cjs --full
```

### 自动修复常见问题

```bash
node skills/security-audit/scripts/audit.cjs --fix
```

### 审计特定区域

```bash
node skills/security-audit/scripts/audit.cjs --credentials      # 检查暴露的 API 密钥
node skills/security-audit/scripts/audit.cjs --ports            # 扫描开放端口
node skills/security-audit/scripts/audit.cjs --configs          # 验证配置
node skills/security-audit/scripts/audit.cjs --permissions      # 检查文件权限
node skills/security-audit/scripts/audit.cjs --docker           # Docker 安全检查
```

### 生成报告

```bash
node skills/security-audit/scripts/audit.cjs --full --json > audit-report.json
```

## 输出说明

审计会生成包含以下内容的报告：

| 级别 | 描述 |
|------|------|
| 🔴 严重 | 需要立即采取措施（暴露的凭据） |
| 🟠 高风险 | 重大风险，请尽快修复 |
| 🟡 中等 | 一般关注 |
| 🟢 信息 | 供参考，无需操作 |

## 执行检查项目

### 凭据检查
- 环境文件中的 API 密钥
- 命令历史记录中的令牌
- 代码中硬编码的密钥
- 弱密码模式

### 端口检查
- 意外的开放端口
- 暴露在互联网的服务
- 缺失的防火墙规则

### 配置检查
- 缺失的速率限制
- 禁用身份验证
- 默认凭据
- 开放的 CORS 策略

### 文件检查
- 全局可读的文件
- 任何人可执行的文件
- 公共目录中的敏感文件

### Docker 检查
- 特权容器
- 缺失的资源限制
- 容器中的 root 用户

## 自动修复功能

`--fix` 选项会自动：
- 设置严格的文件权限（.env 文件设为 600）
- 保护敏感配置文件
- 如果缺失则创建 .gitignore
- 启用基本的安全头

## 相关技能

- `security-monitor` - 实时监控（单独提供）
