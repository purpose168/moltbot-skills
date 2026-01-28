---
name: extract-frames
description: 使用 Mediabunny 在特定时间戳从视频中提取帧
metadata:
  tags: frames, extract, video, thumbnail, filmstrip, canvas
---

# 从视频中提取帧

使用 Mediabunny 在特定时间戳从视频中提取帧。这对于生成缩略图、影片条或处理单个帧非常有用。

## `extractFrames()` 函数

此函数可以直接复制粘贴到任何项目中。

```tsx
import {
  ALL_FORMATS, // 所有支持的格式
  Input, // 输入源类
  UrlSource, // URL 视频源
  VideoSample, // 视频样本类型
  VideoSampleSink, // 视频样本接收器
} from "mediabunny";

// 选项类型定义
type Options = {
  track: { width: number; height: number }; // 视频轨道尺寸
  container: string; // 容器格式名称
  durationInSeconds: number | null; // 视频持续时间（秒）
};

// 时间戳提取函数类型
export type ExtractFramesTimestampsInSecondsFn = (
  options: Options
) => Promise<number[]> | number[];

// 提取帧属性类型
export type ExtractFramesProps = {
  src: string; // 视频源 URL
  timestampsInSeconds: number[] | ExtractFramesTimestampsInSecondsFn; // 时间戳数组或动态计算函数
  onVideoSample: (sample: VideoSample) => void; // 每帧提取后的回调函数
  signal?: AbortSignal; // 可选的中止信号
};

// 异步提取帧函数
export async function extractFrames({
  src, // 视频源
  timestampsInSeconds, // 时间戳
  onVideoSample, // 回调函数
  signal, // 中止信号
}: ExtractFramesProps): Promise<void> {
  // 创建输入源，支持所有格式
  using input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src),
  });

  // 并行获取视频持续时间、格式和主视频轨道
  const [durationInSeconds, format, videoTrack] = await Promise.all([
    input.computeDuration(), // 计算持续时间
    input.getFormat(), // 获取格式信息
    input.getPrimaryVideoTrack(), // 获取主视频轨道
  ]);

  // 检查是否存在视频轨道
  if (!videoTrack) {
    throw new Error("No video track found in the input"); // 输入中未找到视频轨道
  }

  // 检查是否已中止
  if (signal?.aborted) {
    throw new Error("Aborted"); // 已中止
  }

  // 动态计算或使用传入的时间戳
  const timestamps =
    typeof timestampsInSeconds === "function"
      ? await timestampsInSeconds({
          track: {
            width: videoTrack.displayWidth, // 视频宽度
            height: videoTrack.displayHeight, // 视频高度
          },
          container: format.name, // 容器格式名称
          durationInSeconds, // 持续时间（秒）
        })
      : timestampsInSeconds;

  // 如果时间戳为空，直接返回
  if (timestamps.length === 0) {
    return;
  }

  // 再次检查是否已中止
  if (signal?.aborted) {
    throw new Error("Aborted"); // 已中止
  }

  // 创建视频样本接收器
  const sink = new VideoSampleSink(videoTrack);

  // 异步遍历指定时间戳的样本
  for await (using videoSample of sink.samplesAtTimestamps(timestamps)) {
    // 检查是否已中止
    if (signal?.aborted) {
      break; // 跳出循环
    }

    // 跳过无效样本
    if (!videoSample) {
      continue; // 继续下一次迭代
    }

    // 调用回调函数处理样本
    onVideoSample(videoSample);
  }
}
```

## 基本用法

在特定时间戳提取帧：

```tsx
await extractFrames({
  src: "https://remotion.media/video.mp4", // 视频源 URL
  timestampsInSeconds: [0, 1, 2, 3, 4], // 在第 0、1、2、3、4 秒提取帧
  onVideoSample: (sample) => {
    // 创建画布
    const canvas = document.createElement("canvas");
    canvas.width = sample.displayWidth; // 设置画布宽度
    canvas.height = sample.displayHeight; // 设置画布高度
    // 获取 2D 绘图上下文
    const ctx = canvas.getContext("2d");
    // 将帧绘制到画布上
    sample.draw(ctx!, 0, 0);
  },
});
```

## 创建影片条

使用回调函数根据视频元数据动态计算时间戳：

```tsx
const canvasWidth = 500; // 画布宽度
const canvasHeight = 80; // 画布高度
const fromSeconds = 0; // 开始时间（秒）
const toSeconds = 10; // 结束时间（秒）

await extractFrames({
  src: "https://remotion.media/video.mp4", // 视频源 URL
  timestampsInSeconds: async ({ track, durationInSeconds }) => {
    // 计算宽高比
    const aspectRatio = track.width / track.height;
    // 计算能容纳的帧数
    const amountOfFramesFit = Math.ceil(
      canvasWidth / (canvasHeight * aspectRatio)
    );
    // 计算时间段长度
    const segmentDuration = toSeconds - fromSeconds;
    const timestamps: number[] = []; // 存储时间戳

    // 为每个帧计算均匀分布的时间戳
    for (let i = 0; i < amountOfFramesFit; i++) {
      timestamps.push(
        fromSeconds + (segmentDuration / amountOfFramesFit) * (i + 0.5)
      );
    }

    return timestamps; // 返回时间戳数组
  },
  onVideoSample: (sample) => {
    console.log(`Frame at ${sample.timestamp}s`); // 打印帧时间戳

    // 创建画布并绘制帧
    const canvas = document.createElement("canvas");
    canvas.width = sample.displayWidth;
    canvas.height = sample.displayHeight;
    const ctx = canvas.getContext("2d");
    sample.draw(ctx!, 0, 0);
  },
});
```

## 使用 AbortSignal 取消

超时后取消帧提取：

```tsx
// 创建中止控制器
const controller = new AbortController();

// 5 秒后中止
setTimeout(() => controller.abort(), 5000);

try {
  await extractFrames({
    src: "https://remotion.media/video.mp4", // 视频源 URL
    timestampsInSeconds: [0, 1, 2, 3, 4], // 时间戳数组
    onVideoSample: (sample) => {
      using frame = sample; // 使用 using 语法自动管理资源
      // 创建画布并绘制帧
      const canvas = document.createElement("canvas");
      canvas.width = frame.displayWidth;
      canvas.height = frame.displayHeight;
      const ctx = canvas.getContext("2d");
      frame.draw(ctx!, 0, 0);
    },
    signal: controller.signal, // 传入中止信号
  });

  console.log("Frame extraction complete!"); // 提取完成
} catch (error) {
  console.error("Frame extraction was aborted or failed:", error); // 提取被中止或失败
}
```

## 超时与 Promise.race

```tsx
// 创建中止控制器
const controller = new AbortController();

// 超时 Promise：10 秒后拒绝
const timeoutPromise = new Promise<never>((_, reject) => {
  const timeoutId = setTimeout(() => {
    controller.abort(); // 中止提取
    reject(new Error("Frame extraction timed out after 10 seconds")); // 10 秒后超时
  }, 10000);

  // 中止时清除定时器
  controller.signal.addEventListener("abort", () => clearTimeout(timeoutId), {
    once: true,
  });
});

try {
  // 竞速：提取帧或超时
  await Promise.race([
    extractFrames({
      src: "https://remotion.media/video.mp4", // 视频源 URL
      timestampsInSeconds: [0, 1, 2, 3, 4], // 时间戳数组
      onVideoSample: (sample) => {
        using frame = sample; // 使用 using 语法
        // 创建画布并绘制帧
        const canvas = document.createElement("canvas");
        canvas.width = frame.displayWidth;
        canvas.height = frame.displayHeight;
        const ctx = canvas.getContext("2d");
        frame.draw(ctx!, 0, 0);
      },
      signal: controller.signal, // 传入中止信号
    }),
    timeoutPromise, // 超时 Promise
  ]);

  console.log("Frame extraction complete!"); // 提取完成
} catch (error) {
  console.error("Frame extraction was aborted or failed:", error); // 提取被中止或失败
}
```
