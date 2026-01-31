---
name: starlink
version: 1.0.0
description: 通过本地 gRPC API 控制 Starlink 碟形天线。获取状态、列出 WiFi 客户端、运行速度测试、收起/展开碟形天线、重启和获取 GPS 位置。当用户询问 Starlink、互联网状态、连接设备或卫星连接时使用。
homepage: https://github.com/danfedick/starlink-cli
metadata: {"clawdbot":{"emoji":"📡","requires":{"bins":["starlink"]},"install":[{"id":"cargo","kind":"cargo","git":"https://github.com/danfedick/starlink-cli","bins":["starlink"],"label":"Install starlink-cli (cargo)"}]}}
---

# Starlink CLI

通过命令行通过其本地 gRPC API（`192.168.100.1:9200`）控制您的 Starlink 碟形天线。

## 安装

```bash
cargo install --git https://github.com/danfedick/starlink-cli
```

需要 Rust 和 `protoc`（Protocol Buffers 编译器）。

## 命令

### 状态
获取碟形天线状态、运行时间、SNR、延迟、吞吐量、障碍物：
```bash
starlink status
starlink status --json
```

### WiFi 客户端
列出连接到 Starlink 路由器的设备：
```bash
starlink clients
starlink clients --json
```

输出包括：名称、MAC、IP、信号强度、接口（2.4GHz/5GHz/ETH）、连接时间。

### 速度测试
通过碟形天线运行速度测试：
```bash
starlink speedtest
starlink speedtest --json
```

返回下载/上传 Mbps 和延迟。

### 收起/展开
收起碟形天线以便运输或存储：
```bash
starlink stow           # 收起
starlink stow --unstow  # 展开并恢复
```

### 重启
重启碟形天线：
```bash
starlink reboot
```

### 位置
获取 GPS 坐标（必须先在 Starlink 应用中启用 → 设置 → 高级 → 调试数据 → "允许本地网络访问"）：
```bash
starlink location
starlink location --json
```

## 输出格式

- **默认**: 人类可读的彩色输出
- **--json**: 用于脚本化/解析的 JSON

JSON 解析示例：
```bash
starlink status --json | jq '.latency_ms'
starlink clients --json | jq '.[] | .name'
```

## 要求

- 已连接到 Starlink 网络
- 碟形天线可在 `192.168.100.1:9200` 访问
- 对于位置：先在 Starlink 应用中启用

## 故障排除

**"无法连接到 Starlink 碟形天线"**
- 验证您是否在 Starlink WiFi 上或已连接到路由器
- 检查: `ping 192.168.100.1`
- 如果使用旁路模式与自己的路由器，确保 192.168.100.1 仍然可路由

**位置返回空**
- 在 Starlink 应用中启用：设置 → 高级 → 调试数据 → "允许本地网络访问"

## 限制

- 设备暂停/取消暂停不可用（这是 Starlink 应用独有的云功能）
- 只能在本地网络上工作，不能远程工作

## 来源

https://github.com/danfedick/starlink-cli
