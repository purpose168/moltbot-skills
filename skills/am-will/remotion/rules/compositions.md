---
name: compositions
description: 定义合成、静态帧、文件夹、默认属性和动态元数据
metadata:
  tags: composition, still, folder, props, metadata
---

`<Composition>` 定义了可渲染视频的组件、宽度、高度、帧率和持续时间。

它通常放置在 `src/Root.tsx` 文件中。

```tsx
import { Composition } from "remotion";
import { MyComposition } from "./MyComposition";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyComposition" // 合成 ID，用于标识
      component={MyComposition} // 要渲染的 React 组件
      durationInFrames={100} // 持续时间（帧数）
      fps={30} // 帧率（每秒帧数）
      width={1080} // 视频宽度（像素）
      height={1080} // 视频高度（像素）
    />
  );
};
```

## 默认属性

传递 `defaultProps` 为组件提供初始值。
值必须是 JSON 可序列化的（支持 `Date`、`Map`、`Set` 和 `staticFile()`）。

```tsx
import { Composition } from "remotion";
import { MyComposition, MyCompositionProps } from "./MyComposition";

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyComposition"
      component={MyComposition}
      durationInFrames={100}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ // 默认属性值
        title: "Hello World", // 标题文本
        color: "#ff0000", // 颜色值
      } satisfies MyCompositionProps}
    />
  );
};
```

使用 `type` 声明属性而不是 `interface`，以确保 `defaultProps` 的类型安全。

## 文件夹

使用 `<Folder>` 在侧边栏中组织合成。
文件夹名称只能包含字母、数字和连字符。

```tsx
import { Composition, Folder } from "remotion";

export const RemotionRoot = () => {
  return (
    <>
      {/* 营销文件夹 */}
      <Folder name="Marketing">
        <Composition id="Promo" /* ... */ />
        <Composition id="Ad" /* ... */ />
      </Folder>
      {/* 社交媒体文件夹 */}
      <Folder name="Social">
        {/* Instagram 子文件夹 */}
        <Folder name="Instagram">
          <Composition id="Story" /* ... */ />
          <Composition id="Reel" /* ... */ />
        </Folder>
      </Folder>
    </>
  );
};
```

## 静态帧

使用 `<Still>` 创建单帧图像。它不需要 `durationInFrames` 或 `fps`。

```tsx
import { Still } from "remotion";
import { Thumbnail } from "./Thumbnail";

export const RemotionRoot = () => {
  return (
    <Still
      id="Thumbnail" // 静态帧 ID
      component={Thumbnail} // 要渲染的组件
      width={1280} // 宽度
      height={720} // 高度
    />
  );
};
```

## 计算元数据

使用 `calculateMetadata` 使尺寸、持续时间或属性基于数据动态化。

```tsx
import { Composition, CalculateMetadataFunction } from "remotion";
import { MyComposition, MyCompositionProps } from "./MyComposition";

// 计算元数据的异步函数
const calculateMetadata: CalculateMetadataFunction<MyCompositionProps> = async ({
  props, // 组件属性
  abortSignal, // 中止信号，用于取消请求
}) => {
  // 从 API 获取视频数据
  const data = await fetch(`https://api.example.com/video/${props.videoId}`, {
    signal: abortSignal,
  }).then((res) => res.json());

  // 返回动态计算的元数据
  return {
    durationInFrames: Math.ceil(data.duration * 30), // 根据数据计算持续时间
    props: {
      ...props, // 保留原有属性
      videoUrl: data.url, // 添加视频 URL
    },
  };
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyComposition"
      component={MyComposition}
      durationInFrames={100} // 占位符，将被 calculateMetadata 覆盖
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{ videoId: "abc123" }} // 默认视频 ID
      calculateMetadata={calculateMetadata} // 元数据计算函数
    />
  );
};
```

该函数可以返回 `props`、`durationInFrames`、`width`、`height`、`fps` 和编解码器相关的默认值。它在渲染开始前运行一次。
