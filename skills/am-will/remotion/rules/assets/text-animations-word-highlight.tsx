/**
 * Remotion 文本动画示例 - 单词高亮效果
 *
 * 本示例展示如何使用 Remotion 创建一个带有弹簧动画擦拭效果的单词高亮动画。
 * 高亮效果从左到右扫过指定单词，像荧光笔一样。
 */

// 导入 Google Fonts 加载函数，用于加载 Inter 字体
import {loadFont} from '@remotion/google-fonts/Inter';
// 导入 React 核心库
import React from 'react';
// 导入 Remotion 核心组件和函数
// - AbsoluteFill: 绝对定位的填充容器组件
// - spring: 弹簧动画函数，用于创建自然的动画效果
// - useCurrentFrame: 获取当前帧号的 Hook
// - useVideoConfig: 获取视频配置信息的 Hook
import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

/**
 * 单词高亮效果组件
 * 使用弹簧动画实现从左到右的擦拭高亮效果
 *
 * @param word - 要高亮的单词
 * @param color - 高亮背景颜色
 * @param delay - 动画开始延迟（帧数）
 * @param durationInFrames - 动画持续时间（帧数）
 */

// 理想的合成尺寸：1280x720（标准 HD 分辨率）

// ==================== 颜色常量定义 ====================
// 白色背景
const COLOR_BG = '#ffffff';
// 黑色文本
const COLOR_TEXT = '#000000';
// 高亮颜色：浅蓝色（#A7C7E7）- 类似荧光笔效果
const COLOR_HIGHLIGHT = '#A7C7E7';

// ==================== 文本内容定义 ====================
// 完整的显示文本
const FULL_TEXT = 'This is Remotion.';
// 需要高亮的单词
const HIGHLIGHT_WORD = 'Remotion';

// ==================== 动画参数定义 ====================
// 字体大小：72px
const FONT_SIZE = 72;
// 字体粗细：700（粗体）
const FONT_WEIGHT = 700;
// 高亮动画开始帧号（在第 30 帧开始）
const HIGHLIGHT_START_FRAME = 30;
// 高亮擦拭动画持续时间（帧数）
const HIGHLIGHT_WIPE_DURATION = 18;

// 加载 Inter 字体并获取字体族名称
const {fontFamily} = loadFont();

/**
 * 高亮组件
 * 渲染带有弹簧动画效果的高亮背景
 *
 * @param word - 要高亮的单词文本
 * @param color - 高亮背景颜色
 * @param delay - 动画开始延迟（帧数）
 * @param durationInFrames - 动画持续时间（帧数）
 */
const Highlight: React.FC<{
	word: string;          // 要高亮的单词
	color: string;         // 高亮背景颜色
	delay: number;         // 动画延迟（帧数）
	durationInFrames: number; // 动画持续时间（帧数）
}> = ({word, color, delay, durationInFrames}) => {
	// 获取当前帧号
	const frame = useCurrentFrame();
	// 获取视频配置（包含帧率 fps）
	const {fps} = useVideoConfig();

	// 计算弹簧动画进度
	// 使用 spring() 函数创建自然的动画效果
	const highlightProgress = spring({
		fps,                 // 帧率，用于计算动画时间
		frame,               // 当前帧号
		config: {damping: 200}, // 弹簧配置：阻尼系数 200（无弹跳，平滑效果）
		delay,               // 动画开始延迟（帧数）
		durationInFrames,    // 动画持续时间（帧数）
	});

	// 计算 X 轴缩放比例
	// 弹簧输出值通常在 0 到 1 之间（可能略有超出）
	// 使用 Math.max(0, Math.min(1, ...)) 限制在 0-1 范围内
	const scaleX = Math.max(0, Math.min(1, highlightProgress));

	// 返回渲染结果
	return (
		// 使用 relative 定位的 span 容器
		<span style={{position: 'relative', display: 'inline-block'}}>
			{/* 高亮背景层 - 使用 absolute 定位 */}
			<span
				style={{
					position: 'absolute',   // 绝对定位
					left: 0,               // 左边距 0
					right: 0,              // 右边距 0（与左边距配合使宽度占满容器）
					top: '50%',            // 垂直居中（50%）
					height: '1.05em',      // 高度为 1.05em（略高于文字高度）
					// 变换：垂直居中 + X轴缩放
					// translateY(-50%): 向上偏移自身高度的一半，实现垂直居中
					// scaleX(scaleX): X轴缩放，控制高亮从左到右的擦拭效果
					transform: `translateY(-50%) scaleX(${scaleX})`,
					transformOrigin: 'left center', // 变换原点设在左边中心（从左向右展开）
					backgroundColor: color,  // 高亮背景颜色
					borderRadius: '0.18em', // 圆角（0.18em，柔和效果）
					zIndex: 0,              // 层级 0（在文字下方）
				}}
			/>
			{/* 文字层 - 使用 relative 定位，使其在高亮背景上方 */}
			<span style={{position: 'relative', zIndex: 1}}>{word}</span>
		</span>
	);
};

/**
 * 主动画组件
 * 渲染完整的单词高亮动画
 */
export const MyAnimation = () => {
	// 查找高亮单词在完整文本中的起始位置
	const highlightIndex = FULL_TEXT.indexOf(HIGHLIGHT_WORD);
	// 判断是否找到高亮单词（index >= 0 表示找到）
	const hasHighlight = highlightIndex >= 0;

	// 提取高亮单词之前的文本
	const preText = hasHighlight ? FULL_TEXT.slice(0, highlightIndex) : FULL_TEXT;
	// 提取高亮单词之后的文本
	const postText = hasHighlight
		? FULL_TEXT.slice(highlightIndex + HIGHLIGHT_WORD.length) // 跳过整个高亮单词
		: ''; // 如果没有高亮词，postText 为空字符串

	// 返回渲染结果
	return (
		// AbsoluteFill：绝对填充组件，占满整个视频帧
		<AbsoluteFill
			style={{
				backgroundColor: COLOR_BG, // 白色背景
				alignItems: 'center',      // 水平居中对齐
				justifyContent: 'center',  // 垂直居中对齐
				fontFamily,                // 使用 Inter 字体
			}}
		>
			{/* 文本容器 */}
			<div
				style={{
					color: COLOR_TEXT,        // 黑色文本
					fontSize: FONT_SIZE,      // 72px 字体大小
					fontWeight: FONT_WEIGHT,  // 700 粗细
				}}
			>
				{/* 根据是否有高亮单词进行条件渲染 */}
				{hasHighlight ? (
					<>
						{/* 高亮单词之前的文本 */}
						<span>{preText}</span>
						{/* 高亮单词组件 */}
						<Highlight
							word={HIGHLIGHT_WORD}            // 要高亮的单词
							color={COLOR_HIGHLIGHT}         // 高亮颜色
							delay={HIGHLIGHT_START_FRAME}   // 动画开始延迟
							durationInFrames={HIGHLIGHT_WIPE_DURATION} // 动画持续时间
						/>
						{/* 高亮单词之后的文本 */}
						<span>{postText}</span>
					</>
				) : (
					// 如果没有找到高亮单词，显示完整文本（不进行高亮）
					<span>{FULL_TEXT}</span>
				)}
			</div>
		</AbsoluteFill>
	);
};

// ==================== 代码说明 ====================
/**
 * 动画原理详解：
 *
 * 1. 弹簧动画效果：
 *    - 使用 spring() 函数创建自然的动画进度
 *    - damping: 200 表示无弹跳的平滑动画
 *    - delay: 控制动画开始时间
 *    - durationInFrames: 控制动画持续时间
 *
 * 2. 高亮背景实现：
 *    - 使用绝对定位的 span 作为背景层
 *    - 高度设置为 1.05em，略大于文字高度
 *    - 使用 borderRadius 创建圆角效果
 *    - transform: translateY(-50%) 实现垂直居中
 *
 * 3. 擦拭效果：
 *    - 使用 scaleX() 实现从左到右的展开效果
 *    - transformOrigin: 'left center' 设置变换原点为左边
 *    - 弹簧动画进度控制 scaleX 的值（0 到 1）
 *
 * 4. 文字层级管理：
 *    - 背景层 zIndex: 0
 *    - 文字层 zIndex: 1（更高）
 *    - 文字使用 relative 定位，覆盖在背景层上方
 *
 * 5. 文本分割：
 *    - 使用 indexOf() 找到高亮单词的位置
 *    - 使用 slice() 分割文本为 preText 和 postText
 *    - 条件渲染实现文本 + 高亮 + 文本的效果
 *
 * 参数调优建议：
 * - HIGHLIGHT_START_FRAME: 增大延迟动画开始时间
 * - HIGHLIGHT_WIPE_DURATION: 增大使高亮动画更慢
 * - COLOR_HIGHLIGHT: 更改高亮背景颜色
 * - borderRadius: 增大圆角值使背景更圆
 */

// 导出组件，供 Remotion 使用
export default MyAnimation;
