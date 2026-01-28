#!/usr/bin/env node

/**
 * Tavily 搜索脚本
 * 
 * 此脚本用于通过 Tavily API 执行网络搜索，返回适合 AI 智能体的简洁、相关结果。
 * 
 * 功能特性：
 * - 支持基本和高级两种搜索深度
 * - 支持通用搜索和新闻搜索两种主题
 * - 自动格式化输出，包括 AI 生成的答案和相关来源
 * - 支持结果数量控制和日期过滤
 * 
 * 使用方法：
 *   node search.mjs "查询词" [-n 数量] [--deep] [--topic general|news] [--days 天数]
 * 
 * 环境变量：
 *   TAVILY_API_KEY - Tavily API 密钥（必需）
 */

// ============================================================================
// 辅助函数：显示使用帮助
// ============================================================================

/**
 * 显示命令行使用帮助信息
 * 当参数不正确或请求帮助时调用此函数
 */
function usage() {
  console.error(`用法: search.mjs "查询词" [-n 5] [--deep] [--topic general|news] [--days 7]`);
  process.exit(2);
}

// ============================================================================
// 参数解析
// ============================================================================

// 获取命令行参数（跳过脚本名称）
const args = process.argv.slice(2);

// 如果没有参数或请求帮助，显示使用说明
if (args.length === 0 || args[0] === "-h" || args[0] === "--help") usage();

// 解析必需参数：查询词
const query = args[0];

// 解析可选参数
let n = 5;                    // 结果数量，默认5
let searchDepth = "basic";    // 搜索深度，默认基本搜索
let topic = "general";        // 搜索主题，默认通用
let days = null;              // 新闻日期过滤，默认无限制

// 遍历参数列表进行解析
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  
  // -n <数量>：设置返回结果数量
  if (a === "-n") {
    n = Number.parseInt(args[i + 1] ?? "5", 10);
    i++;
    continue;
  }
  
  // --deep：使用高级搜索（更深入但更慢）
  if (a === "--deep") {
    searchDepth = "advanced";
    continue;
  }
  
  // --topic <主题>：设置搜索主题（general 或 news）
  if (a === "--topic") {
    topic = args[i + 1] ?? "general";
    i++;
    continue;
  }
  
  // --days <天数>：新闻搜索的时间范围限制
  if (a === "--days") {
    days = Number.parseInt(args[i + 1] ?? "7", 10);
    i++;
    continue;
  }
  
  // 未知参数，报错并显示帮助
  console.error(`未知参数: ${a}`);
  usage();
}

// ============================================================================
// API 密钥验证
// ============================================================================

// 从环境变量获取 Tavily API 密钥
const apiKey = (process.env.TAVILY_API_KEY ?? "").trim();

// 验证 API 密钥是否设置
if (!apiKey) {
  console.error("缺少 TAVILY_API_KEY 环境变量");
  process.exit(1);
}

// ============================================================================
// 构建请求体
// ============================================================================

// 准备 Tavily API 请求参数
const body = {
  api_key: apiKey,              // API 密钥
  query: query,                 // 搜索查询词
  search_depth: searchDepth,    // 搜索深度（basic 或 advanced）
  topic: topic,                 // 搜索主题（general 或 news）
  max_results: Math.max(1, Math.min(n, 20)),  // 结果数量限制（1-20之间）
  include_answer: true,         // 请求 AI 生成的答案
  include_raw_content: false,   // 不请求原始页面内容
};

// 如果是新闻搜索且指定了日期范围，添加到请求体
if (topic === "news" && days) {
  body.days = days;
}

// ============================================================================
// 执行搜索请求
// ============================================================================

// 向 Tavily API 发送 POST 请求
const resp = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

// 检查响应状态
if (!resp.ok) {
  const text = await resp.text().catch(() => "");
  throw new Error(`Tavily 搜索失败 (${resp.status}): ${text}`);
}

// 解析响应数据
const data = await resp.json();

// ============================================================================
// 输出结果
// ============================================================================

// 如果 AI 生成了答案，首先打印答案部分
if (data.answer) {
  console.log("## 答案\n");
  console.log(data.answer);
  console.log("\n---\n");
}

// 打印来源列表
const results = (data.results ?? []).slice(0, n);
console.log("## 来源\n");

// 遍历每个搜索结果并格式化输出
for (const r of results) {
  // 提取并清理结果字段
  const title = String(r?.title ?? "").trim();
  const url = String(r?.url ?? "").trim();
  const content = String(r?.content ?? "").trim();
  // 计算相关性分数（如果有）
  const score = r?.score ? ` (相关性: ${(r.score * 100).toFixed(0)}%)` : "";
  
  // 跳过无效结果（缺少标题或URL）
  if (!title || !url) continue;
  
  // 打印结果标题（带相关性分数）
  console.log(`- **${title}**${score}`);
  // 打印 URL
  console.log(`  ${url}`);
  // 如果有内容摘要，打印前300字符
  if (content) {
    console.log(`  ${content.slice(0, 300)}${content.length > 300 ? "..." : ""}`);
  }
  console.log();
}
