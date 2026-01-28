---
name: import-srt-captions
description: 使用 @remotion/captions 将 .srt 字幕文件导入 Remotion
metadata:
  tags: captions, subtitles, srt, import, parse
---

# 将 .srt 字幕导入 Remotion

如果您有现有的 `.srt` 字幕文件，可以使用 `@remotion/captions` 的 `parseSrt()` 将其导入 Remotion。

## 前置条件

首先，需要安装 @remotion/captions 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/captions # 如果项目使用 npm
bunx remotion add @remotion/captions # 如果项目使用 bun
yarn remotion add @remotion/captions # 如果项目使用 yarn
pnpm exec remotion add @remotion/captions # 如果项目使用 pnpm
```

## 读取 .srt 文件

使用 `staticFile()` 引用 `public` 文件夹中的 `.srt` 文件，然后获取并解析它：

```tsx
import {useState, useEffect, useCallback} from 'react'; // 导入 React Hooks
import {AbsoluteFill, staticFile, useDelayRender} from 'remotion'; // 导入 Remotion 组件和 Hook
import {parseSrt} from '@remotion/captions'; // 导入 SRT 解析函数
import type {Caption} from '@remotion/captions'; // 导入字幕类型

export const MyComponent: React.FC = () => {
  // 存储解析后的字幕数据
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  // 使用延迟渲染 Hook
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  // 创建延迟渲染句柄
  const [handle] = useState(() => delayRender());

  // 获取并解析字幕的回调函数
  const fetchCaptions = useCallback(async () => {
    try {
      // 获取 SRT 文件
      const response = await fetch(staticFile('subtitles.srt'));
      // 获取文件文本内容
      const text = await response.text();
      // 解析 SRT 内容
      const {captions: parsed} = parseSrt({input: text});
      // 设置解析后的字幕数据
      setCaptions(parsed);
      // 继续渲染
      continueRender(handle);
    } catch (e) {
      // 取消渲染并报告错误
      cancelRender(e);
    }
  }, [continueRender, cancelRender, handle]); // 依赖项

  // 组件挂载时获取字幕
  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  // 如果字幕未加载完成，返回 null
  if (!captions) {
    return null;
  }

  // 返回绝对填充组件，在其中使用字幕数据
  return <AbsoluteFill>{/* 在此处使用字幕 */}</AbsoluteFill>;
};
```

也支持远程 URL - 您可以通过 URL `fetch()` 远程文件，而不是使用 `staticFile()`。

## 使用导入的字幕

解析后，字幕采用 `Caption` 格式，可以与所有 `@remotion/captions` 工具一起使用。
