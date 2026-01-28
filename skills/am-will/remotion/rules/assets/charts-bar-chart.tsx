/**
 * Remotion 图表动画示例 - 动态条形图
 *
 * 本示例展示如何使用 Remotion 创建一个带有动画效果的动态条形图。
 * 图表显示 2024 年黄金价格数据，每个条形以交错方式从下往上生长。
 */

// 导入 Google Fonts 加载函数，用于加载 Inter 字体
import {loadFont} from '@remotion/google-fonts/Inter';
// 导入 Remotion 核心组件和 Hooks
// - AbsoluteFill: 绝对定位的填充容器组件
// - spring: 弹簧动画函数，用于创建自然的动画效果
// - useCurrentFrame: 获取当前帧号的 Hook
// - useVideoConfig: 获取视频配置信息的 Hook
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// 加载 Inter 字体并获取字体族名称
const {fontFamily} = loadFont();

// ==================== 颜色常量定义 ====================
// 金色 - 用于条形图的主要颜色
const COLOR_BAR = '#D4AF37';
// 白色 - 用于主要文本颜色
const COLOR_TEXT = '#ffffff';
// 灰色 - 用于次要文本和标签颜色
const COLOR_MUTED = '#888888';
// 深色背景 - 图表背景色
const COLOR_BG = '#0a0a0a';
// 轴线颜色 - 用于 X 轴和 Y 轴的刻度线
const COLOR_AXIS = '#333333';

// 理想的合成尺寸：1280x720（标准 HD 分辨率）

/**
 * 标题组件
 * 用于显示图表的主标题
 *
 * @param children - 标题文本内容（React 节点）
 */
const Title: React.FC<{children: React.ReactNode}> = ({children}) => (
	// 居中对齐的容器，底部留出 40px 边距
	<div style={{textAlign: 'center', marginBottom: 40}}>
		{/* 标题文本样式：白色、48px 大小、中等粗细 */}
		<div style={{color: COLOR_TEXT, fontSize: 48, fontWeight: 600}}>
			{children}
		</div>
	</div>
);

/**
 * Y轴组件（垂直轴）
 * 显示价格刻度值
 *
 * @param steps - 刻度值数组（例如 [2000, 2400, 2800]）
 * @param height - 图表高度
 */
const YAxis: React.FC<{steps: number[]; height: number}> = ({
	steps,
	height,
}) => (
	// 垂直弹性布局容器，刻度值均匀分布
	<div
		style={{
			display: 'flex',
			flexDirection: 'column', // 垂直方向排列
			justifyContent: 'space-between', // 两端对齐，刻度值均匀分布
			height, // 容器高度与图表高度一致
			paddingRight: 16, // 右侧留出 16px 内边距
		}}
	>
		{/* 反转刻度数组，使最大值显示在顶部 */}
		{steps
			.slice() // 创建数组副本，避免修改原数组
			.reverse() // 反转数组顺序
			.map((step) => ( // 遍历每个刻度值
				<div
					key={step} // 使用刻度值作为唯一标识
					style={{
						color: COLOR_MUTED, // 灰色文本
						fontSize: 20, // 20px 字体大小
						textAlign: 'right', // 右对齐
					}}
				>
					{/* 使用本地化格式显示数字（如 2,000） */}
					{step.toLocaleString()}
				</div>
			))}
	</div>
);

/**
 * 条形组件
 * 单个条形的渲染组件
 *
 * @param height - 条形的高度
 * @param progress - 动画进度（0-1），控制条形的透明度
 */
const Bar: React.FC<{
	height: number;
	progress: number;
}> = ({height, progress}) => (
	// 垂直弹性布局容器，条形从底部向上生长
	<div
		style={{
			flex: 1, // 占据等宽空间
			display: 'flex',
			flexDirection: 'column', // 垂直方向排列
			justifyContent: 'flex-end', // 子元素靠底部对齐（条形从底部生长）
		}}
	>
		{/* 条形主体 */}
		<div
			style={{
				width: '100%', // 宽度占满容器
				height, // 条形高度（动态计算）
				backgroundColor: COLOR_BAR, // 金色背景
				borderRadius: '8px 8px 0 0', // 顶部圆角（8px）
				opacity: progress, // 透明度随动画进度变化
			}}
		/>
	</div>
);

/**
 * X轴组件（水平轴）
 * 显示月份标签和条形
 *
 * @param children - 条形组件数组
 * @param labels - 月份标签数组（如 ['Jan', 'Mar', 'May']）
 * @param height - 图表高度
 */
const XAxis: React.FC<{
	children: React.ReactNode;
	labels: string[];
	height: number;
}> = ({children, labels, height}) => (
	// 垂直弹性布局容器
	<div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
		{/* 条形区域：包含条形和轴线 */}
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-end', // 子元素靠底部对齐
				gap: 16, // 条形之间的间距
				height, // 高度与图表高度一致
				borderLeft: `2px solid ${COLOR_AXIS}`, // 左侧轴线
				borderBottom: `2px solid ${COLOR_AXIS}`, // 底部轴线
				paddingLeft: 16, // 左侧内边距
			}}
		>
			{children}
		</div>
		{/* 标签区域：显示月份名称 */}
		<div
			style={{
				display: 'flex',
				gap: 16, // 标签之间的间距
				paddingLeft: 16, // 左侧内边距，与条形区域对齐
				marginTop: 12, // 顶部边距
			}}
		>
			{labels.map((label) => ( // 遍历月份标签
				<div
					key={label} // 使用月份作为唯一标识
					style={{
						flex: 1, // 等宽分布
						textAlign: 'center', // 居中对齐
						color: COLOR_MUTED, // 灰色文本
						fontSize: 20, // 20px 字体大小
					}}
				>
					{label}
				</div>
			))}
		</div>
	</div>
);

/**
 * 主动画组件
 * 渲染完整的动态条形图
 */
export const MyAnimation = () => {
	// 获取当前帧号（从 0 开始）
	const frame = useCurrentFrame();
	// 获取视频配置（包含帧率 fps 和高度 height 等）
	const {fps, height} = useVideoConfig();

	// ==================== 数据定义 ====================
	// 2024 年黄金价格数据（月度数据）
	const data = [
		{month: 'Jan', price: 2039}, // 1 月：$2,039
		{month: 'Mar', price: 2160}, // 3 月：$2,160
		{month: 'May', price: 2327}, // 5 月：$2,327
		{month: 'Jul', price: 2426}, // 7 月：$2,426
		{month: 'Sep', price: 2634}, // 9 月：$2,634
		{month: 'Nov', price: 2672}, // 11 月：$2,672
	];

	// ==================== 计算参数 ====================
	// 最小价格（用于计算条形高度的基准）
	const minPrice = 2000;
	// 最大价格
	const maxPrice = 2800;
	// 价格范围
	const priceRange = maxPrice - minPrice;
	// 图表高度 = 视频高度 - 280px（预留标题、标签和边距空间）
	const chartHeight = height - 280;
	// Y轴刻度值
	const yAxisSteps = [2000, 2400, 2800];

	// 返回渲染结果
	return (
		// AbsoluteFill：绝对填充组件，占满整个视频帧
		<AbsoluteFill
			style={{
				backgroundColor: COLOR_BG, // 深色背景
				padding: 60, // 四周留出 60px 边距
				display: 'flex',
				flexDirection: 'column', // 垂直方向排列：标题在上，图表在下
				fontFamily, // 使用 Inter 字体
			}}
		>
			{/* 标题：显示 "Gold Price 2024" */}
			<Title>Gold Price 2024</Title>

			{/* 图表主体区域 */}
			<div style={{display: 'flex', flex: 1}}>
				{/* Y轴：显示价格刻度 */}
				<YAxis steps={yAxisSteps} height={chartHeight} />
				{/* X轴：包含条形和月份标签 */}
				<XAxis height={chartHeight} labels={data.map((d) => d.month)}>
					{/* 遍历数据，渲染每个条形 */}
					{data.map((item, i) => {
						// 计算弹簧动画进度
						// 每个条形延迟 5 帧，总延迟 10 帧（错开动画效果）
						const progress = spring({
							frame: frame - i * 5 - 10, // 当前帧减去延迟
							fps, // 帧率
							config: {damping: 18, stiffness: 80}, // 弹簧动画配置
							// damping: 阻尼系数，控制动画衰减速度（值越小弹跳越明显）
							// stiffness: 刚度系数，控制弹簧硬度（值越大回弹越快）
						});

						// 计算条形高度
						// 公式：(价格 - 最小值) / 价格范围 * 图表高度 * 动画进度
						const barHeight =
							((item.price - minPrice) / priceRange) * chartHeight * progress;

						// 渲染条形组件
						return (
							<Bar key={item.month} height={barHeight} progress={progress} />
						);
					})}
				</XAxis>
			</div>
		</AbsoluteFill>
	);
};

// ==================== 代码说明 ====================
/**
 * 动画原理：
 *
 * 1. 使用 useCurrentFrame() 获取当前帧号
 * 2. 使用 spring() 函数创建弹簧动画效果
 * 3. 每个条形的动画有 5 帧的延迟，产生错落效果
 * 4. 条形高度根据价格数据动态计算
 *
 * 弹簧动画配置说明：
 * - damping (阻尼): 控制动画的衰减程度
 *   - 值越大，动画停止越快
 *   - 值越小，弹跳效果越明显
 * - stiffness (刚度): 控制弹簧的硬度
 *   - 值越大，弹簧越硬，回弹越快
 *   - 值越小，弹簧越软，动作越慢
 *
 * 在本例中：
 * - damping: 18 - 轻微的弹跳效果
 * - stiffness: 80 - 适中的回弹速度
 */

// 导出组件，供 Remotion 使用
export default MyAnimation;
