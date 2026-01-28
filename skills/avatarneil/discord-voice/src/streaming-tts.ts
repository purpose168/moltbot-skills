/**
 * 流式文本转语音模块
 * 
 * 支持流式TTS提供商，实现音频数据的实时传输
 * 相比传统TTS，流式TTS可以显著降低首字节延迟
 * 
 * 主要特点：
 * - 流式输出：音频数据一边生成，一边传输
 * - 低延迟：无需等待完整音频生成即可开始播放
 * - 多提供商支持：OpenAI TTS和ElevenLabs TTS
 */

import { Readable, PassThrough } from "node:stream";
import type { DiscordVoiceConfig } from "./config.js";

/**
 * 流式TTS结果接口
 */
export interface StreamingTTSResult {
  /** 音频数据流 */
  stream: Readable;
  /** 音频格式 */
  format: "pcm" | "opus" | "mp3";
  /** 采样率 */
  sampleRate: number;
}

/**
 * 流式TTS提供商接口
 */
export interface StreamingTTSProvider {
  /** 
   * 将文本合成为流式音频
   * 返回一个可读流，音频块会随着生成而发出
   */
  synthesizeStream(text: string): Promise<StreamingTTSResult>;
  
  /**
   * 检查是否支持流式模式
   */
  supportsStreaming(): boolean;
}

/**
 * OpenAI流式TTS提供商
 * 
 * 使用OpenAI TTS API的流式响应功能
 * 
 * 工作流程：
 * 1. 发送TTS请求到OpenAI
 * 2. 接收流式响应（Web Streams）
 * 3. 转换为Node.js可读流
 * 4. 返回给调用方进行播放
 */
export class OpenAIStreamingTTS implements StreamingTTSProvider {
  /** OpenAI API密钥 */
  private apiKey: string;
  /** TTS模型名称 */
  private model: string;
  /** 语音ID */
  private voice: string;

  /**
   * 创建OpenAIStreamingTTS实例
   * 
   * @param config - Discord语音配置对象
   * @throws 如果未配置OpenAI API密钥则抛出错误
   */
  constructor(config: DiscordVoiceConfig) {
    this.apiKey = config.openai?.apiKey || process.env.OPENAI_API_KEY || "";
    this.model = config.openai?.ttsModel || "tts-1";
    this.voice = config.ttsVoice || "nova";

    if (!this.apiKey) {
      throw new Error("OpenAI TTS需要OpenAI API密钥");
    }
  }

  /**
   * 检查是否支持流式模式
   */
  supportsStreaming(): boolean {
    return true;
  }

  /**
   * 将文本合成为流式音频
   * 
   * @param text - 要转换的文本
   * @returns 包含可读流的结果Promise
   */
  async synthesizeStream(text: string): Promise<StreamingTTSResult> {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        voice: this.voice,
        response_format: "opus", // Opus格式最适合Discord语音
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS错误: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error("OpenAI TTS未返回响应体");
    }

    // 将Web ReadableStream转换为Node.js Readable
    const nodeStream = Readable.fromWeb(response.body as any);

    return {
      stream: nodeStream,
      format: "opus",
      sampleRate: 48000,
    };
  }
}

/**
 * ElevenLabs流式TTS提供商
 * 
 * 使用ElevenLabs的流式端点进行语音合成
 * 
 * 特点：
 * - 使用流式端点 /v1/text-to-speech/{voiceId}/stream
 * - 音频块随着生成而返回
 * - 支持延迟优化设置（optimize_streaming_latency）
 */
export class ElevenLabsStreamingTTS implements StreamingTTSProvider {
  /** ElevenLabs API密钥 */
  private apiKey: string;
  /** 语音ID */
  private voiceId: string;
  /** 模型ID */
  private modelId: string;

  /**
   * 创建ElevenLabsStreamingTTS实例
   * 
   * @param config - Discord语音配置对象
   * @throws 如果未配置ElevenLabs API密钥则抛出错误
   */
  constructor(config: DiscordVoiceConfig) {
    this.apiKey = config.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY || "";
    this.voiceId = config.elevenlabs?.voiceId || config.ttsVoice || "21m00Tcm4TlvDq8ikWAM";
    this.modelId = config.elevenlabs?.modelId || "eleven_turbo_v2_5"; // Turbo模型更快

    if (!this.apiKey) {
      throw new Error("ElevenLabs TTS需要ElevenLabs API密钥");
    }
  }

  /**
   * 检查是否支持流式模式
   */
  supportsStreaming(): boolean {
    return true;
  }

  /**
   * 将文本合成为流式音频
   * 
   * @param text - 要转换的文本
   * @returns 包含可读流的结果Promise
   */
  async synthesizeStream(text: string): Promise<StreamingTTSResult> {
    // 使用流式端点
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: this.modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          optimize_streaming_latency: 3, // 0-4，值越高延迟越低但质量可能有影响
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS错误: ${response.status} ${error}`);
    }

    if (!response.body) {
      throw new Error("ElevenLabs TTS未返回响应体");
    }

    // 将Web ReadableStream转换为Node.js Readable
    const nodeStream = Readable.fromWeb(response.body as any);

    return {
      stream: nodeStream,
      format: "mp3",
      sampleRate: 44100,
    };
  }
}

/**
 * 根据配置创建流式TTS提供商
 * 
 * @param config - Discord语音配置对象
 * @returns 对应的流式TTS提供商实例
 */
export function createStreamingTTSProvider(config: DiscordVoiceConfig): StreamingTTSProvider {
  switch (config.ttsProvider) {
    case "elevenlabs":
      return new ElevenLabsStreamingTTS(config);
    case "openai":
    default:
      return new OpenAIStreamingTTS(config);
  }
}

/**
 * 带最小缓冲的流式封装工具
 * 
 * 用于在开始播放前等待足够的数据
 * 避免刚开始播放就因数据不足而停顿
 * 
 * @param source - 源可读流
 * @param minBytes - 最少字节数
 * @param timeoutMs - 超时时间（毫秒）
 * @returns 包含缓冲数据和剩余流的Promise
 */
export function bufferStreamWithMinimum(
  source: Readable,
  minBytes: number,
  timeoutMs: number
): Promise<{ buffer: Buffer; remaining: Readable }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved && totalBytes > 0) {
        resolved = true;
        // 返回已累积的数据
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, remaining: source });
      }
    }, timeoutMs);

    source.on("data", (chunk: Buffer) => {
      if (resolved) return;
      
      chunks.push(chunk);
      totalBytes += chunk.length;

      if (totalBytes >= minBytes) {
        resolved = true;
        clearTimeout(timeout);
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, remaining: source });
      }
    });

    source.on("end", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, remaining: source });
      }
    });

    source.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}
