---
name: airfoil
description: 通过命令行使用 Airfoil 控制 AirPlay 扬声器。使用简单的 CLI 命令连接、断开、设置音量和管理多房间音频。
metadata: {"clawdbot":{"os":["darwin"],"requires":{"bins":["osascript"]}}}
---

# Airfoil 技能

```
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║   A I R F O I L   S P E A K E R   C O N T R O L          ║
    ║                                                           ║
    ║        将音频流传输到任何 AirPlay 扬声器                   ║
    ║              来自您的 Mac，通过 CLI 控制                   ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
```

> *"为什么非要跳到 Mac 旁边，你可以对它呱呱叫啊。"*

---

## 此技能功能介绍

**Airfoil 技能**让您直接从终端完全控制 AirPlay 扬声器 – 或通过 Clawd！连接扬声器、控制音量、查看状态 – 全部无需触碰鼠标。

**功能特性：**
- **列出** — 显示所有可用扬声器
- **连接** — 连接到扬声器
- **断开** — 从扬声器断开连接
- **音量** — 控制音量（0-100%）
- **状态** — 显示已连接的扬声器及其音量级别

---

## 环境要求

| 所需项 | 详情 |
|------|---------|
| **操作系统** | macOS（使用 AppleScript） |
| **应用程序** | [Airfoil](https://rogueamoeba.com/airfoil/mac/)，Rogue Amoeba 出品 |
| **价格** | $35（提供免费试用） |

### 安装步骤

1. **安装 Airfoil：**
   ```bash
   # 通过 Homebrew 安装
   brew install --cask airfoil
   
   # 或从 rogueamoeba.com/airfoil/mac/ 下载
   ```

2. **启动 Airfoil** 并授予辅助功能权限（系统设置 -> 隐私与安全 -> 辅助功能）

3. **技能准备就绪！**

---

## 命令

### `list` — 显示所有扬声器

```bash
./airfoil.sh list
```

**输出：**
```
Computer, Andy's M5 Macbook, Sonos Move, Living Room TV
```

---

### `connect <扬声器>` — 连接到扬声器

```bash
./airfoil.sh connect "Sonos Move"
```

**输出：**
```
已连接：Sonos Move
```

> 扬声器名称必须完全匹配（区分大小写！）

---

### `disconnect <扬声器>` — 断开扬声器

```bash
./airfoil.sh disconnect "Sonos Move"
```

**输出：**
```
已断开：Sonos Move
```

---

### `volume <扬声器> <0-100>` — 设置音量

```bash
# 设置为 40%
./airfoil.sh volume "Sonos Move" 40

# 设置为最大音量
./airfoil.sh volume "Living Room TV" 100

# 夜间静音模式
./airfoil.sh volume "Sonos Move" 15
```

**输出：**
```
音量 Sonos Move：40%
```

---

### `status` — 显示已连接的扬声器

```bash
./airfoil.sh status
```

**输出：**
```
Sonos Move：40%
Living Room TV：65%
```

如果没有连接任何扬声器：
```
没有已连接的扬声器
```

---

## 典型工作流程

### "客厅播放音乐"
```bash
./airfoil.sh connect "Sonos Move"
./airfoil.sh volume "Sonos Move" 50
# -> 现在启动 Spotify/Apple Music 尽情享受吧！
```

### "电影之夜设置"
```bash
./airfoil.sh connect "Living Room TV"
./airfoil.sh volume "Living Room TV" 70
./airfoil.sh disconnect "Sonos Move"  # 如果仍在连接
```

### "全部关闭"
```bash
for speaker in "Sonos Move" "Living Room TV"; do
    ./airfoil.sh disconnect "$speaker" 2>/dev/null
done
echo "所有扬声器已断开"
```

---

## 故障排除

### "未找到扬声器"

**问题：** `执行错误：Airfoil 遇到错误：无法获取扬声器...`

**解决方案：**
1. 检查精确拼写：`./airfoil.sh list`
2. 扬声器名称**区分大小写**（"sonos move" ≠ "Sonos Move"）
3. 扬声器必须在同一网络
4. 扬声器必须开机并可访问

---

### "Airfoil 无法启动 / 无权限"

**问题：** AppleScript 无法控制 Airfoil

**解决方案：**
1. **系统设置 -> 隐私与安全 -> 辅助功能**
2. 添加终端（或 iTerm）
3. 添加 Airfoil
4. 重启 macOS（有时是必要的）

---

### "音量不起作用"

**问题：** 音量命令无效

**解决方案：**
1. 扬声器必须先**连接**才能设置音量
2. 先 `connect`，然后 `volume`
3. 某些扬声器有硬件侧限制

---

### "Airfoil 未安装"

**问题：** `执行错误：应用程序未运行`

**解决方案：**
```bash
# 启动 Airfoil
open -a Airfoil

# 或安装它
brew install --cask airfoil
```

---

### "bc：命令未找到"

**问题：** 音量计算失败

**解决方案：**
```bash
# 安装 bc（macOS 上应该标准安装）
brew install bc
```

---

## 已测试的扬声器

这些扬声器已通过测试：

| 扬声器 | 类型 | 备注 |
|---------|------|-------|
| `Computer` | 本地 | 始终可用 |
| `Andy's M5 Macbook` | Mac | 当在网络上时 |
| `Sonos Move` | Sonos | 蓝牙或 WiFi |
| `Living Room TV` | Apple TV | 通过 AirPlay |

> 使用 `./airfoil.sh list` 发现您自己的扬声器！

---

## 与 Clawd 的集成

此技能与 Clawd 完美配合！示例：

```
"嘿 Clawd，连接 Sonos Move"
-> ./airfoil.sh connect "Sonos Move"

"把音乐调低"
-> ./airfoil.sh volume "Sonos Move" 30

"哪些扬声器开了？"
-> ./airfoil.sh status
```

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|---------|------|---------|
| 1.0.0 | 2025-01-25 | 初始发布 |
| 1.1.0 | 2025-06-10 | 文档优化 |
| 1.2.0 | 2025-06-26 | 翻译成英文，ClawdHub 就绪！ |

---

## 致谢

```
  @..@
 (----)
( >__< )   "这个技能是用爱心制作的
 ^^  ^^     由一只青蛙和他的主人！"
```

**作者：** Andy Steinberger（由他的 Clawdbot 青蛙助手 Owen 协助）  
**技术支持：** [Airfoil](https://rogueamoeba.com/airfoil/mac/)，Rogue Amoeba 出品  
**所属：** [Clawdbot](https://clawdhub.com) 技能集合

---

<div align="center">

**用 为 Clawdbot 社区制作**

*Ribbit!*

</div>
