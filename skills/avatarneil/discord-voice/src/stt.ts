/**
 * 语音转文本(STT)提供商模块
 * 
 * 支持两种STT提供商：
 * 1. OpenAI Whisper - 经典的批量转录方式
 * 2. Deepgram - 支持流式转录，延迟更低
 */

import type { DiscordVoiceConfig } from "./config.js";

/**
 * STT转录结果接口
 */
export interface STTResult {
  /** 转录的文本内容 */
  text: string;
  /** 转录置信度 (0-1) */
  confidence?: number;
  /** 检测到的语言代码 */
  language?: string;
}

/**
 * STT提供商通用接口
 * 所有STT提供商都需要实现此接口
 */
export interface STTProvider {
  /**
   * 转录音频为文本
   * 
   * @param audioBuffer - 音频数据的Buffer
   * @param sampleRate - 音频采样率
   * @returns 转录结果Promise
   */
  transcribe(audioBuffer: Buffer, sampleRate: number): Promise<STTResult>;
}

/**
 * OpenAI Whisper语音转文本提供商
 * 
 * 使用OpenAI的Whisper API进行语音转文本
 * 特点：
 * - 高准确率
 * - 支持多种语言
 * - 需要将PCM音频转换为WAV格式
 * - 非流式转录，整段音频处理完成后返回结果
 */
export class WhisperSTT implements STTProvider {
  /** OpenAI API密钥 */
  private apiKey: string;
  /** Whisper模型名称 */
  private model: string;

  /**
   * 创建WhisperSTT实例
   * 
   * @param config - Discord语音配置对象
   * @throws 如果未配置OpenAI API密钥则抛出错误
   */
  constructor(config: DiscordVoiceConfig) {
    this.apiKey = config.openai?.apiKey || process.env.OPENAI_API_KEY || "";
    this.model = config.openai?.whisperModel || "whisper-1";

    if (!this.apiKey) {
      throw new Error("Whisper STT需要OpenAI API密钥");
    }
  }

  /**
   * 转录音频Buffer为文本
   * 
   * @param audioBuffer - 原始PCM音频数据
   * @param sampleRate - 音频采样率
   * @returns 包含转录文本的结果Promise
   */
  async transcribe(audioBuffer: Buffer, sampleRate: number): Promise<STTResult> {
    // 将原始PCM转换为WAV格式（Whisper API要求）
    const wavBuffer = this.pcmToWav(audioBuffer, sampleRate);

    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }), "audio.wav");
    formData.append("model", this.model);
    formData.append("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API错误: ${response.status} ${error}`);
    }

    const result = (await response.json()) as { text: string; language?: string };
    return {
      text: result.text.trim(),
      language: result.language,
    };
  }

  /**
   * 将原始PCM音频转换为WAV格式
   * 
   * WAV格式包括：
   * - RIFF文件头
   * - fmt子块（音频格式信息）
   * - data子块（音频数据）
   * 
   * @param pcmBuffer - 原始PCM音频Buffer
   * @param sampleRate - 采样率
   * @returns WAV格式的Buffer
   */
  private pcmToWav(pcmBuffer: Buffer, sampleRate: number): Buffer {
    const numChannels = 1; // 单声道
    const bitsPerSample = 16; // 16位采样深度
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmBuffer.length;
    const headerSize = 44; // 标准WAV头大小
    const fileSize = headerSize + dataSize - 8;

    const buffer = Buffer.alloc(headerSize + dataSize);

    // RIFF文件头
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(fileSize, 4);
    buffer.write("WAVE", 8);

    // fmt子块
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // 子块大小
    buffer.writeUInt16LE(1, 20); // 音频格式（1表示PCM）
    buffer.writeUInt16LE(numChannels, 22); // 声道数
    buffer.writeUInt32LE(sampleRate, 24); // 采样率
    buffer.writeUInt32LE(byteRate, 28); // 字节率
    buffer.writeUInt16LE(blockAlign, 32); // 块对齐
    buffer.writeUInt16LE(bitsPerSample, 34); // 采样深度

    // data子块
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40); // 数据大小
    pcmBuffer.copy(buffer, headerSize); // 复制PCM数据

    return buffer;
  }
}

/**
 * Deepgram语音转文本提供商
 * 
 * 使用Deepgram API进行语音转文本
 * 特点：
 * - 支持流式转录，延迟更低
 * - 专门针对实时语音优化
 * - 直接接受线性16编码的PCM音频
 */
export class DeepgramSTT implements STTProvider {
  /** Deepgram API密钥 */
  private apiKey: string;
  /** Deepgram模型名称 */
  private model: string;

  /**
   * 创建DeepgramSTT实例
   * 
   * @param config - Discord语音配置对象
   * @throws 如果未配置Deepgram API密钥则抛出错误
   */
  constructor(config: DiscordVoiceConfig) {
    this.apiKey = config.deepgram?.apiKey || process.env.DEEPGRAM_API_KEY || "";
    this.model = config.deepgram?.model || "nova-2";

    if (!this.apiKey) {
      throw new Error("Deepgram STT需要Deepgram API密钥");
    }
  }

  /**
   * 转录音频Buffer为文本
   * 
   * @param audioBuffer - 线性16编码的PCM音频数据
   * @param sampleRate - 音频采样率
   * @returns 包含转录文本的结果Promise
   */
  async transcribe(audioBuffer: Buffer, sampleRate: number): Promise<STTResult> {
    // Deepgram要求：encoding=linear16, sample_rate, channels=1
    const url = new URL("https://api.deepgram.com/v1/listen");
    url.searchParams.set("model", this.model);
    url.searchParams.set("encoding", "linear16");
    url.searchParams.set("sample_rate", sampleRate.toString());
    url.searchParams.set("channels", "1");
    url.searchParams.set("punctuate", "true");
    url.searchParams.set("smart_format", "true");

    const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/octet-stream",
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram API错误: ${response.status} ${error}`);
    }

    const result = (await response.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript?: string;
            confidence?: number;
          }>;
        }>;
      };
    };

    const transcript = result.results?.channels?.[0]?.alternatives?.[0];
    return {
      text: transcript?.transcript?.trim() || "",
      confidence: transcript?.confidence,
    };
  }
}

/**
 * 根据配置创建相应的STT提供商实例
 * 
 * @param config - Discord语音配置对象
 * @returns 对应的STT提供商实例
 */
export function createSTTProvider(config: DiscordVoiceConfig): STTProvider {
  switch (config.sttProvider) {
    case "deepgram":
      return new DeepgramSTT(config);
    case "whisper":
    default:
      return new WhisperSTT(config);
  }
}
