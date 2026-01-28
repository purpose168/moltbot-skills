/**
 * 使用 Hume AI 进行文本转语音的脚本
 * 
 * 本脚本使用 Hume AI API 将文本转换为语音并生成 MP3 音频文件。
 * 支持通过命令行参数指定文本内容、输出路径和语音 ID。
 */

// ==================== 模块导入 ====================
// 导入 Node.js 文件系统模块，用于读写文件
import fs from 'fs';
// 导入路径模块，用于处理文件路径
import path from 'path';
// 导入 commander 库，用于解析命令行参数
import { program } from 'commander';

// ==================== 命令行参数配置 ====================
// 使用 commander 库配置命令行参数

// 配置必需参数和可选参数
program
  // 必需参数：-t, --text <text> - 要转换为语音的文本内容
  .requiredOption('-t, --text <text>', '要转换为语音的文本')
  // 必需参数：-o, --output <path> - 输出文件的路径
  .requiredOption('-o, --output <path>', '输出文件路径（例如：output.mp3）')
  // 可选参数：-v, --voice <voice> - 语音 ID（默认值：预设的语音 ID）
  .option('-v, --voice <voice>', '要使用的语音 ID', '9e1f9e4f-691a-4bb0-b87c-e306a4c838ef')
  // 解析命令行参数
  .parse(process.argv);

// 获取解析后的选项
const options = program.opts();

/**
 * 主函数 - 生成语音音频
 * 
 * 此函数执行以下步骤：
 * 1. 检查 HUME_API_KEY 环境变量是否已设置
 * 2. 调用 Hume AI TTS API 将文本转换为语音
 * 3. 将返回的 Base64 编码音频解码并保存为 MP3 文件
 * 4. 打印输出文件的绝对路径
 */
async function main() {
  // 从环境变量获取 Hume API 密钥
  const apiKey = process.env.HUME_API_KEY;

  // 检查 API 密钥是否已设置
  if (!apiKey) {
    // 如果未设置，打印错误信息并退出程序
    console.error('错误：必须设置 HUME_API_KEY 环境变量。');
    process.exit(1);
  }

  try {
    // 打印日志，显示正在处理的文本（截取前 50 个字符）
    console.log(`正在通过 Hume AI 为以下文本生成语音："${options.text.substring(0, 50)}..."`);
    
    // 调用 Hume AI TTS API
    const response = await fetch('https://api.hume.ai/v0/tts', {
      method: 'POST',  // 使用 HTTP POST 请求
      headers: {
        'X-Hume-Api-Key': apiKey,  // API 密钥认证头
        'Content-Type': 'application/json'  // 内容类型为 JSON
      },
      // 请求体：包含要转换的文本和语音配置
      body: JSON.stringify({
        utterances: [
          {
            text: options.text,  // 要转换的文本
            voice: {
              id: options.voice  // 语音 ID
            }
          }
        ]
      })
    });

    // 检查响应状态
    if (!response.ok) {
      // 如果响应不成功，读取错误信息并抛出异常
      const errorText = await response.text();
      throw new Error(`Hume API 错误（${response.status}）：${errorText}`);
    }

    // 解析 JSON 响应
    const json = await response.json();
    
    // 检查是否返回了音频数据
    if (!json.generations || json.generations.length === 0) {
      throw new Error('Hume API 未返回任何音频生成。');
    }

    // 提取 Base64 编码的音频数据
    const base64Audio = json.generations[0].audio;
    
    // 将 Base64 音频数据解码为 Buffer
    const buffer = Buffer.from(base64Audio, 'base64');
    
    // 将音频数据写入输出文件
    await fs.promises.writeFile(options.output, buffer);
    
    // 获取输出文件的绝对路径
    const absolutePath = path.resolve(options.output);
    
    // 打印保存成功的消息
    console.log(`音频已保存：${absolutePath}`);
    
    // 打印 MEDIA 行，供其他工具提取文件路径
    console.log(`MEDIA：${absolutePath}`);
  } catch (error) {
    // 捕获并处理错误
    console.error('使用 Hume 生成语音时出错：', error);
    process.exit(1);
  }
}

// 调用主函数执行语音生成
main();

// ==================== 使用说明 ====================
//
// 运行此脚本前需要设置以下环境变量：
//   HUME_API_KEY - Hume AI API 密钥
//   HUME_SECRET_KEY - Hume AI 密钥（某些 API 调用可能需要）
//
// 使用示例：
//   HUME_API_KEY="your-api-key" node generate_hume_speech.js --text "你好，世界！" --output "hello.mp3"
//
// 可选参数：
//   --voice - 指定语音 ID（默认为 9e1f9e4f-691a-4bb0-b87c-e306a4c838ef）
//
// 输出：
//   脚本会在控制台打印 MEDIA: /path/to/output.mp3
//   其他工具可以通过解析这行输出来获取生成的文件路径
