# WhatsApp 视频技能

使用 Remotion 创建动画风格的 WhatsApp 聊天视频。非常适合 X、TikTok、Instagram Reels。

## 功能

- 📱 带有动态岛的逼真 iPhone 边框
- 💬 WhatsApp 深色模式 UI（准确的颜色、气泡、时间戳）
- 📜 当消息延伸时自动滚动
- 🔤 大型可读字体（针对移动端观看优化）
- 🎵 消息通知声音
- ✨ 消息出现时的弹性动画
- ⌨️ 打字指示器（"..."气泡）
- 🔗 链接预览卡片
- ✅ 已读回执（蓝色勾号）
- **粗体**和`代码`格式支持

## 默认设置

- **宽高比:** 4:5（1080×1350）- 适用于 X/Instagram 动态
- **无片头/片尾** - 以聊天开始和结束
- **2倍字体** - 在移动设备上可读
- **自动滚动** - 保持所有消息可见

## 先决条件

此技能需要 **Remotion 最佳实践**技能：

```bash
npx skills add remotion-dev/skills -a claude-code -y -g
```

## 快速开始

```bash
cd ~/Projects/remotion-test
```

在 `src/WhatsAppVideo.tsx` 中编辑对话，然后渲染：

```bash
npx remotion render WhatsAppDemo out/my-video.mp4 --concurrency=4
```

## 如何创建新视频

### 1. 定义您的消息

在 `src/WhatsAppVideo.tsx` 中编辑 `ChatMessages` 组件：

```tsx
// 传入消息（来自助手）
<Message
  text="您的消息文本"
  isOutgoing={false}
  time="上午8:40"
  delay={125}  // 消息出现的帧（30fps）
/>

// 传出消息（来自用户）
<Message
  text="您的传出消息"
  isOutgoing={true}
  time="上午8:41"
  delay={200}
  showCheck={true}
/>

// 打字指示器（显示"..."气泡）
<TypingIndicator delay={80} duration={45} />
```

### 2. 时间指南

- **30 fps** = 每秒 30 帧
- `delay={30}` = 出现在 1 秒
- `delay={60}` = 出现在 2 秒
- `duration={45}` = 持续 1.5 秒

**典型流程：**
1. 第一条消息：`delay={20}`（~0.7秒）
2. 打字指示器：`delay={80}`，`duration={45}`
3. 回复：`delay={125}`（打字结束后）
4. 下一个打字：`delay={175}`，`duration={45}`
5. 下一个回复：`delay={220}`

### 3. 调整滚动

在 `ChatMessages` 中，根据您的消息数量更新滚动插值：

```tsx
const scrollAmount = interpolate(
  frame,
  [scrollStart, scrollStart + 60, messageFrame, lastFrame],
  [0, firstScroll, firstScroll, finalScroll],
  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
);
```

如果消息溢出，增加滚动值。

### 4. 文本格式

消息支持：
- **粗体**: `**粗体文本**`
- `代码`: 文本周围的反引号
- 换行符：字符串中的 `\n`
- 表情符号：直接使用 🎬

### 5. 自定义标题

在 `ChatHeader` 组件中，更改：
- 名称：`Pokey 🐡` → 您的助手名称
- 状态：`online`
- 头像表情符号

### 6. 更新持续时间

在 `Root.tsx` 中，设置 `durationInFrames` 以匹配您的视频长度：
- 计数直到最后一条消息出现的帧数 + ~100 帧缓冲
- 在 30fps 下：450 帧 = 15 秒

### 7. 渲染

```bash
# 标准渲染
npx remotion render WhatsAppDemo out/video.mp4 --concurrency=4

# 更高质量
npx remotion render WhatsAppDemo out/video.mp4 --codec h264 --crf 18

# 在浏览器中预览
npm run dev
```

## 平台尺寸

编辑 `Root.tsx` 以更改尺寸：

| 平台 | 尺寸 | 宽高比 | 用例 |
|----------|------------|--------------|----------|
| **X/Instagram 动态** | 1080×1350 | 4:5 | 默认，最可见 |
| **X/TikTok/Reels** | 1080×1920 | 9:16 | 全垂直 |
| **X 正方形** | 1080×1080 | 1:1 | 通用 |
| **YouTube/X 横向** | 1920×1080 | 16:9 | 横向 |

## 项目结构

```
~/Projects/remotion-test/
├── src/
│   ├── WhatsAppVideo.tsx   # 主视频组件
│   └── Root.tsx            # 合成配置
├── public/
│   └── sounds/
│       ├── pop.mp3         # 消息收到
│       └── send.mp3        # 消息发送
└── out/                    # 渲染的视频
```

## 音效

使用 Sequence 触发声音：
```tsx
<Sequence from={125}>
  <Audio src={staticFile("sounds/pop.mp3")} volume={0.5} />
</Sequence>
```

## 提示

1. **编辑时预览**: 运行 `npm run dev` 实时查看更改
2. **逐帧检查**: 使用时间线拖动检查时序
3. **保持消息简洁**: 长消息可能需要调整滚动
4. **在移动端测试**: 检查实际大小的可读性

## 让 Pokey 生成

只需描述对话：
- "WhatsApp 视频：我请你做 [X]"
- "制作一个显示 [对话] 的聊天视频"

Pokey 将编写消息、设置时序、渲染并发送 MP4。
