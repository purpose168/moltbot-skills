/**
 * Remotion 文本动画示例 - 打字机效果
 *
 * 本示例展示如何使用 Remotion 创建一个带有闪烁光标的打字机效果动画。
 * 文本逐字符显示，在特定文本后暂停，然后继续显示剩余文本。
 */

// 导入 Remotion 核心组件和函数
// - AbsoluteFill: 绝对定位的填充容器组件
// - interpolate: 插值函数，用于计算中间值
// - useCurrentFrame: 获取当前帧号的 Hook
// - useVideoConfig: 获取视频配置信息的 Hook
import {
	AbsoluteFill,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

// ==================== 颜色常量定义 ====================
// 白色背景
const COLOR_BG = '#ffffff';
// 黑色文本
const COLOR_TEXT = '#000000';

// ==================== 文本内容定义 ====================
// 完整的显示文本
const FULL_TEXT = 'From prompt to motion graphics. This is Remotion.';
// 暂停标记文本（在显示此文本后暂停）
const PAUSE_AFTER = 'From prompt to motion graphics.';

// ==================== 动画参数定义 ====================
// 字体大小：72px
const FONT_SIZE = 72;
// 字体粗细：700（粗体）
const FONT_WEIGHT = 700;
// 每个字符显示需要的帧数（控制打字速度）
const CHAR_FRAMES = 2;
// 光标闪烁周期（帧数）
const CURSOR_BLINK_FRAMES = 16;
// 暂停时长（秒）
const PAUSE_SECONDS = 1;

// 理想的合成尺寸：1280x720（标准 HD 分辨率）

/**
 * 计算当前应该显示的文本
 * 根据帧号计算打字机效果显示到哪个字符
 *
 * @param frame - 当前帧号
 * @param fullText - 完整文本内容
 * @param pauseAfter - 暂停标记文本（在显示此文本后暂停）
 * @param charFrames - 每个字符显示需要的帧数
 * @param pauseFrames - 暂停的帧数
 * @returns 返回当前应该显示的文本（截取到当前进度的部分）
 */
const getTypedText = ({
	frame,
	fullText,
	pauseAfter,
	charFrames,
	pauseFrames,
}: {
	frame: number;              // 当前帧号
	fullText: string;           // 完整文本内容
	pauseAfter: string;         // 暂停标记文本
	charFrames: number;         // 每个字符需要的帧数
	pauseFrames: number;        // 暂停帧数
}): string => {
	// 查找暂停标记文本在完整文本中的位置
	const pauseIndex = fullText.indexOf(pauseAfter);
	// 计算暂停点之前的字符长度（包括暂停标记文本）
	const preLen =
		pauseIndex >= 0 ? pauseIndex + pauseAfter.length : fullText.length;

	// 根据帧号确定当前应该显示的字符数
	let typedChars = 0;
	
	// 阶段 1：打字阶段（显示暂停标记之前的文本）
	if (frame < preLen * charFrames) {
		// 当前帧 / 每个字符帧数 = 已显示的字符数
		typedChars = Math.floor(frame / charFrames);
	} 
	// 阶段 2：暂停阶段
	else if (frame < preLen * charFrames + pauseFrames) {
		// 保持显示所有暂停标记之前的字符
		typedChars = preLen;
	} 
	// 阶段 3：继续打字阶段（显示剩余文本）
	else {
		// 计算暂停后的进度
		const postPhase = frame - preLen * charFrames - pauseFrames;
		// 暂停点字符数 + 后续显示的字符数
		typedChars = Math.min(
			fullText.length, // 不超过文本总长度
			preLen + Math.floor(postPhase / charFrames),
		);
	}
	
	// 返回截取到当前进度的文本
	return fullText.slice(0, typedChars);
};

/**
 * 光标组件
 * 显示闪烁的光标效果
 *
 * @param frame - 当前帧号
 * @param blinkFrames - 光标闪烁周期（帧数）
 * @param symbol - 光标符号（默认为 Unicode 字符 "\u258C"，一个垂直条）
 */
const Cursor: React.FC<{
	frame: number;
	blinkFrames: number;
	symbol?: string;  // 可选参数，光标符号
}> = ({frame, blinkFrames, symbol = '\u258C'}) => {
	// 计算光标透明度（实现闪烁效果）
	// 帧号对闪烁周期取模，得到当前在周期中的位置
	const opacity = interpolate(
		frame % blinkFrames,  // 当前在闪烁周期中的位置（0 到 blinkFrames）
		[0, blinkFrames / 2, blinkFrames],  // 插值输入范围
		[1, 0, 1],  // 插值输出范围：从完全不透明 -> 完全透明 -> 完全不透明
		{extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},  // 限制输出范围
	);

	// 返回带有透明度样式的光标元素
	return <span style={{opacity}}>{symbol}</span>;
};

/**
 * 主动画组件
 * 渲染完整的打字机效果动画
 */
export const MyAnimation = () => {
	// 获取当前帧号
	const frame = useCurrentFrame();
	// 获取视频配置（包含帧率 fps）
	const {fps} = useVideoConfig();

	// 将暂停时长从秒转换为帧数
	// 例如：fps=30，PAUSE_SECONDS=1，则 pauseFrames=30
	const pauseFrames = Math.round(fps * PAUSE_SECONDS);

	// 计算当前应该显示的文本
	const typedText = getTypedText({
		frame,                    // 当前帧号
		fullText: FULL_TEXT,     // 完整文本
		pauseAfter: PAUSE_AFTER, // 暂停标记文本
		charFrames: CHAR_FRAMES, // 每个字符帧数
		pauseFrames,             // 暂停帧数
	});

	// 返回渲染结果
	return (
		// AbsoluteFill：绝对填充组件，占满整个视频帧
		<AbsoluteFill
			style={{
				backgroundColor: COLOR_BG, // 白色背景
			}}
		>
			{/* 文本容器 */}
			<div
				style={{
					color: COLOR_TEXT,        // 黑色文本
					fontSize: FONT_SIZE,      // 72px 字体大小
					fontWeight: FONT_WEIGHT,  // 700 粗细
					fontFamily: 'sans-serif', // 无衬线字体
				}}
			>
				{/* 显示已打出的文本 */}
				<span>{typedText}</span>
				{/* 显示闪烁的光标 */}
				<Cursor frame={frame} blinkFrames={CURSOR_BLINK_FRAMES} />
			</div>
		</AbsoluteFill>
	);
};

// ==================== 代码说明 ====================
/**
 * 动画原理详解：
 *
 * 1. 打字机效果：
 *    - 使用 getTypedText() 函数根据当前帧号计算应该显示的字符数
 *    - 每个字符需要 CHAR_FRAMES 帧来显示
 *    - 使用 Math.floor() 确保字符数是整数
 *
 * 2. 暂停机制：
 *    - 找到 PAUSE_AFTER 文本在完整文本中的位置
 *    - 在显示完该文本后暂停 PAUSE_SECONDS
 *    - 使用 pauseFrames 变量控制暂停时长（从秒转换为帧）
 *
 * 3. 光标闪烁：
 *    - 使用 interpolate() 函数计算透明度
 *    - 帧号对 CURSOR_BLINK_FRAMES 取模得到周期性变化的值
 *    - 透明度在 1（完全不透明）和 0（完全透明）之间循环
 *
 * 4. 阶段划分：
 *    - 阶段 1（0 到 preLen*charFrames）：打字显示暂停标记之前的文本
 *    - 阶段 2（preLen*charFrames 到 preLen*charFrames+pauseFrames）：暂停
 *    - 阶段 3（之后）：继续显示剩余文本
 *
 * 参数调优建议：
 * - CHAR_FRAMES: 减小值会使打字速度更快
 * - PAUSE_SECONDS: 增加值会延长暂停时间
 * - CURSOR_BLINK_FRAMES: 减小值会使光标闪烁更快
 */

// 导出组件，供 Remotion 使用
export default MyAnimation;
