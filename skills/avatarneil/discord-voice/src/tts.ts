/**
 * 文本转语音(TTS)提供商模块
 * 
 * 支持两种TTS提供商：
 * 1. OpenAI TTS - 使用OpenAI的TTS API
 * 2. ElevenLabs TTS - 使用ElevenLabs的高质量语音合成
 */

import type { DiscordVoiceConfig } from "./config.js";

/**
 * TTS合成结果接口
 */
export interface TTSResult {
  /** 合成的音频数据Buffer */
  audioBuffer: Buffer;
  /** 音频格式：pcm/opus/mp3 */
  format: "pcm" | "opus" | "mp3";
  /** 采样率 */
  sampleRate: number;
}

/**
 * TTS提供商通用接口
 * 所有TTS提供商都需要实现此接口
 */
export interface TTSProvider {
  /**
   * 将文本合成为语音
   * 
   * @param text - 要转换的文本
   * @returns 包含音频数据的结果Promise
   */
  synthesize(text: string): Promise<TTSResult>;
}

/**
 * OpenAI文本转语音提供商
 * 
 * 使用OpenAI的TTS API进行语音合成
 * 特点：
 * - 支持多种语音（nova, alloy, echo等）
 * - 输出格式为Opus，适合Discord语音
 * - 响应速度快
 */
export class OpenAITTS implements TTSProvider {
  /** OpenAI API密钥 */
  private apiKey: string;
  /** TTS模型名称 */
  private model: string;
  /** 语音ID */
  private voice: string;

  /**
   * 创建OpenAITTS实例
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
   * 将文本合成为语音
   * 
   * @param text - 要转换的文本
   * @returns 包含Opus格式音频的结果Promise
   */
  async synthesize(text: string): Promise<TTSResult> {
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
        response_format: "opus", // Opust格式最适合Discord语音
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS错误: ${response.status} ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      format: "opus",
      sampleRate: 48000, // OpenAI的Opus通常是48kHz
    };
  }
}

/**
 * ElevenLabs文本转语音提供商
 * 
 * 使用ElevenLabs的TTS API进行语音合成
 * 特点：
 * - 提供更高质量的语音
 * - 支持多语言语音
 * - 语音更加自然逼真
 * - 支持语音设置自定义（稳定性、相似度等）
 */
export class ElevenLabsTTS implements TTSProvider {
  /** ElevenLabs API密钥 */
  private apiKey: string;
  /** 语音ID */
  private voiceId: string;
  /** 模型ID */
  private modelId: string;

  /**
   * 创建ElevenLabsTTS实例
   * 
   * @param config - Discord语音配置对象
   * @throws 如果未配置ElevenLabs API密钥则抛出错误
   */
  constructor(config: DiscordVoiceConfig) {
    this.apiKey = config.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY || "";
    // 默认使用Rachel语音（ElevenLabs的热门语音之一）
    this.voiceId = config.elevenlabs?.voiceId || config.ttsVoice || "21m00Tcm4TlvDq8ikWAM";
    this.modelId = config.elevenlabs?.modelId || "eleven_multilingual_v2";

    if (!this.apiKey) {
      throw new Error("ElevenLabs TTS需要ElevenLabs API密钥");
    }
  }

  /**
   * 将文本合成为语音
   * 
   * @param text - 要转换的文本
   * @returns 包含MP3格式音频的结果Promise
   */
  async synthesize(text: string): Promise<TTSResult> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
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
            stability: 0.5,      // 稳定性：0-1，值越高语音越稳定
            similarity_boost: 0.75, // 相似度：0-1，值越高越接近原始语音
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS错误: ${response.status} ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      format: "mp3",
      sampleRate: 44100,
    };
  }
}

/**
 * 根据配置创建相应的TTS提供商实例
 * 
 * @param config - Discord语音配置对象
 * @returns 对应的TTS提供商实例
 */
export function createTTSProvider(config: DiscordVoiceConfig): TTSProvider {
  switch (config.ttsProvider) {
    case "elevenlabs":
      return new ElevenLabsTTS(config);
    case "openai":
    default:
      return new OpenAITTS(config);
  }
}
