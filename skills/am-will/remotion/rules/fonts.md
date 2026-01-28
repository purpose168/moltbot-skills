---
name: fonts
description: 在 Remotion 中加载 Google 字体和本地字体
metadata:
  tags: fonts, google-fonts, typography, text
---

# 在 Remotion 中使用字体

## 使用 @remotion/google-fonts 加载 Google Fonts

推荐使用 Google Fonts 的方式。它是类型安全的，并自动阻止渲染直到字体准备就绪。

### 前置条件

首先，需要安装 @remotion/google-fonts 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/google-fonts # 如果项目使用 npm
bunx remotion add @remotion/google-fonts # 如果项目使用 bun
yarn remotion add @remotion/google-fonts # 如果项目使用 yarn
pnpm exec remotion add @remotion/google-fonts # 如果项目使用 pnpm
```

```tsx
import { loadFont } from "@remotion/google-fonts/Lobster"; // 导入 Google Fonts 加载函数

// 加载字体并获取字体族名称
const { fontFamily } = loadFont();

export const MyComposition = () => {
  // 使用加载的字体
  return <div style={{ fontFamily }}>Hello World</div>;
};
```

最好只指定需要的字重和子集以减小文件大小：

```tsx
import { loadFont } from "@remotion/google-fonts/Roboto"; // 导入 Roboto 字体加载函数

// 加载字体，指定字重和子集
const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"], // 加载 400 和 700 字重
  subsets: ["latin"], // 加载拉丁文字子集
});
```

### 等待字体加载完成

如果需要知道字体何时准备就绪，请使用 `waitUntilDone()`：

```tsx
import { loadFont } from "@remotion/google-fonts/Lobster"; // 导入 Lobster 字体加载函数

// 获取字体族名称和等待函数
const { fontFamily, waitUntilDone } = loadFont();

// 等待字体加载完成
await waitUntilDone();
```

## 使用 @remotion/fonts 加载本地字体

对于本地字体文件，请使用 `@remotion/fonts` 包。

### 前置条件

首先，安装 @remotion/fonts：

```bash
npx remotion add @remotion/fonts # 如果项目使用 npm
bunx remotion add @remotion/fonts # 如果项目使用 bun
yarn remotion add @remotion/fonts # 如果项目使用 yarn
pnpm exec remotion add @remotion/fonts # 如果项目使用 pnpm
```

### 加载本地字体

将字体文件放置在 `public/` 文件夹中并使用 `loadFont()`：

```tsx
import { loadFont } from "@remotion/fonts"; // 导入本地字体加载函数
import { staticFile } from "remotion"; // 导入静态文件函数

// 异步加载本地字体
await loadFont({
  family: "MyFont", // 字体族名称，用于 CSS
  url: staticFile("MyFont-Regular.woff2"), // 字体文件 URL
});

export const MyComposition = () => {
  // 使用加载的本地字体
  return <div style={{ fontFamily: "MyFont" }}>Hello World</div>;
};
```

### 加载多个字重

使用相同的族名称分别加载每个字重：

```tsx
import { loadFont } from "@remotion/fonts"; // 导入本地字体加载函数
import { staticFile } from "remotion"; // 导入静态文件函数

// 并行加载多个字重
await Promise.all([
  // 加载 Regular（400）字重
  loadFont({
    family: "Inter", // 字体族名称
    url: staticFile("Inter-Regular.woff2"), // 常规字重文件
    weight: "400", // 字重值
  }),
  // 加载 Bold（700）字重
  loadFont({
    family: "Inter", // 字体族名称
    url: staticFile("Inter-Bold.woff2"), // 粗体字重文件
    weight: "700", // 字重值
  }),
]);
```

### 可用选项

```tsx
loadFont({
  family: "MyFont", // 必需：在 CSS 中使用的名称
  url: staticFile("font.woff2"), // 必需：字体文件 URL
  format: "woff2", // 可选：自动从扩展名检测
  weight: "400", // 可选：字重
  style: "normal", // 可选：normal 或 italic
  display: "block", // 可选：font-display 行为
});
```

## 在组件中使用

在组件的顶层或较早导入的单独文件中调用 `loadFont()`：

```tsx
import { loadFont } from "@remotion/google-fonts/Montserrat"; // 导入 Montserrat 字体加载函数

// 加载字体，指定字重和子集
const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"], // 加载 400 和 700 字重
  subsets: ["latin"], // 加载拉丁文字子集
});

export const Title: React.FC<{ text: string }> = ({ text }) => {
  return (
    // 使用加载的字体设置标题样式
    <h1
      style={{
        fontFamily, // 字体族
        fontSize: 80, // 字体大小 80px
        fontWeight: "bold", // 粗体
      }}
    >
      {text} {/* 显示文本内容 */}
    </h1>
  );
};
```
