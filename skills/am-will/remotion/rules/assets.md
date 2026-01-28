---
name: assets
description: 将图片、视频、音频和字体导入 Remotion
metadata:
  tags: assets, staticFile, images, fonts, public
---

# 在 Remotion 中导入资源

## public 文件夹

将资源放置在项目根目录的 `public/` 文件夹中。

## 使用 staticFile()

您必须使用 `staticFile()` 来引用 `public/` 文件夹中的文件：

```tsx
import {Img, staticFile} from 'remotion';

export const MyComposition = () => {
  // 使用 staticFile() 返回编码后的 URL
  return <Img src={staticFile('logo.png')} />;
};
```

该函数返回编码后的 URL，在部署到子目录时能正常工作。

## 与组件一起使用

**图片：**

```tsx
import {Img, staticFile} from 'remotion';

{/* 使用 Img 组件显示图片 */}
<Img src={staticFile('photo.png')} />;
```

**视频：**

```tsx
import {Video} from '@remotion/media';
import {staticFile} from 'remotion';

{/* 使用 Video 组件播放视频 */}
<Video src={staticFile('clip.mp4')} />;
```

**音频：**

```tsx
import {Audio} from '@remotion/media';
import {staticFile} from 'remotion';

{/* 使用 Audio 组件播放音频 */}
<Audio src={staticFile('music.mp3')} />;
```

**字体：**

```tsx
import {staticFile} from 'remotion';

{/* 创建字体对象：从 staticFile() 加载字体文件 */}
const fontFamily = new FontFace('MyFont', `url(${staticFile('font.woff2')})`));
await fontFamily.load(); // 等待字体加载完成
document.fonts.add(fontFamily); // 将字体添加到文档字体集合
```

## 远程 URL

远程 URL 可以直接使用，无需 `staticFile()`：

```tsx
{/* 直接使用远程图片 URL */}
<Img src="https://example.com/image.png" />
{/* 直接使用远程视频 URL */}
<Video src="https://remotion.media/video.mp4" />
```

## 重要说明

- Remotion 组件（`<Img>`、`<Video>`、`<Audio>`）确保资源在渲染前完全加载
- 文件名中的特殊字符（`#`、`?`、`&`）会自动编码
