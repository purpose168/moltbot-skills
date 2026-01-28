/**
 * Discord语音插件配置模块
 * 
 * 定义了语音插件的所有配置选项，包括：
 * - 语音转文本(STT)提供商配置
 * - 文本转语音(TTS)提供商配置
 * - 语音活动检测(VAD)灵敏度设置
 * - 打断功能配置
 * - 用户权限控制
 */

// 用于兼容核心TTS配置的占位符接口
export interface VoiceCallTtsConfig {
  enabled?: boolean;
  voice?: string;
  [key: string]: unknown;
}

/**
 * Discord语音插件的完整配置接口
 */
export interface DiscordVoiceConfig {
  /** 是否启用语音功能 */
  enabled: boolean;
  /** 语音转文本提供商：whisper(OpenAI) 或 deepgram */
  sttProvider: "whisper" | "deepgram";
  /** 是否使用流式STT（仅Deepgram支持），可降低延迟约1秒 */
  streamingSTT: boolean;
  /** 文本转语音提供商：openai 或 elevenlabs */
  ttsProvider: "openai" | "elevenlabs";
  /** TTS语音ID */
  ttsVoice: string;
  /** VAD灵敏度：低/中等/高 */
  vadSensitivity: "low" | "medium" | "high";
  /** 打断功能：用户开始说话时停止播放 */
  bargeIn: boolean;
  /** 允许使用语音功能的用户ID列表（空数组表示允许所有用户） */
  allowedUsers: string[];
  /** 检测语音结束后的静音阈值（毫秒） */
  silenceThresholdMs: number;
  /** 最小音频时长阈值（毫秒），用于过滤短噪音 */
  minAudioMs: number;
  /** 最大录音时长（毫秒） */
  maxRecordingMs: number;
  /** 启动时自动加入的语音频道ID */
  autoJoinChannel?: string;
  /** 心跳检测间隔（毫秒），用于监控连接健康状态 */
  heartbeatIntervalMs?: number;
  
  /** 语音响应使用的LLM模型（建议使用快速模型以降低延迟） */
  model?: string;
  /** 思考级别：off/low/medium/high，越低响应越快 */
  thinkLevel?: string;
  
  /** OpenAI API配置（用于Whisper和TTS） */
  openai?: {
    apiKey?: string;
    whisperModel?: string;
    ttsModel?: string;
  };
  /** ElevenLabs API配置（仅用于TTS） */
  elevenlabs?: {
    apiKey?: string;
    voiceId?: string;
    modelId?: string;
  };
  /** Deepgram API配置（仅用于STT） */
  deepgram?: {
    apiKey?: string;
    model?: string;
  };
}

/**
 * 默认配置常量
 * 提供所有配置项的默认值
 */
export const DEFAULT_CONFIG: DiscordVoiceConfig = {
  enabled: true,
  sttProvider: "whisper",
  streamingSTT: true,        // 使用Deepgram时默认启用流式STT
  ttsProvider: "openai",
  ttsVoice: "nova",
  vadSensitivity: "medium",
  bargeIn: true,             // 默认启用打断功能
  allowedUsers: [],
  silenceThresholdMs: 1000,  // 1秒静音阈值，说话结束后更快响应
  minAudioMs: 300,           // 300毫秒最小音频，过滤短噪音
  maxRecordingMs: 30000,
  heartbeatIntervalMs: 30000,
};

/**
 * 解析原始配置对象为类型化的DiscordVoiceConfig
 * 
 * @param raw - 原始的未知类型配置对象
 * @returns 解析后的类型化配置对象，如果输入无效则返回默认配置
 */
export function parseConfig(raw: unknown): DiscordVoiceConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_CONFIG;
  }

  const obj = raw as Record<string, unknown>;

  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : DEFAULT_CONFIG.enabled,
    sttProvider: obj.sttProvider === "deepgram" ? "deepgram" : "whisper",
    streamingSTT: typeof obj.streamingSTT === "boolean" ? obj.streamingSTT : DEFAULT_CONFIG.streamingSTT,
    ttsProvider: obj.ttsProvider === "elevenlabs" ? "elevenlabs" : "openai",
    ttsVoice: typeof obj.ttsVoice === "string" ? obj.ttsVoice : DEFAULT_CONFIG.ttsVoice,
    vadSensitivity: ["low", "medium", "high"].includes(obj.vadSensitivity as string)
      ? (obj.vadSensitivity as "low" | "medium" | "high")
      : DEFAULT_CONFIG.vadSensitivity,
    bargeIn: typeof obj.bargeIn === "boolean" ? obj.bargeIn : DEFAULT_CONFIG.bargeIn,
    allowedUsers: Array.isArray(obj.allowedUsers)
      ? obj.allowedUsers.filter((u): u is string => typeof u === "string")
      : [],
    silenceThresholdMs:
      typeof obj.silenceThresholdMs === "number"
        ? obj.silenceThresholdMs
        : DEFAULT_CONFIG.silenceThresholdMs,
    minAudioMs:
      typeof obj.minAudioMs === "number"
        ? obj.minAudioMs
        : DEFAULT_CONFIG.minAudioMs,
    maxRecordingMs:
      typeof obj.maxRecordingMs === "number"
        ? obj.maxRecordingMs
        : DEFAULT_CONFIG.maxRecordingMs,
    autoJoinChannel:
      typeof obj.autoJoinChannel === "string" && obj.autoJoinChannel.trim()
        ? obj.autoJoinChannel.trim()
        : undefined,
    heartbeatIntervalMs:
      typeof obj.heartbeatIntervalMs === "number"
        ? obj.heartbeatIntervalMs
        : DEFAULT_CONFIG.heartbeatIntervalMs,
    model: typeof obj.model === "string" ? obj.model : undefined,
    thinkLevel: typeof obj.thinkLevel === "string" ? obj.thinkLevel : undefined,
    openai: obj.openai && typeof obj.openai === "object"
      ? {
          apiKey: (obj.openai as Record<string, unknown>).apiKey as string | undefined,
          whisperModel: ((obj.openai as Record<string, unknown>).whisperModel as string) || "whisper-1",
          ttsModel: ((obj.openai as Record<string, unknown>).ttsModel as string) || "tts-1",
        }
      : undefined,
    elevenlabs: obj.elevenlabs && typeof obj.elevenlabs === "object"
      ? {
          apiKey: (obj.elevenlabs as Record<string, unknown>).apiKey as string | undefined,
          voiceId: (obj.elevenlabs as Record<string, unknown>).voiceId as string | undefined,
          modelId: ((obj.elevenlabs as Record<string, unknown>).modelId as string) || "eleven_multilingual_v2",
        }
      : undefined,
    deepgram: obj.deepgram && typeof obj.deepgram === "object"
      ? {
          apiKey: (obj.deepgram as Record<string, unknown>).apiKey as string | undefined,
          model: ((obj.deepgram as Record<string, unknown>).model as string) || "nova-2",
        }
      : undefined,
  };
}

/**
 * 根据VAD灵敏度设置获取相应的阈值
 * 
 * VAD(语音活动检测)用于检测用户是否在说话
 * 阈值越低越灵敏，可以检测到更 quiet 的语音，但可能误触发
 * 阈值越高越不灵敏，需要更大的声音才能触发
 * 
 * @param sensitivity - 灵敏度设置：low(低)/medium(中)/high(高)
 * @returns VAD阈值数值
 */
export function getVadThreshold(sensitivity: "low" | "medium" | "high"): number {
  switch (sensitivity) {
    case "low":
      return 0.01; // 非常灵敏，可以检测到 quiet 的语音
    case "high":
      return 0.05; // 不太灵敏，需要更大的声音
    case "medium":
    default:
      return 0.02; // 平衡设置
  }
}
