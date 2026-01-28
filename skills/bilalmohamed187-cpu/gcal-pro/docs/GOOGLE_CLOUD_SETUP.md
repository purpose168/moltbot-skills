# Google Cloud 项目设置指南

## 概述
本指南将引导您完成创建 Google Cloud 项目、启用日历 API 以及配置 OAuth 2.0 以获取 `client_secret.json` 文件的整个过程。

**预计所需时间：** 约 15 分钟  
**前置条件：** Google 账户

---

## 第一步：创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)

2. 点击项目下拉菜单（顶部左侧，"Google Cloud" 旁边）

3. 点击 **"新建项目"**

4. 输入项目详情：
   - **项目名称：** `gcal-pro`
   - **组织：** 保持默认（或选择"无组织"）

5. 点击 **"创建"**

6. 等待约 30 秒完成项目创建

7. 确保在下拉菜单中选择了 `gcal-pro`

---

## 第二步：启用 Google Calendar API

1. 在左侧边栏中，转到 **API 和服务 → 库**
   - 或直接访问：https://console.cloud.google.com/apis/library

2. 搜索 **"Google Calendar API"**

3. 点击 **"Google Calendar API"**

4. 点击 **"启用"**

5. 等待启用完成（约 10 秒）

---

## 第三步：配置 OAuth 同意屏幕

1. 转到 **API 和服务 → OAuth 同意屏幕**
   - 或直接访问：https://console.cloud.google.com/apis/credentials/consent

2. 选择 **用户类型：**
   - 选择 **"外部"**（除非您有 Google Workspace）
   - 点击 **"创建"**

3. 填写 **应用信息：**
   ```
   应用名称：gcal-pro
   用户支持邮箱：[您的邮箱]
   ```

4. 跳过 **应用 Logo**（可选，稍后可以添加）

5. 填写 **应用域名**（目前全部可选，可跳过）

6. 填写 **开发者联系信息：**
   ```
   邮箱地址：[您的邮箱]
   ```

7. 点击 **"保存并继续"**

---

## 第四步：配置权限范围

1. 点击 **"添加或删除权限范围"**

2. 在筛选器中搜索并选择以下权限范围：
   ```
   ✓ .../auth/calendar.readonly     （免费层 - 只读）
   ✓ .../auth/calendar.events       （专业层 - 读/写事件）
   ```

3. 点击 **"更新"**

4. 点击 **"保存并继续"**

---

## 第五步：添加测试用户

1. 点击 **"添加用户"**

2. 输入您的 Gmail 地址（您将用于测试的邮箱）

3. 点击 **"添加"**

4. 点击 **"保存并继续"**

5. 查看摘要并点击 **"返回仪表板"**

---

## 第六步：创建 OAuth 2.0 凭据

1. 转到 **API 和服务 → 凭据**
   - 或直接访问：https://console.cloud.google.com/apis/credentials

2. 点击 **"+ 创建凭据"**（页面顶部）

3. 选择 **"OAuth 客户端 ID"**

4. 配置 OAuth 客户端：
   ```
   应用类型：桌面应用
   名称：gcal-pro-desktop
   ```

5. 点击 **"创建"**

6. 弹出窗口显示您的凭据。点击 **"下载 JSON"**

7. **重要提示：** 将文件保存为 `client_secret.json`

---

## 第七步：安全存储凭据

将下载的文件移动到 gcal-pro 配置目录：

**Windows (PowerShell)：**
```powershell
# 创建配置目录
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.config\gcal-pro"

# 移动下载的文件（根据需要调整源路径）
Move-Item "$env:USERPROFILE\Downloads\client_secret*.json" "$env:USERPROFILE\.config\gcal-pro\client_secret.json"

# 验证
Get-Content "$env:USERPROFILE\.config\gcal-pro\client_secret.json" | Select-Object -First 3
```

**macOS/Linux：**
```bash
# 创建配置目录
mkdir -p ~/.config/gcal-pro

# 移动下载的文件
mv ~/Downloads/client_secret*.json ~/.config/gcal-pro/client_secret.json

# 验证
head -3 ~/.config/gcal-pro/client_secret.json
```

---

## 第八步：验证设置

您的配置目录现在应包含：
```
~/.config/gcal-pro/
└── client_secret.json    ← OAuth 凭据（请勿分享）
```

运行身份验证流程后（下一步），还将包含：
```
~/.config/gcal-pro/
├── client_secret.json    ← OAuth 凭据
└── token.json            ← 用户的访问/刷新令牌（自动生成）
```

---

## 安全注意事项

⚠️ **切勿将这些文件提交到 git：**
- `client_secret.json` — 您的应用凭据
- `token.json` — 用户的访问令牌

添加到 `.gitignore`：
```
client_secret.json
token.json
*.json
```

---

## 故障排除

**"访问被阻止：此应用的请求无效"**
- 确保您已将邮箱添加为测试用户（第五步）

**"错误 403：access_denied"**
- 应用处于测试模式 — 只有测试用户可以授权
- 将用户邮箱添加到测试用户列表

**"此应用未经验证"**
- 开发期间属于正常情况
- 点击"高级"→"转到 gcal-pro（不安全）"以继续
- 我们将在公开发布前提交验证

---

## 下一步

保存 `client_secret.json` 后，请告诉我，我将为您构建 OAuth 身份验证流程脚本。
