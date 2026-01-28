#!/usr/bin/env node

/**
 * DeepWiki CLI 工具
 * 
 * 此脚本用于通过 DeepWiki MCP 服务器访问 GitHub 仓库的文档。
 * 
 * 功能特性：
 * 1. 向仓库文档提问并获得 AI 驱动的回答
 * 2. 获取仓库文档的结构（目录）
 * 3. 读取特定路径的文档内容
 * 
 * 使用方法：
 *   node deepwiki.js ask <owner/repo> "问题"
 *   node deepwiki.js structure <owner/repo>
 *   node deepwiki.js contents <owner/repo> <路径>
 * 
 * 基础服务器：
 *   https://mcp.deepwiki.com/mcp（用于 SSE 连接）
 *   https://mcp.deepwiki.com（用于消息传输）
 */

const http = require('https');

// ============================================================================
// 全局变量定义
// ============================================================================

// 获取命令行参数
const args = process.argv.slice(2);
const command = args[0];      // 命令类型：ask, structure, contents
const repo = args[1];         // 仓库标识符，格式：owner/repo
const extra = args[2];        // 额外参数（问题或路径）

// DeepWiki SSE 服务器地址
const SSE_URL = 'https://mcp.deepwiki.com/sse';


// ============================================================================
// 辅助函数：显示使用帮助
// ============================================================================

/**
 * 显示命令行使用帮助信息
 */
function showUsage() {
  console.log('用法: deepwiki.js <命令> <仓库> [参数]');
  console.log('命令: ask, structure, contents');
  process.exit(0);
}


// ============================================================================
// 主函数：建立 SSE 连接并执行工具调用
// ============================================================================

async function run() {
  let sessionId = null;
  let messageUrl = null;
  
  // 步骤 1：建立 SSE（Server-Sent Events）连接
  const sseReq = http.get(SSE_URL, (res) => {
    let buffer = '';
    
    // 接收数据块并拼接到缓冲区
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // 解析 SSE 事件行
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留不完整的行等待下次处理
      
      let currentEvent = null;
      for (const line of lines) {
        // 事件类型行：event: <类型>
        if (line.startsWith('event: ')) {
          currentEvent = line.substring(7).trim();
        } 
        // 数据行：data: <内容>
        else if (line.startsWith('data: ')) {
          const data = line.substring(6).trim();
          
          // 处理端点事件：获取消息发送 URL
          if (currentEvent === 'endpoint') {
            messageUrl = 'https://mcp.deepwiki.com' + data;
            const url = new URL(messageUrl);
            sessionId = url.searchParams.get('sessionId');
            
            // 获取会话信息后，发送工具调用请求
            sendToolCall(messageUrl);
          } 
          // 处理消息事件：处理响应
          else if (currentEvent === 'message') {
            try {
              const msg = JSON.parse(data);
              // 检查是否是我们的请求响应（id: 1）
              if (msg.id === 1) {
                if (msg.error) {
                  console.error('错误：', msg.error.message);
                } else {
                  handleResult(msg.result);
                }
                // 销毁 SSE 连接并退出
                sseReq.destroy();
                process.exit(0);
              }
            } catch (e) {
              // 忽略非 JSON 或其他消息
            }
          }
        } 
        // 空行表示事件结束
        else if (line === '') {
          currentEvent = null;
        }
      }
    });
  });
  
  // 处理 SSE 连接错误
  sseReq.on('error', (err) => {
    console.error('SSE 错误：', err.message);
    process.exit(1);
  });
  
  // 设置 30 秒超时
  setTimeout(() => {
    console.error('请求超时');
    sseReq.destroy();
    process.exit(1);
  }, 30000);
}


// ============================================================================
// 工具调用函数
// ============================================================================

/**
 * 发送工具调用请求到 DeepWiki MCP 服务器
 * 
 * 参数:
 *   url: 消息发送的 URL
 */
function sendToolCall(url) {
  // 根据命令类型确定工具名称和参数
  let name, params;
  if (command === 'ask') {
    name = 'ask_question';
    params = { repoName: repo, question: extra };
  } else if (command === 'structure') {
    name = 'read_wiki_structure';
    params = { repoName: repo };
  } else if (command === 'contents') {
    name = 'read_wiki_contents';
    params = { repoName: repo, path: extra };
  }
  
  // 构建 JSON-RPC 2.0 格式的请求体
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name,
      arguments: params
    }
  });
  
  // 发送 POST 请求
  const req = http.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    }
  }, (res) => {
    // 检查响应状态码
    if (res.statusCode !== 200 && res.statusCode !== 202) {
      console.error(`POST 失败：${res.statusCode}`);
      process.exit(1);
    }
  });
  
  // 处理请求错误
  req.on('error', (err) => {
    console.error('请求错误：', err.message);
    process.exit(1);
  });
  
  // 发送请求体并结束请求
  req.write(body);
  req.end();
}


// ============================================================================
// 结果处理函数
// ============================================================================

/**
 * 处理并显示工具调用结果
 * 
 * 参数:
 *   result: API 返回的结果对象
 */
function handleResult(result) {
  if (result && result.content) {
    // 如果结果包含 content 字段，提取文本并打印
    console.log(result.content.map(c => c.text).join('\n'));
  } else {
    // 否则打印完整的 JSON 结果
    console.log(JSON.stringify(result, null, 2));
  }
}


// ============================================================================
// 程序入口
// ============================================================================

// 验证命令行参数
if (!command || !repo) {
  showUsage();
}

// 启动主函数
run();
