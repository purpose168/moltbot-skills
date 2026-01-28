---
name: security-monitor
description: Clawdbot 实时安全监控。检测入侵、异常 API 调用、凭据使用模式，并在发生违规时发出警报。
---

# 安全监控技能 (Security Monitor Skill)

## 使用场景

运行持续的安全监控，以检测 Clawdbot 部署上的违规行为、入侵和异常活动。

## 初始设置

无需外部依赖。作为后台进程运行。

## 使用方法

### 启动实时监控

```bash
node skills/security-monitor/scripts/monitor.cjs --interval 60
```

### 在守护进程模式下运行（后台）

```bash
node skills/security-monitor/scripts/monitor.cjs --daemon --interval 60
```

### 监控特定威胁

```bash
node skills/security-monitor/scripts/monitor.cjs --threats=credentials,ports,api-calls
```

## 监控内容

| 威胁 | 检测方式 | 响应措施 |
|------|----------|----------|
| **暴力破解攻击** | 失败登录检测 | 警报 + IP 追踪 |
| **端口扫描** | 快速连接尝试 | 警报 |
| **进程异常** | 意外进程 | 警报 |
| **文件变更** | 未授权修改 | 警报 |
| **容器健康** | Docker 问题 | 警报 |

## 输出方式

- 控制台输出（stdout）
- JSON 日志位于 `/root/clawd/clawdbot-security/logs/alerts.log`
- Telegram 警报（可配置）

## 守护进程模式

使用 systemd 或 PM2 保持监控活跃：

```bash
# 使用 PM2
pm2 start monitor.cjs --name "clawdbot-security" -- --daemon --interval 60
```

## 与安全审计配合使用

先运行审计，然后持续监控：

```bash
# 一次性审计
node skills/security-audit/scripts/audit.cjs --full

# 持续监控
node skills/security-monitor/scripts/monitor.cjs --daemon
```

## 相关技能

- `security-audit` - 一次性安全扫描（单独安装）
