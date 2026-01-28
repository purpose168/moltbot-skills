---
name: lottie
description: 在 Remotion 中嵌入 Lottie 动画
metadata:
  category: Animation
---

# 在 Remotion 中使用 Lottie 动画

## 前置条件

首先，需要安装 @remotion/lottie 包。
如果尚未安装，请使用以下命令：

```bash
npx remotion add @remotion/lottie # 如果项目使用 npm
bunx remotion add @remotion/lottie # 如果项目使用 bun
yarn remotion add @remotion/lottie # 如果项目使用 yarn
pnpm exec remotion add @remotion/lottie # 如果项目使用 pnpm
```

## 显示 Lottie 文件

要导入 Lottie 动画：

- 获取 Lottie 资源
- 将加载过程包装在 `delayRender()` 和 `continueRender()` 中
- 将动画数据保存在状态中
- 使用 `@remotion/lottie` 包的 `Lottie` 组件渲染 Lottie 动画

```tsx
import {Lottie, LottieAnimationData} from '@remotion/lottie'; // 导入 Lottie 组件和类型
import {useEffect, useState} from 'react'; // 导入 React Hooks
import {cancelRender, continueRender, delayRender} from 'remotion'; // 导入渲染控制函数

export const MyAnimation = () => {
  // 创建延迟渲染句柄，用于跟踪加载状态
  const [handle] = useState(() => delayRender('Loading Lottie animation'));

  // 存储 Lottie 动画数据
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    // 获取 Lottie 动画数据
    fetch('https://assets4.lottiefiles.com/packages/lf20_zyquagfl.json')
      .then((data) => data.json()) // 解析 JSON 响应
      .then((json) => {
        setAnimationData(json); // 设置动画数据
        continueRender(handle); // 继续渲染
      })
      .catch((err) => {
        cancelRender(err); // 取消渲染并报告错误
      });
  }, [handle]); // 依赖句柄

  // 如果数据未加载完成，返回 null
  if (!animationData) {
    return null;
  }

  // 渲染 Lottie 动画
  return <Lottie animationData={animationData} />;
};
```

## 样式和动画

Lottie 支持 `style` 属性以允许样式设置：

```tsx
// 设置 Lottie 动画的样式
return <Lottie animationData={animationData} style={{width: 400, height: 400}} />;
```
