---
name: calculate-metadata
description: 动态设置合成的持续时间、尺寸和属性
metadata:
  tags: calculateMetadata, duration, dimensions, props, dynamic
---

# 使用 calculateMetadata

在 `<Composition>` 上使用 `calculateMetadata` 在渲染前动态设置持续时间、尺寸和转换属性。

```tsx
{/* 定义合成组件，指定动态元数据计算函数 */}
<Composition id="MyComp" component={MyComponent} durationInFrames={300} fps={30} width={1920} height={1080} defaultProps={{videoSrc: 'https://remotion.media/video.mp4'}} calculateMetadata={calculateMetadata} />
```

## 基于视频设置持续时间

使用 mediabunny/metadata skill 中的 `getMediaMetadata()` 函数获取视频持续时间：

```tsx
import {CalculateMetadataFunction} from 'remotion'; // 导入元数据计算函数类型
import {getMediaMetadata} from '../get-media-metadata'; // 导入获取媒体元数据的函数

// 异步计算元数据函数
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  // 获取视频元数据，包括持续时间
  const {durationInSeconds} = await getMediaMetadata(props.videoSrc);

  // 返回持续时间（将秒转换为帧数，假设帧率 30fps）
  return {
    durationInFrames: Math.ceil(durationInSeconds * 30),
  };
};
```

## 匹配视频的尺寸

```tsx
// 异步计算元数据函数
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  // 获取视频元数据，包括持续时间和尺寸
  const {durationInSeconds, dimensions} = await getMediaMetadata(props.videoSrc);

  // 返回持续时间和尺寸（如果视频没有尺寸信息，使用默认值）
  return {
    durationInFrames: Math.ceil(durationInSeconds * 30), // 持续时间（帧数）
    width: dimensions?.width ?? 1920, // 宽度，默认 1920
    height: dimensions?.height ?? 1080, // 高度，默认 1080
  };
};
```

## 基于多个视频设置持续时间

```tsx
// 异步计算元数据函数
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  // 并行获取所有视频的元数据
  const metadataPromises = props.videos.map((video) => getMediaMetadata(video.src));
  const allMetadata = await Promise.all(metadataPromises);

  // 计算所有视频的总持续时间
  const totalDuration = allMetadata.reduce((sum, meta) => sum + meta.durationInSeconds, 0);

  // 返回总持续时间（转换为帧数）
  return {
    durationInFrames: Math.ceil(totalDuration * 30),
  };
};
```

## 设置默认输出文件名

根据属性设置默认输出文件名：

```tsx
// 异步计算元数据函数
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props}) => {
  // 返回默认输出文件名
  return {
    defaultOutName: `video-${props.id}.mp4`, // 例如：video-123.mp4
  };
};
```

## 转换属性

在渲染前获取数据或转换属性：

```tsx
// 异步计算元数据函数
const calculateMetadata: CalculateMetadataFunction<Props> = async ({props, abortSignal}) => {
  // 使用中止信号获取数据（当属性在 Studio 中更改时取消陈旧的请求）
  const response = await fetch(props.dataUrl, {signal: abortSignal});
  const data = await response.json();

  // 返回转换后的属性
  return {
    props: {
      ...props, // 保留原有属性
      fetchedData: data, // 添加获取的数据
    },
  };
};
```

当属性在 Studio 中更改时，`abortSignal` 会取消陈旧的请求。

## 返回值

所有字段都是可选的。返回值会覆盖 `<Composition>` 的属性：

- `durationInFrames`：帧数
- `width`：合成的宽度（像素）
- `height`：合成的高度（像素）
- `fps`：每秒帧数
- `props`：传递给组件的转换后的属性
- `defaultOutName`：默认输出文件名
- `defaultCodec`：渲染的默认编解码器
