---
name: openssl
description: 使用 OpenSSL 生成安全随机字符串、密码和加密令牌。适用于创建密码、API 密钥、密钥或任何安全随机数据。
---

# OpenSSL 安全生成

使用 `openssl rand` 生成加密安全的随机数据。

## 密码/密钥生成

```bash
# 32 字节随机数据转为 base64（43 个字符，使用 tr 可转为 URL 安全格式）
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='

# 24 字节随机数据转为十六进制（48 个字符）
openssl rand -hex 24

# 字母数字密码（32 个字符）
openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 32
```

## 常用长度

| 用途 | 命令 |
|----------|---------|
| 密码（强） | `openssl rand -base64 24` |
| API 密钥 | `openssl rand -hex 32` |
| 会话令牌 | `openssl rand -base64 48` |
| 短 PIN（8 位数字） | `openssl rand -hex 4 | xxd -r -p | od -An -tu4 | tr -d ' ' | head -c 8` |

## 注意事项

- `-base64` 输出的字符数约为字节数的 1.33 倍
- `-hex` 输出的字符数为字节数的 2 倍
- 通过管道传输到 `tr -dc` 来过滤字符集
- 密钥至少使用 16 字节（128 位）
