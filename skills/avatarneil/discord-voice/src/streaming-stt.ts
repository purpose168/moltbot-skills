/**
 * 流式语音转文本模块
 * 
 * 通过Deepgram WebSocket实现实时语音转文本
 * 相比传统的批量转录，流式STT可以显著降低延迟（约1秒）
 * 
 * 主要特点：
 * - 实时转录：音频数据一边输入，结果一边输出
 * - 临时结果：可以获取中间转录结果，提供即时反馈
 * - 自动保活：定期发送心跳保持连接活跃
 * - 自动重连：连接断开时自动尝试重新连接
 */

import { EventEmitter } from "node:events";
import WebSocket from "ws";
import type { DiscordVoiceConfig } from "./config.js";

/**
 * 流式STT事件接口
 */
export interface StreamingSTTEvents {
  /** 转录文本事件
   * @param text - 转录的文本内容
   * @param isFinal - 是否为最终结果
   * @param confidence - 转录置信度
   */
  transcript: (text: string, isFinal: boolean, confidence?: number) => void;
  /** 错误事件 */
  error: (error: Error) => void;
  /** 连接关闭事件 */
  close: () => void;
  /** 连接就绪事件 */
  ready: () => void;
}

/**
 * 流式STT提供商接口
 * 继承自EventEmitter，支持事件监听
 */
export interface StreamingSTTProvider extends EventEmitter {
  on<K extends keyof StreamingSTTEvents>(event: K, listener: StreamingSTTEvents[K]): this;
  emit<K extends keyof StreamingSTTEvents>(event: K, ...args: Parameters<StreamingSTTEvents[K]>): boolean;
  
  /** 发送音频数据进行转录 */
  sendAudio(chunk: Buffer): void;
  
  /** 标记音频流结束 */
  finalize(): void;
  
  /** 关闭连接 */
  close(): void;
  
  /** 检查连接是否就绪 */
  isReady(): boolean;
}

/**
 * Deepgram流式语音转文本提供商
 * 
 * 使用WebSocket连接到Deepgram API进行实时转录
 * 
 * 工作流程：
 * 1. 建立WebSocket连接到Deepgram
 * 2. 持续发送音频数据
 * 3. 接收实时转录结果（临时和最终）
 * 4. 处理各种事件（语音开始、语句结束等）
 */
export class DeepgramStreamingSTT extends EventEmitter implements StreamingSTTProvider {
  /** WebSocket连接实例 */
  private ws: WebSocket | null = null;
  /** Deepgram API密钥 */
  private apiKey: string;
  /** 使用的模型名称 */
  private model: string;
  /** 连接是否就绪 */
  private ready = false;
  /** 连接是否已关闭 */
  private closed = false;
  /** 重连尝试次数 */
  private reconnectAttempts = 0;
  /** 最大重连尝试次数 */
  private maxReconnectAttempts = 3;
  /** 心跳保活定时器 */
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  /** 音频采样率 */
  private sampleRate: number;
  /** 是否启用临时结果 */
  private interimResults: boolean;
  /** 端点检测时间（毫秒），用于检测用户是否停止说话 */
  private endpointing: number;
  /** 语句结束等待时间（毫秒） */
  private utteranceEndMs: number;
  
  /** 连接建立前缓冲的音频数据 */
  private pendingAudioChunks: Buffer[] = [];
  /** 最大缓冲块数（约5秒音频 @ 48kHz） */
  private maxPendingChunks = 500;

  /**
   * 创建DeepgramStreamingSTT实例
   * 
   * @param config - Discord语音配置对象
   * @param options - 可选的流式STT配置
   */
  constructor(config: DiscordVoiceConfig, options?: {
    sampleRate?: number;
    interimResults?: boolean;
    endpointing?: number;      // 毫秒，静音多长时间认为语句结束
    utteranceEndMs?: number;   // 毫秒，语句结束后等待多长时间返回最终结果
  }) {
    super();
    this.apiKey = config.deepgram?.apiKey || process.env.DEEPGRAM_API_KEY || "";
    this.model = config.deepgram?.model || "nova-2";
    this.sampleRate = options?.sampleRate ?? 48000;
    this.interimResults = options?.interimResults ?? true;
    this.endpointing = options?.endpointing ?? 300;  // 300ms静音检测
    this.utteranceEndMs = options?.utteranceEndMs ?? 1000;

    if (!this.apiKey) {
      throw new Error("流式STT需要Deepgram API密钥");
    }

    this.connect();
  }

  /**
   * 建立WebSocket连接
   */
  private connect(): void {
    if (this.closed) return;

    // 构建Deepgram流式URL及参数
    const params = new URLSearchParams({
      model: this.model,
      encoding: "linear16",
      sample_rate: this.sampleRate.toString(),
      channels: "1",
      interim_results: this.interimResults.toString(),
      punctuate: "true",
      endpointing: this.endpointing.toString(),
      utterance_end_ms: this.utteranceEndMs.toString(),
      vad_events: "true",
      smart_format: "true",
    });

    const url = `wss://api.deepgram.com/v1/listen?${params}`;

    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });

    this.ws.on("open", () => {
      this.ready = true;
      this.reconnectAttempts = 0;
      
      // 发送连接建立前缓冲的音频数据
      if (this.pendingAudioChunks.length > 0) {
        console.log(`[streaming-stt] 连接就绪，发送 ${this.pendingAudioChunks.length} 个缓冲的音频块`);
        for (const chunk of this.pendingAudioChunks) {
          this.ws!.send(chunk);
        }
        this.pendingAudioChunks = [];
      }
      
      this.emit("ready");
      
      // 每10秒发送心跳保活
      this.keepAliveInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, 10000);
    });

    this.ws.on("message", (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString()) as DeepgramMessage;
        this.handleMessage(msg);
      } catch (err) {
        // 忽略非JSON消息的解析错误
      }
    });

    this.ws.on("close", (code, reason) => {
      this.ready = false;
      this.clearKeepAlive();
      
      if (!this.closed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
      } else {
        this.emit("close");
      }
    });

    this.ws.on("error", (err) => {
      this.emit("error", err);
    });
  }

  /**
   * 处理Deepgram消息
   * 
   * 消息类型：
   * - Results: 转录结果（临时或最终）
   * - UtteranceEnd: 语句结束
   * - SpeechStarted: 语音开始
   */
  private handleMessage(msg: DeepgramMessage): void {
    if (msg.type === "Results" && msg.channel?.alternatives?.[0]) {
      const alt = msg.channel.alternatives[0];
      const text = alt.transcript?.trim();
      
      if (text && text.length > 0) {
        const isFinal = msg.is_final ?? false;
        this.emit("transcript", text, isFinal, alt.confidence);
      }
    } else if (msg.type === "UtteranceEnd") {
      // 语句结束 - 可以用于触发后续处理
      // 最终转录结果应该已经发送
    } else if (msg.type === "SpeechStarted") {
      // 语音检测开始 - 可用于打断检测
    }
  }

  /**
   * 清除心跳定时器
   */
  private clearKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * 发送音频数据进行转录
   * 
   * 如果连接尚未就绪，音频数据会被缓冲
   * 缓冲达到上限时会丢弃最旧的数据
   * 
   * @param chunk - 音频数据块
   */
  sendAudio(chunk: Buffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    } else if (!this.closed) {
      // 连接未就绪时缓冲音频数据
      this.pendingAudioChunks.push(chunk);
      // 防止无限缓冲
      if (this.pendingAudioChunks.length > this.maxPendingChunks) {
        this.pendingAudioChunks.shift(); // 丢弃最旧的块
      }
    }
  }

  /**
   * 标记音频流结束
   * 
   * 发送CloseStream消息以获取最终转录结果
   */
  finalize(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // 发送关闭流消息以获取最终结果
      this.ws.send(JSON.stringify({ type: "CloseStream" }));
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.closed = true;
    this.clearKeepAlive();
    this.pendingAudioChunks = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.ready = false;
  }

  /**
   * 检查连接是否就绪
   */
  isReady(): boolean {
    return this.ready && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 等待连接就绪（或失败）
   * 
   * @param timeoutMs - 超时时间（毫秒），默认5秒
   * @returns 如果就绪返回true，失败或关闭返回false
   */
  waitForReady(timeoutMs = 5000): Promise<boolean> {
    if (this.isReady()) return Promise.resolve(true);
    if (this.closed) return Promise.resolve(false);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.off("ready", onReady);
        this.off("close", onClose);
        resolve(false);
      }, timeoutMs);

      const onReady = () => {
        clearTimeout(timeout);
        this.off("close", onClose);
        resolve(true);
      };

      const onClose = () => {
        clearTimeout(timeout);
        this.off("ready", onReady);
        resolve(false);
      };

      this.once("ready", onReady);
      this.once("close", onClose);
    });
  }
}

/**
 * Deepgram消息类型定义
 */
interface DeepgramMessage {
  type: "Results" | "Metadata" | "UtteranceEnd" | "SpeechStarted" | "Error";
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
  };
  metadata?: {
    request_id?: string;
    model_info?: {
      name: string;
      version: string;
    };
  };
}

/**
 * 流式STT会话管理器
 * 
 * 管理每个用户的流式STT会话
 * 自动处理会话生命周期：
 * - 语音开始时创建会话
 * - 检测到静音时销毁会话
 */
export class StreamingSTTManager {
  /** Discord语音配置 */
  private config: DiscordVoiceConfig;
  /** 用户会话映射 */
  private sessions: Map<string, DeepgramStreamingSTT> = new Map();
  /** 待处理转录文本映射 */
  private pendingTranscripts: Map<string, string> = new Map();
  
  /**
   * 创建StreamingSTTManager实例
   * 
   * @param config - Discord语音配置对象
   */
  constructor(config: DiscordVoiceConfig) {
    this.config = config;
  }

  /**
   * 获取或创建用户的流式会话
   * 
   * @param userId - 用户ID
   * @param onTranscript - 转录文本回调函数
   * @returns Deepgram流式STT实例
   */
  getOrCreateSession(
    userId: string,
    onTranscript: (text: string, isFinal: boolean) => void
  ): DeepgramStreamingSTT {
    let session = this.sessions.get(userId);
    
    if (!session || !session.isReady()) {
      // 清理旧会话
      if (session) {
        session.close();
      }

      session = new DeepgramStreamingSTT(this.config, {
        sampleRate: 48000,
        interimResults: true,
        endpointing: 300,
        utteranceEndMs: 1000,
      });

      // 跟踪该用户的临时转录
      this.pendingTranscripts.set(userId, "");

      session.on("transcript", (text, isFinal, confidence) => {
        if (isFinal) {
          // 累加最终转录文本
          const pending = this.pendingTranscripts.get(userId) || "";
          const fullText = pending ? `${pending} ${text}` : text;
          this.pendingTranscripts.set(userId, fullText);
        }
        onTranscript(text, isFinal);
      });

      session.on("close", () => {
        this.sessions.delete(userId);
      });

      session.on("error", (err) => {
        console.error(`[streaming-stt] 用户 ${userId} 的会话错误:`, err.message);
      });

      this.sessions.set(userId, session);
    }

    return session;
  }

  /**
   * 向用户的会话发送音频数据
   * 
   * 如果连接尚未就绪，数据会在内部缓冲
   * 
   * @param userId - 用户ID
   * @param chunk - 音频数据块
   */
  sendAudio(userId: string, chunk: Buffer): void {
    const session = this.sessions.get(userId);
    if (session) {
      // sendAudio内部处理连接未就绪时的缓冲
      session.sendAudio(chunk);
    }
  }

  /**
   * 结束会话并获取累积的转录文本
   * 
   * @param userId - 用户ID
   * @returns 累积的完整转录文本
   */
  finalizeSession(userId: string): string {
    const session = this.sessions.get(userId);
    if (session) {
      session.finalize();
    }
    
    const transcript = this.pendingTranscripts.get(userId) || "";
    this.pendingTranscripts.delete(userId);
    return transcript;
  }

  /**
   * 关闭用户的会话
   * 
   * @param userId - 用户ID
   */
  closeSession(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.close();
      this.sessions.delete(userId);
    }
    this.pendingTranscripts.delete(userId);
  }

  /**
   * 关闭所有会话
   */
  closeAll(): void {
    for (const [userId, session] of this.sessions) {
      session.close();
    }
    this.sessions.clear();
    this.pendingTranscripts.clear();
  }
}

/**
 * 根据配置创建流式STT提供商
 * 
 * @param config - Discord语音配置对象
 * @returns 流式STT管理器实例，如果配置不支持流式STT则返回null
 */
export function createStreamingSTTProvider(config: DiscordVoiceConfig): StreamingSTTManager | null {
  if (config.sttProvider !== "deepgram") {
    return null;  // 流式STT仅支持Deepgram
  }
  
  return new StreamingSTTManager(config);
}
