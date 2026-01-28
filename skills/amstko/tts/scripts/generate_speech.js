/**
 * 使用 OpenAI 进行文本转语音的脚本
 * 
 * 本脚本使用 OpenAI API 将文本转换为语音并生成 MP3 音频文件。
 * 支持通过命令行参数指定文本内容、输出路径、语音类型和模型。
 */

// ==================== 模块导入 ====================
// 导入 Node.js 文件系统模块，用于读写文件
import fs from 'fs';
// 导入路径模块，用于处理文件路径
import path from 'path';
// 导入 OpenAI 官方 SDK
import OpenAI from 'openai';
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
  // 可选参数：-v, --voice <voice> - 语音类型（默认值：nova）
  .option('-v, --voice <voice>', '要使用的语音（alloy、echo、fable、onyx、nova、shimmer）', 'nova')
  // 可选参数：-m, --model <model> - TTS 模型（默认值：tts-1）
  .option('-m, --model <model>', '要使用的模型（tts-1、tts-1-hd）', 'tts-1')
  // 解析命令行参数
  .parse(process.argv);

// 获取解析后的选项
const options = program.opts();

/**
 * 主函数 - 生成语音音频
 * 
 * 此函数执行以下步骤：
 * 1. 检查 OPENAI_API_KEY 环境变量是否已设置
 * 2. 初始化 OpenAI 客户端
 * 3. 调用 OpenAI TTS API 将文本转换为语音
 * 4. 将返回的音频数据保存为 MP3 文件
 * 5. 打印输出文件的绝对路径
 */
async function main() {
  // 从环境变量获取 OpenAI API 密钥
  const apiKey = process.env.OPENAI_API_KEY;
  
  // 检查 API 密钥是否已设置
  if (!apiKey) {
    // 如果未设置，打印错误信息并退出程序
    console.error('错误：未设置 OPENAI_API_KEY 环境变量。');
    process.exit(1);
  }

  // 初始化 OpenAI 客户端
  const openai = new OpenAI({ apiKey });

  try {
    // 打印日志，显示正在处理的文本（截取前 50 个字符）
    console.log(`正在为以下文本生成语音："${options.text.substring(0, 50)}..."`);
    
    // 调用 OpenAI TTS API 生成语音
    const mp3 = await openai.audio.speech.create({
      model: options.model,    // TTS 模型（tts-1 或 tts-1-hd）
      voice: options.voice,    // 语音类型
      input: options.text,     // 要转换为语音的文本
    });

    // 将音频流转换为 Buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
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
    console.error('生成语音时出错：', error);
    process.exit(1);
  }
}

// 调用主函数执行语音生成
main();

// ==================== 语音类型说明 ====================
//
// OpenAI 提供以下语音类型：
//   - alloy - 合金音色，中性且多功能
//   - echo - 回声音色，稍带金属感
//   - fable - 寓言音色，叙述性强
//   - onyx - 缟玛瑙音色，低沉有力
//   - nova - 新星音色，清晰明亮（默认）
//   - shimmer - 微光音色，轻盈透明
//
// 适用场景建议：
//   - 叙述性内容：alloy、fable
//   - 有力/正式内容：onyx
//   - 友好/轻快内容：nova、shimmer
//   - 特殊效果：echo

// ==================== 模型说明 ====================
//
// OpenAI 提供以下 TTS 模型：
//   - tts-1 - 标准模型，延迟较低，适合实时应用
//   - tts-1-hd - 高清模型，质量更好但延迟较高
//
// 选择建议：
//   - 实时应用：tts-1
//   - 最终输出：tts-1-hd

// ==================== 使用说明 ====================
//
// 运行此脚本前需要设置以下环境变量：
//   OPENAI_API_KEY - OpenAI API 密钥
//
// 使用示例：
//   OPENAI_API_KEY="your-api-key" node generate_speech.js --text "你好，世界！" --output "hello.mp3"
//
// 可选参数：
//   --voice - 指定语音类型（默认为 nova）
//   --model - 指定 TTS 模型（默认为 tts-1）
//
// 输出：
//   脚本会在控制台打印 MEDIA: /path/to/output.mp3
//   其他工具可以通过解析这行输出来获取生成的文件路径
