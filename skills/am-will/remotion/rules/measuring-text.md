---
name: measuring-text
description: 测量文本尺寸、将文本适应容器、检查溢出
metadata:
  tags: measure, text, layout, dimensions, fitText, fillTextBox
---

# 在 Remotion 中测量文本

## 前置条件

如果尚未安装 @remotion/layout-utils，请先安装：

```bash
npx remotion add @remotion/layout-utils # 如果项目使用 npm
bunx remotion add @remotion/layout-utils # 如果项目使用 bun
yarn remotion add @remotion/layout-utils # 如果项目使用 yarn
pnpm exec remotion add @remotion/layout-utils # 如果项目使用 pnpm
```

## 测量文本尺寸

使用 `measureText()` 计算文本的宽度和高度：

```tsx
import { measureText } from "@remotion/layout-utils"; // 导入文本测量函数

// 测量文本尺寸
const { width, height } = measureText({
  text: "Hello World", // 要测量的文本
  fontFamily: "Arial", // 字体族
  fontSize: 32, // 字体大小
  fontWeight: "bold", // 字重
});
```

结果会被缓存 - 重复调用返回缓存的结果。

## 将文本适应宽度

使用 `fitText()` 找到容器的最佳字体大小：

```tsx
import { fitText } from "@remotion/layout-utils"; // 导入文本适应函数

// 计算最佳字体大小
const { fontSize } = fitText({
  text: "Hello World", // 要适应的文本
  withinWidth: 600, // 最大宽度
  fontFamily: "Inter", // 字体族
  fontWeight: "bold", // 字重
});

return (
  <div
    style={{
      fontSize: Math.min(fontSize, 80), // 最大限制为 80px
      fontFamily: "Inter", // 字体族
      fontWeight: "bold", // 字重
    }}
  >
    Hello World
  </div>
);
```

## 检查文本溢出

使用 `fillTextBox()` 检查文本是否超出盒子：

```tsx
import { fillTextBox } from "@remotion/layout-utils"; // 导入文本盒子填充函数

// 创建文本盒子，指定最大宽度和最大行数
const box = fillTextBox({ maxBoxWidth: 400, maxLines: 3 });

const words = ["Hello", "World", "This", "is", "a", "test"]; // 要添加的单词列表
for (const word of words) {
  // 向盒子添加单词
  const { exceedsBox } = box.add({
    text: word + " ", // 添加的文本（包括空格）
    fontFamily: "Arial", // 字体族
    fontSize: 24, // 字体大小
  });
  if (exceedsBox) {
    // 文本会溢出，进行相应处理
    break; // 跳出循环
  }
}
```

## 最佳实践

**先加载字体：** 仅在字体加载完成后调用测量函数。

```tsx
import { loadFont } from "@remotion/google-fonts/Inter"; // 导入字体加载函数

// 加载 Inter 字体
const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["400"], // 加载 400 字重
  subsets: ["latin"], // 加载拉丁文字子集
});

// 等待字体加载完成后进行测量
waitUntilDone().then(() => {
  // 现在可以安全地进行测量
  const { width } = measureText({
    text: "Hello", // 要测量的文本
    fontFamily, // 字体族
    fontSize: 32, // 字体大小
  });
})
```

**使用 validateFontIsLoaded：** 尽早捕获字体加载问题：

```tsx
measureText({
  text: "Hello", // 要测量的文本
  fontFamily: "MyCustomFont", // 字体族
  fontSize: 32, // 字体大小
  validateFontIsLoaded: true, // 如果字体未加载则抛出错误
});
```

**匹配字体属性：** 测量和渲染使用相同的属性：

```tsx
// 定义字体样式对象
const fontStyle = {
  fontFamily: "Inter", // 字体族
  fontSize: 32, // 字体大小
  fontWeight: "bold" as const, // 字重
  letterSpacing: "0.5px", // 字母间距
};

// 使用相同属性进行测量
const { width } = measureText({
  text: "Hello", // 要测量的文本
  ...fontStyle, // 展开字体样式
});

// 使用相同样式进行渲染
return <div style={fontStyle}>Hello</div>;
```

**避免使用 padding 和 border：** 使用 `outline` 代替 `border` 以防止布局差异：

```tsx
{/* 使用 outline 代替 border */}
<div style={{ outline: "2px solid red" }}>Text</div>
```
