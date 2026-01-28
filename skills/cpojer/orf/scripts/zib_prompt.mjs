#!/usr/bin/env node

/**
 * ZiB 演播室图片提示生成器
 * 从 ORF 新闻项目生成 Nano Banana 图片提示
 */

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

/**
 * 选择隐藏的彩蛋元素
 * 基于新闻主题添加有趣的细节
 */
function pickEasterEggs(items) {
  const eggs = [];
  eggs.push("演播室摄像机上隐藏的小香蕉贴纸");
  eggs.push("放在侧桌上的小狮子毛绒玩具");

  const titles = items.map((i) => String(i.title || "")).join(" \n ").toLowerCase();

  // 政府相关
  if (/(regierung|parlament|wahl|koalition|kanzler|minister)/.test(titles)) {
    eggs.push("作为桌面装饰的微型议会大厦剪影");
  }

  // 国际事务相关
  if (/(eu|brüssel|nato|ukraine|russ|israel|gaza|usa|china)/.test(titles)) {
    eggs.push("带有几个微弱发光图钉的小地球仪（无标签）");
  }

  // 奥地利特色
  eggs.push("带有简单斑马图案的咖啡杯（无字母）");

  return eggs.slice(0, 4);
}

/**
 * 清理标题文本
 * 移除多余空白和特殊字符
 */
function headlineSnippet(rawTitle) {
  return String(rawTitle || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"');
}

/**
 * 分割标题
 * 提取主标题和副标题
 */
function splitTitle(rawTitle) {
  const title = headlineSnippet(rawTitle);
  const parts = title.split(":");
  if (parts.length < 2) return { lead: title, main: title };
  const lead = parts[0].trim();
  const main = parts.slice(1).join(":").trim();
  return { lead, main: main || lead };
}

/**
 * 提取标题片段
 * 生成用于面板的大写主题标签
 */
function headlineFragment(rawTitle) {
  const { lead, main } = splitTitle(rawTitle);
  const full = `${lead} ${main}`.toLowerCase();
  const t = main.toLowerCase();

  const pick = (frag) => frag.toUpperCase();

  // 特殊主题检测
  if (/(grönland|groenland|nuuk|kopenhagen)/.test(full)) return pick("GRÖNLAND");
  if (/(zoll|zölle|tarif)/.test(full)) return pick("ZÖLLE");
  if (/(nato)/.test(full)) return pick("NATO");
  if (/(kabul|anschlag|attentat)/.test(full)) return pick("KABUL");
  if (/(ukraine|ukrain|selenskyj)/.test(full)) return pick("UKRAINE");
  if (/(mercosur|abkommen|deal|freihandel)/.test(full)) return pick("EU-DEAL");
  if (/(china)/.test(full)) return pick("CHINA");
  if (/(iran)/.test(full)) return pick("IRAN");
  if (/(gaza|israel)/.test(full)) return pick("GAZA");

  // 德语停用词列表
  const stop = new Set([
    "zu",
    "und",
    "der",
    "die",
    "das",
    "den",
    "dem",
    "des",
    "ein",
    "eine",
    "einer",
    "einem",
    "eines",
    "im",
    "in",
    "am",
    "an",
    "auf",
    "bei",
    "nach",
    "von",
    "mit",
    "für",
    "über",
    "gegen",
  ]);

  // 后备方案：从主句中选择短名词
  const tokens = main
    .replace(/[""„‟]/g, "")
    .replace(/[()]/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !stop.has(w.toLowerCase()));

  let first = tokens[0] || "NEWS";

  // 处理 "G-7-Treffen" → "G-7"
  const gMatch = first.match(/^(G-?\d+)/i);
  if (gMatch) first = gMatch[1];

  // 保留非常短的标签（如 EU）+ 下一个词
  if (/^(EU|UNO|G-?\d+)$/i.test(first) && tokens[1]) {
    first = `${first} ${tokens[1]}`;
  }

  return pick(first || "NEWS");
}

/**
 * 生成副标题片段
 * 3-6 个词的德语新闻风格迷你标题
 */
function subtitleSnippet(rawTitle) {
  // 优先使用冒号后的主句，避免 "X 说：Y 说" 风格的重复
  const { main } = splitTitle(rawTitle);
  const title = headlineSnippet(main)
    .replace(/[–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const topic = headlineFragment(rawTitle);

  const rawWords = title
    .replace(/[:–—-]/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter(Boolean);

  // 副标题停用词列表
  const stop = new Set([
    "zu",
    "und",
    "der",
    "die",
    "das",
    "den",
    "dem",
    "des",
    "ein",
    "eine",
    "einer",
    "einem",
    "eines",
    "im",
    "in",
    "am",
    "an",
    // 在副标题中保留 "auf" / "bei"（它们通常承载含义）
    "nach",
    "von",
    "mit",
    "für",
    "über",
    "gegen",
    "sollen",
    "soll",
    "wird",
    "werden",
    "ist",
    "sind",
    "war",
    "waren",
  ]);

  // 如果主题词出现在副标题中，则移除它们
  const topicWords = topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter(Boolean);

  const words = rawWords
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => !stop.has(w.toLowerCase()))
    .filter((w) => !topicWords.includes(w.toLowerCase()))
    .slice(0, 6);

  // 确保至少 3 个词
  const finalWords = (words.length >= 3 ? words : rawWords.slice(0, 6)).slice(0, 6);

  return finalWords.join(" ");
}

/**
 * 生成故事面板描述
 * 为每个新闻项目创建独特的面板布局
 */
function storyPanel(item) {
  const title = String(item.title || "");
  const t = title.toLowerCase();
  const fragment = headlineFragment(title);
  const subtitle = subtitleSnippet(title);

  // 每个故事获得一个独特面板（图标 + 简短可读标题片段）
  // 避免重复通用世界地图，除非故事真正需要

  const layout = `面板内布局: 顶部: 大胆的全部大写主题标签 "${fragment}"。中部: 较小的 3-6 词迷你标题 "${subtitle}"。底部: 恰好 1-2 个简单图标（扁平、高对比度），无额外符号，无图表，无地图。`;

  // 欧盟贸易协议
  if (/(mercosur|freihandel|deal|abkommen)/.test(t) && /(eu|brüssel)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：握手图标 + 盖章文件图标`;
  }

  // 格陵兰
  if (/(grönland|groenland|nuuk|kopenhagen)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：冰山图标 + 巡逻船图标`;
  }

  // 关税/贸易
  if (/(zoll|zölle|tarif|drohung|drohungen|handel|sanktion)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：集装箱图标 + 硬币堆图标`;
  }

  // 北约
  if (/(nato)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：破碎盾牌图标 + 雷达扫描图标`;
  }

  // 乌克兰
  if (/(ukraine|ukrain|selenskyj|gefangene|gefangener|mörder|morde|mord)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：手铐图标 + 正义天平图标`;
  }

  // 喀布尔/袭击
  if (/(kabul|anschlag|attentat|explosion|restaurant)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：警告三角图标 + 餐厅餐盘图标`;
  }

  // 选举/政府
  if (/(wahl|parlament|regierung|koalition|minister|budget)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：投票箱图标 + 议会大厦图标`;
  }

  // 华为/电信
  if (/(huawei|zte|netz|netzen|5g|telekom|mobilfunk)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：天线塔图标 + 禁止标志图标`;
  }

  // 核电
  if (/(atomkraft|atomkraftwerk|akws|nuklear|reaktor)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：辐射符号图标 + 十字准星目标图标`;
  }

  // 墨西哥/美国引渡
  if (/(mexiko|usa)/.test(t) && /(liefert|ausliefert|ausliefer)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：手铐图标 + 飞机图标`;
  }

  // 特朗普/科技
  if (/(trump)/.test(t) && /(tech|bros|silicon|milliard)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：西装领带图标 + 电路板图标`;
  }

  // 国际事务
  if (/(eu|brüssel|usa|china|iran|gaza|israel|unganda|russ)/.test(t)) {
    return `专用面板（${layout}），恰好两个图标：地球仪图标 + 位置图钉图标`;
  }

  return `专用面板（${layout}），恰好一个图标：抽象突发新闻聚光灯图标`;
}

/**
 * 生成所有故事面板属性
 */
function storyProps(items) {
  return items.slice(0, 6).map(storyPanel);
}

/**
 * 主函数
 * 从 ORF JSON 生成完整的图片提示
 */
function main() {
  readStdin()
    .then((raw) => {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      const eggs = pickEasterEggs(items);
      const props = storyProps(items);

      const prompt = [
        "卡通插图，匹配非常独特的 ORF ZiB 演播室外观（不是通用新闻室）。",
        "摄像机构图：演播室全景镜头，主持人位于桌子中央，桌子占据画面下半部分。",
        "配色：主深海军蓝/午夜蓝和冷青色/蓝色照明，带有小的清晰红色点缀。高科技、干净、极简。",
        "场景设计提示（无徽标）：",
        "- 大型弧形环绕视频墙背景",
        "- 视频墙上突出显示主持人身后全景地球太空视野带（蓝色光晕）",
        "- 垂直 LED 光柱/面板分割背景",
        "- 带有微妙蓝色光条的深色光面反射地板/台阶",
        "桌面设计提示：",
        "- 大型椭圆形/弧形主持人桌子，带有光泽深色（玻璃状）顶部",
        "- 白色/浅灰色几何底座（切面），带蓝色底光",
        "- 靠近桌边有一条细的水平红色点缀线",
        "照明：冷演播室主光 + 蓝色环境光 + 微妙红色边缘点缀。",
        "风格：2D 卡通，清晰线条工作，柔和阴影，高细节，友好和愉悦。",
        "无徽标，无水印。",
        "演播室的环绕视频墙必须清楚地反映您拉取的特定新闻。",
        "在墙上显示 4-6 个不同的面板/卡片（每个标题一个）。每个面板必须干净可读：",
        "- 顶部：大的粗体全部大写主题标签（2-3 个词）",
        "- 中部：较小的 3-6 词迷你标题（新闻风格）",
        "- 底部：恰好 1-2 个简单图标（无地图，无繁忙拼贴）",
        ...props.map((p) => `- ${p}`),
        "添加 3-4 个微妙的彩蛋以奖励仔细检查（无徽标）：",
        ...eggs.map((e) => `- ${e}`),
        "避免体育图像。",
      ].join("\n");

      process.stdout.write(prompt + "\n");
    })
    .catch((err) => {
      process.stderr.write(String(err?.stack ?? err));
      process.stderr.write("\n");
      process.exitCode = 1;
    });
}

main();
