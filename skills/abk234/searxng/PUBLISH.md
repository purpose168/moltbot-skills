# 将 SearXNG 技能发布到 ClawdHub

## 发布前验证

所有文件存在：
- [x] SKILL.md (v1.0.1)
- [x] README.md
- [x] LICENSE (MIT)
- [x] CHANGELOG.md
- [x] scripts/searxng.py
- [x] .clawdhub/metadata.json

安全性：
- [x] 无硬编码的私有URL
- [x] 通用默认值（http://localhost:8080）
- [x] 完全可通过SEARXNG_URL配置

## 发布步骤

### 步骤1：登录 ClawdHub

```bash
clawdhub login
```

### 步骤2：验证身份

```bash
clawdhub whoami
```

### 步骤3：发布技能

```bash
clawdhub publish skills/searxng
```

### 步骤4：验证发布

```bash
clawdhub search searxng
```

## 发布内容

CLI将上传：
- SKILL.md
- README.md
- LICENSE
- CHANGELOG.md
- scripts/ 目录
- .clawdhub/metadata.json

不会上传：
- PUBLISH.md
- PUBLISHING_CHECKLIST.md
- .git文件
- node_modules

## 发布后

更新版本后运行：
```bash
clawdhub publish skills/searxng
```

用户可以使用以下命令安装：
```bash
clawdhub install searxng
```