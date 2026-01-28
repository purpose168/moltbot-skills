---
name: images
description: 在 Remotion 中使用 <Img> 组件嵌入图片
metadata:
  tags: images, img, staticFile, png, jpg, svg, webp
---

# 在 Remotion 中使用图片

## `<Img>` 组件

始终使用 `remotion` 的 `<Img>` 组件来显示图片：

```tsx
import { Img, staticFile } from "remotion";

export const MyComposition = () => {
  // 使用 Img 组件显示本地图片
  return <Img src={staticFile("photo.png")} />;
};
```

## 重要限制

**您必须使用 `remotion` 的 `<Img>` 组件。** 请勿使用：

- 原生 HTML `<img>` 元素
- Next.js `<Image>` 组件
- CSS `background-image`

`<Img>` 组件确保图片在渲染前完全加载，防止视频导出时出现闪烁和空白帧。

## 使用 staticFile() 的本地图片

将图片放置在 `public/` 文件夹中，并使用 `staticFile()` 引用它们：

```
my-video/
├─ public/
│  ├─ logo.png      # Logo 图片
│  ├─ avatar.jpg    # 头像图片
│  └─ icon.svg      # SVG 图标
├─ src/
├─ package.json
```

```tsx
import { Img, staticFile } from "remotion";

{/* 显示 logo 图片 */}
<Img src={staticFile("logo.png")} />
```

## 远程图片

远程 URL 可以直接使用，无需 `staticFile()`：

```tsx
{/* 直接使用远程图片 URL */}
<Img src="https://example.com/image.png" />
```

确保远程图片已启用 CORS。

对于动态 GIF，请改用 `@remotion/gif` 的 `<Gif>` 组件。

## 大小和定位

使用 `style` 属性控制大小和位置：

```tsx
<Img
  src={staticFile("photo.png")}
  style={{
    width: 500, // 宽度 500 像素
    height: 300, // 高度 300 像素
    position: "absolute", // 绝对定位
    top: 100, // 距离顶部 100 像素
    left: 50, // 距离左侧 50 像素
    objectFit: "cover", // 保持宽高比填充
  }}
/>
```

## 动态图片路径

使用模板字面量进行动态文件引用：

```tsx
import { Img, staticFile, useCurrentFrame } from "remotion";

const frame = useCurrentFrame(); // 获取当前帧

// 图片序列：基于帧号动态加载
<Img src={staticFile(`frames/frame${frame}.png`)} />

// 基于属性选择：根据用户 ID 加载头像
<Img src={staticFile(`avatars/${props.userId}.png`)} />

// 条件图片：根据状态显示不同图标
<Img src={staticFile(`icons/${isActive ? "active" : "inactive"}.svg`)} />
```

此模式适用于：

- 图片序列（逐帧动画）
- 用户特定的头像或个人资料图片
- 基于主题的图标
- 状态相关的图形

## 获取图片尺寸

使用 `getImageDimensions()` 获取图片的尺寸：

```tsx
import { getImageDimensions, staticFile } from "remotion";

{/* 异步获取图片尺寸 */}
const { width, height } = await getImageDimensions(staticFile("photo.png"));
```

这对于计算宽高比或调整合成尺寸很有用：

```tsx
import { getImageDimensions, staticFile, CalculateMetadataFunction } from "remotion";

// 计算元数据函数：根据图片尺寸动态设置合成尺寸
const calculateMetadata: CalculateMetadataFunction = async () => {
  const { width, height } = await getImageDimensions(staticFile("photo.png"));
  return {
    width, // 使用图片宽度
    height, // 使用图片高度
  };
};
```
