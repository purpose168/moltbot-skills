#!/usr/bin/env node

/**
 * Tavily 内容提取脚本
 * 
 * 此脚本用于通过 Tavily API 从指定 URLs 提取页面内容。
 * 
 * 功能特性：
 * - 支持批量提取多个 URL
 * - 返回页面的原始内容
 * - 报告提取失败的 URL
 * - 使用 Server-Sent Events (SSE) 进行实时响应
 * 
 * 使用方法：
 *   node extract.mjs "url1" ["url2" ...]
 * 
 * 环境变量：
 *   TAVILY_API_KEY - Tavily API 密钥（必需）
 */

// ============================================================================
// 辅助函数：显示使用帮助
// ============================================================================

/**
 * 显示命令行使用帮助信息
 */
function usage() {
  console.error(`用法: extract.mjs "url1" ["url2" ...]`);
  process.exit(2);
}

// ============================================================================
// 参数解析
// ============================================================================

// 获取命令行参数（跳过脚本名称）
const args = process.argv.slice(2);

// 过滤出 URL 参数（排除以 - 开头的选项）
const urls = args.filter(a => !a.startsWith("-"));

// 验证是否提供了 URL
if (urls.length === 0) {
  console.error("未提供 URL");
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
// 执行提取请求
// ============================================================================

// 向 Tavily API 发送 POST 提取请求
const resp = await fetch("https://api.tavily.com/extract", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    api_key: apiKey,
    urls: urls,
  }),
});

// 检查响应状态
if (!resp.ok) {
  const text = await resp.text().catch(() => "");
  throw new Error(`Tavily 提取失败 (${resp.status}): ${text}`);
}

// 解析响应数据
const data = await resp.json();

// ============================================================================
// 处理并输出结果
// ============================================================================

// 分离成功和失败的提取结果
const results = data.results ?? [];
const failed = data.failed_results ?? [];

// 遍历成功提取的结果并打印内容
for (const r of results) {
  const url = String(r?.url ?? "").trim();
  const content = String(r?.raw_content ?? "").trim();
  
  // 打印每个 URL 的标题和内容
  console.log(`# ${url}\n`);
  console.log(content || "(未提取到内容)");
  console.log("\n---\n");
}

// 如果有失败的提取，打印错误列表
if (failed.length > 0) {
  console.log("## 提取失败的 URL\n");
  for (const f of failed) {
    console.log(`- ${f.url}: ${f.error}`);
  }
}
