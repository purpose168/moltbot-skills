---
name: display-captions
description: 在 Remotion 中显示字幕，带有 TikTok 风格的页面和单词高亮
metadata:
  tags: captions, subtitles, display, tiktok, highlight
---

# 在 Remotion 中显示字幕

本指南说明如何在 Remotion 中显示字幕，假设您已经有了 `Caption` 格式的字幕。

## 前置条件

首先，需要安装 @remotion/captions 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/captions # 如果项目使用 npm
bunx remotion add @remotion/captions # 如果项目使用 bun
yarn remotion add @remotion/captions # 如果项目使用 yarn
pnpm exec remotion add @remotion/captions # 如果项目使用 pnpm
```

## 创建页面

使用 `createTikTokStyleCaptions()` 将字幕分组为页面。`combineTokensWithinMilliseconds` 选项控制一次显示多少个单词：

```tsx
import {useMemo} from 'react';
import {createTikTokStyleCaptions} from '@remotion/captions';
import type {Caption} from '@remotion/captions';

// 字幕切换频率（毫秒）
// 较高的值 = 每页更多单词
// 较低的值 = 更少的单词（更接近逐词显示）
const SWITCH_CAPTIONS_EVERY_MS = 1200;

const {pages} = useMemo(() => {
  return createTikTokStyleCaptions({
    captions, // 原始字幕数据
    combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS, // 合并时间范围
  });
}, [captions]); // 依赖数组：字幕数据变化时重新计算
```

## 使用 Sequence 渲染

遍历页面并在每个 `<Sequence>` 中渲染一个。根据页面时间计算开始帧和持续时间：

```tsx
import {Sequence, useVideoConfig, AbsoluteFill} from 'remotion';
import type {TikTokPage} from '@remotion/captions';

const CaptionedContent: React.FC = () => {
  const {fps} = useVideoConfig(); // 获取视频配置

  return (
    <AbsoluteFill>
      {/* 遍历所有页面 */}
      {pages.map((page, index) => {
        // 获取下一页，用于计算当前页的结束时间
        const nextPage = pages[index + 1] ?? null;
        // 将毫秒转换为帧号
        const startFrame = (page.startMs / 1000) * fps;
        // 计算结束帧：取下一页开始帧或最大持续时间的较小值
        const endFrame = Math.min(
          nextPage ? (nextPage.startMs / 1000) * fps : Infinity,
          startFrame + (SWITCH_CAPTIONS_EVERY_MS / 1000) * fps,
        );
        // 计算持续时间（帧数）
        const durationInFrames = endFrame - startFrame;

        // 忽略无效的持续时间
        if (durationInFrames <= 0) {
          return null;
        }

        return (
          <Sequence
            key={index} // 使用索引作为 key
            from={startFrame} // 从起始帧开始
            durationInFrames={durationInFrames} // 持续帧数
          >
            <CaptionPage page={page} /> {/* 渲染当前页面 */}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

## 单词高亮

字幕页面包含 `tokens`，您可以使用它们来高亮当前正在说的单词：

```tsx
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {TikTokPage} from '@remotion/captions';

const HIGHLIGHT_COLOR = '#39E508'; // 高亮颜色（TikTok 绿色）

const CaptionPage: React.FC<{page: TikTokPage}> = ({page}) => {
  const frame = useCurrentFrame(); // 获取当前帧号
  const {fps} = useVideoConfig(); // 获取视频配置

  // 相对于 Sequence 开始的当前时间（毫秒）
  const currentTimeMs = (frame / fps) * 1000;
  // 通过加上页面开始时间转换为绝对时间
  const absoluteTimeMs = page.startMs + currentTimeMs;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      {/* 字幕容器：大号粗体字体，预保留空白 */}
      <div style={{fontSize: 80, fontWeight: 'bold', whiteSpace: 'pre'}}>
        {/* 遍历页面中的所有 token */}
        {page.tokens.map((token) => {
          // 判断当前 token 是否处于活跃状态（正在被朗读）
          const isActive =
            token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;

          return (
            <span
              key={token.fromMs} // 使用开始时间作为唯一标识
              style={{color: isActive ? HIGHLIGHT_COLOR : 'white'}} // 活跃时高亮，否则白色
            >
              {token.text} {/* 显示单词文本 */}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
```
