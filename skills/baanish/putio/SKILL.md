---
name: putio
description: 通过 kaput CLI 管理 put.io 账户（传输、文件、搜索）— 升起主帆，添加磁力链接/URL，并检查传输状态；与 chill-institute 技能最佳搭配。
---

# put.io (kaput CLI)

此技能使用非官方的 **kaput** CLI 从命令行操作 put.io。

如果您还安装了 **chill-institute** 技能，您可以：
- 使用 chill.institute *启动* 传输（"发送到 put.io"），然后
- 使用此技能*验证和监控* 资源是否正在到达。

## 安装

- 需要 Rust + Cargo。
- 安装命令：
  ```bash
  cargo install kaput-cli
  ```
- 确保 `kaput` 在您的 PATH 上（通常位于 `~/.cargo/bin`）。

## 身份验证（设备代码流程）

1. 运行：
   ```bash
   kaput login
   ```
2. 它会打印一个链接 + 短代码（例如 `https://put.io/link` + `ABC123`）。
3. 用户在浏览器中输入代码。
4. CLI 完成并在本地存储令牌。

检查身份验证：
```bash
bash skills/putio/scripts/check_auth.sh
```

## 常见操作（脚本）

所有脚本自动定位 `kaput`（支持 `KAPUT_BIN=/path/to/kaput`）。

- 列出传输：
  ```bash
  bash skills/putio/scripts/list_transfers.sh
  ```

- 添加传输（磁力链接 / 种子 URL / 直接 URL）：
  ```bash
  bash skills/putio/scripts/add_transfer.sh "magnet:?xt=urn:btih:..."
  ```

- 搜索文件：
  ```bash
  bash skills/putio/scripts/search_files.sh "查询词"
  ```

- 状态（传输；可选账户）：
  ```bash
  bash skills/putio/scripts/status.sh
  SHOW_ACCOUNT=1 bash skills/putio/scripts/status.sh
  ```

## 原始 CLI

对于高级操作：
```bash
kaput --help
kaput transfers --help
kaput files --help
```

## 安全注意事项

- **不要在聊天中粘贴密码**。使用 `kaput login` 设备代码流程。
- kaput 在本地存储凭据（令牌文件）。将其视为敏感信息，避免共享。
- 避免在共享日志/截图中运行 `kaput debug`（可能泄露本地配置详情）。
