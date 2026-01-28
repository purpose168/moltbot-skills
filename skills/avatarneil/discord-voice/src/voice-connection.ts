/**
 * Discord语音连接管理器模块
 * 
 * 处理语音频道的加入、离开、监听和说话功能
 * 
 * 核心功能：
 * - 打断功能(Barge-in)：当用户开始说话时停止播放
 * - 自动重连心跳：保持连接活跃
 * - 流式STT：使用Deepgram实现实时转录
 */

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  EndBehaviorType,
  StreamType,
  type VoiceConnection,
  type AudioPlayer,
  type AudioReceiveStream,
} from "@discordjs/voice";
import type {
  VoiceChannel,
  StageChannel,
  GuildMember,
  VoiceBasedChannel,
} from "discord.js";
import { Readable, PassThrough } from "stream";
import { pipeline } from "stream/promises";
import * as prism from "prism-media";

import type { DiscordVoiceConfig } from "./config.js";
import { getVadThreshold } from "./config.js";
import { createSTTProvider, type STTProvider } from "./stt.js";
import { createTTSProvider, type TTSProvider } from "./tts.js";
import { StreamingSTTManager, createStreamingSTTProvider } from "./streaming-stt.js";
import { createStreamingTTSProvider, type StreamingTTSProvider } from "./streaming-tts.js";

/**
 * 日志接口
 */
interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug?(msg: string): void;
}

/**
 * 用户音频状态接口
 * 
 * 跟踪每个用户的录音状态
 */
interface UserAudioState {
  /** 音频数据块列表 */
  chunks: Buffer[];
  /** 最后活动时间戳 */
  lastActivityMs: number;
  /** 是否正在录音 */
  isRecording: boolean;
  /** 静音超时定时器 */
  silenceTimer?: ReturnType<typeof setTimeout>;
  /** Opus音频流 */
  opusStream?: AudioReceiveStream;
  /** Opus解码器 */
  decoder?: prism.opus.Decoder;
}

/**
 * 语音会话接口
 * 
 * 表示一个活跃的语音频道会话
 */
export interface VoiceSession {
  /** 服务器ID */
  guildId: string;
  /** 频道ID */
  channelId: string;
  /** 频道名称 */
  channelName?: string;
  /** 语音连接 */
  connection: VoiceConnection;
  /** 音频播放器 */
  player: AudioPlayer;
  /** 用户音频状态映射 */
  userAudioStates: Map<string, UserAudioState>;
  /** 是否正在说话 */
  speaking: boolean;
  /** 是否正在处理（处理锁，防止并发处理） */
  processing: boolean;
  /** 最后说话完成时间戳（用于冷却） */
  lastSpokeAt?: number;
  /** 开始说话时间戳（用于回声抑制） */
  startedSpeakingAt?: number;
  /** 思考声音播放器（独立播放器） */
  thinkingPlayer?: AudioPlayer;
  /** 心跳定时器 */
  heartbeatInterval?: ReturnType<typeof setInterval>;
  /** 最后心跳时间 */
  lastHeartbeat?: number;
  /** 是否正在重连 */
  reconnecting?: boolean;
}

/**
 * 根据VAD灵敏度获取RMS阈值
 * 
 * RMS（均方根）用于检测音频能量
 * 阈值越高，要求的声音越大
 * 
 * @param sensitivity - 灵敏度设置
 * @returns RMS阈值
 */
function getRmsThreshold(sensitivity: "low" | "medium" | "high"): number {
  switch (sensitivity) {
    case "low":
      return 400;   // 更灵敏 - 可以检测到较 quiet 的语音
    case "high":
      return 1200;  // 不太灵敏 - 需要更大的声音，过滤更多噪音
    case "medium":
    default:
      return 800;   // 平衡默认值
  }
}

/**
 * 语音连接管理器类
 * 
 * 管理Discord语音频道的所有连接和音频处理
 * 
 * 工作流程：
 * 1. join() - 加入语音频道
 * 2. startListening() - 开始监听用户语音（VAD检测）
 * 3. startRecording() - 检测到语音时开始录音
 * 4. processRecording() - 处理录音（STT转录 -> 代理处理 -> TTS合成）
 * 5. speak() - 播放TTS生成的音频
 * 6. leave() - 离开语音频道
 */
export class VoiceConnectionManager {
  /** 服务器会话映射 */
  private sessions: Map<string, VoiceSession> = new Map();
  /** 插件配置 */
  private config: DiscordVoiceConfig;
  /** 批量STT提供商 */
  private sttProvider: STTProvider | null = null;
  /** 流式STT管理器 */
  private streamingSTT: StreamingSTTManager | null = null;
  /** 批量TTS提供商 */
  private ttsProvider: TTSProvider | null = null;
  /** 流式TTS提供商 */
  private streamingTTS: StreamingTTSProvider | null = null;
  /** 日志记录器 */
  private logger: Logger;
  /** 转录处理回调函数 */
  private onTranscript: (userId: string, guildId: string, channelId: string, text: string) => Promise<string>;
  /** 机器人用户ID（用于回声过滤） */
  private botUserId: string | null = null;

  /** 默认心跳间隔（毫秒） */
  private readonly DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;  // 30秒
  /** 心跳超时时间（毫秒） */
  private readonly HEARTBEAT_TIMEOUT_MS = 60_000;   // 60秒后重连
  /** 最大重连尝试次数 */
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  
  /** 获取心跳间隔（可配置） */
  private get HEARTBEAT_INTERVAL_MS(): number {
    return this.config.heartbeatIntervalMs ?? this.DEFAULT_HEARTBEAT_INTERVAL_MS;
  }

  /**
   * 创建语音连接管理器
   * 
   * @param config - Discord语音配置
   * @param logger - 日志记录器
   * @param onTranscript - 转录文本处理回调
   * @param botUserId - 机器人用户ID（可选，用于回声过滤）
   */
  constructor(
    config: DiscordVoiceConfig,
    logger: Logger,
    onTranscript: (userId: string, guildId: string, channelId: string, text: string) => Promise<string>,
    botUserId?: string
  ) {
    this.config = config;
    this.logger = logger;
    this.onTranscript = onTranscript;
    this.botUserId = botUserId || null;
  }
  
  /**
   * 设置机器人用户ID（用于回声过滤）
   * 
   * @param userId - 机器人用户ID
   */
  setBotUserId(userId: string): void {
    this.botUserId = userId;
    this.logger.info(`[discord-voice] 机器人用户ID设置为 ${userId}`);
  }

  /**
   * 惰性初始化提供商
   */
  private ensureProviders(): void {
    if (!this.sttProvider) {
      this.sttProvider = createSTTProvider(this.config);
    }
    if (!this.ttsProvider) {
      this.ttsProvider = createTTSProvider(this.config);
    }
    // 总是初始化流式TTS（降低延迟）
    if (!this.streamingTTS) {
      this.streamingTTS = createStreamingTTSProvider(this.config);
    }
    // 如果使用Deepgram且启用了流式STT，则初始化
    if (!this.streamingSTT && this.config.sttProvider === "deepgram" && this.config.streamingSTT) {
      this.streamingSTT = createStreamingSTTProvider(this.config);
    }
  }

  /**
   * 加入语音频道
   * 
   * @param channel - 要加入的语音频道
   * @returns 语音会话对象
   */
  async join(channel: VoiceBasedChannel): Promise<VoiceSession> {
    const existingSession = this.sessions.get(channel.guildId);
    if (existingSession) {
      if (existingSession.channelId === channel.id) {
        return existingSession;
      }
      // 先离开当前频道
      await this.leave(channel.guildId);
    }

    this.ensureProviders();

    // 创建语音连接
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false, // 需要听到用户
      selfMute: false,
    });

    // 创建音频播放器
    const player = createAudioPlayer();
    connection.subscribe(player);

    // 创建会话对象
    const session: VoiceSession = {
      guildId: channel.guildId,
      channelId: channel.id,
      channelName: channel.name,
      connection,
      player,
      userAudioStates: new Map(),
      speaking: false,
      processing: false,
      lastHeartbeat: Date.now(),
    };

    this.sessions.set(channel.guildId, session);

    // 等待连接就绪
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
      this.logger.info(`[discord-voice] 已加入频道 ${channel.name}（服务器: ${channel.guild.name}）`);
    } catch (error) {
      connection.destroy();
      this.sessions.delete(channel.guildId);
      throw new Error(`加入语音频道失败: ${error}`);
    }

    // 开始监听用户语音
    this.startListening(session);

    // 启动心跳监控
    this.startHeartbeat(session);

    // 设置连接状态处理器
    this.setupConnectionHandlers(session, channel);

    return session;
  }

  /**
   * 设置连接事件处理器（自动重连）
   * 
   * @param session - 语音会话
   * @param channel - 语音频道
   */
  private setupConnectionHandlers(session: VoiceSession, channel: VoiceBasedChannel): void {
    const connection = session.connection;

    // 断开连接事件
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (session.reconnecting) return;
      
      this.logger.warn(`[discord-voice] 与频道 ${channel.guild.name} 的语音连接已断开`);
      
      try {
        // 尝试在5秒内重连
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        this.logger.info(`[discord-voice] 正在重连到语音频道...`);
      } catch {
        // 连接无法恢复，尝试手动重连
        await this.attemptReconnect(session, channel);
      }
    });

    // 连接就绪事件
    connection.on(VoiceConnectionStatus.Ready, () => {
      session.lastHeartbeat = Date.now();
      session.reconnecting = false;
      this.logger.info(`[discord-voice] ${channel.name} 的连接已就绪`);
    });

    // 错误事件
    connection.on("error", (error) => {
      this.logger.error(`[discord-voice] 连接错误: ${error.message}`);
    });
  }

  /**
   * 尝试重连到语音频道
   * 
   * 使用指数退避策略，最多尝试MAX_RECONNECT_ATTEMPTS次
   * 
   * @param session - 语音会话
   * @param channel - 语音频道
   * @param attempt - 当前尝试次数
   */
  private async attemptReconnect(session: VoiceSession, channel: VoiceBasedChannel, attempt = 1): Promise<void> {
    if (attempt > this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(`[discord-voice] 达到最大重连尝试次数，放弃`);
      await this.leave(session.guildId);
      return;
    }

    session.reconnecting = true;
    this.logger.info(`[discord-voice] 重连尝试 ${attempt}/${this.MAX_RECONNECT_ATTEMPTS}`);

    try {
      // 销毁旧连接
      session.connection.destroy();

      // 等待后重连（指数退避）
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));

      // 创建新连接
      const newConnection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      const newPlayer = createAudioPlayer();
      newConnection.subscribe(newPlayer);

      // 更新会话
      session.connection = newConnection;
      session.player = newPlayer;

      // 等待就绪
      await entersState(newConnection, VoiceConnectionStatus.Ready, 20_000);
      
      session.reconnecting = false;
      session.lastHeartbeat = Date.now();
      
      // 重新开始监听
      this.startListening(session);
      
      // 为新连接设置处理器
      this.setupConnectionHandlers(session, channel);
      
      this.logger.info(`[discord-voice] 重连成功`);
    } catch (error) {
      this.logger.error(`[discord-voice] 重连失败: ${error instanceof Error ? error.message : String(error)}`);
      await this.attemptReconnect(session, channel, attempt + 1);
    }
  }

  /**
   * 启动心跳监控
   * 
   * 定期检查连接健康状态
   * 如果连接断开太久则触发重连
   * 
   * @param session - 语音会话
   */
  private startHeartbeat(session: VoiceSession): void {
    // 清除现有的心跳
    if (session.heartbeatInterval) {
      clearInterval(session.heartbeatInterval);
    }

    session.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const connectionState = session.connection.state.status;
      
      // 如果连接健康，更新心跳时间戳
      if (connectionState === VoiceConnectionStatus.Ready) {
        session.lastHeartbeat = now;
        this.logger.debug?.(`[discord-voice] 心跳正常，服务器 ${session.guildId}`);
      } else if (session.lastHeartbeat && (now - session.lastHeartbeat > this.HEARTBEAT_TIMEOUT_MS)) {
        // 连接不健康时间太长
        this.logger.warn(`[discord-voice] 心跳超时，连接状态: ${connectionState}`);
        
        // 如果不在重连中，触发重连
        if (!session.reconnecting) {
          this.logger.info(`[discord-voice] 触发重连（心跳超时）`);
          session.connection.destroy();
        }
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * 离开语音频道
   * 
   * @param guildId - 服务器ID
   * @returns 是否成功离开
   */
  async leave(guildId: string): Promise<boolean> {
    const session = this.sessions.get(guildId);
    if (!session) {
      return false;
    }

    // 清除心跳
    if (session.heartbeatInterval) {
      clearInterval(session.heartbeatInterval);
    }

    // 清除所有用户定时器和流
    for (const state of session.userAudioStates.values()) {
      if (state.silenceTimer) {
        clearTimeout(state.silenceTimer);
      }
      if (state.opusStream) {
        state.opusStream.destroy();
      }
      if (state.decoder) {
        state.decoder.destroy();
      }
    }

    // 关闭流式STT会话
    if (this.streamingSTT) {
      for (const userId of session.userAudioStates.keys()) {
        this.streamingSTT.closeSession(userId);
      }
    }

    session.connection.destroy();
    this.sessions.delete(guildId);
    this.logger.info(`[discord-voice] 已离开服务器 ${guildId} 中的语音频道`);
    return true;
  }

  /**
   * 开始监听语音频道中的语音
   * 
   * 使用Discord.js的receiver订阅用户语音
   * 检测语音开始和结束事件
   * 
   * @param session - 语音会话
   */
  private startListening(session: VoiceSession): void {
    const receiver = session.connection.receiver;

    // 语音开始事件
    receiver.speaking.on("start", (userId: string) => {
      // ═══════════════════════════════════════════════════════════════
      // 回声过滤：忽略机器人自己的语音事件
      // 这是防止回声触发打断的主要防御
      // ═══════════════════════════════════════════════════════════════
      if (this.botUserId && userId === this.botUserId) {
        this.logger.debug?.(`[discord-voice] 忽略机器人自己的语音（回声过滤）`);
        return;
      }
      
      // 检查用户是否有权限
      if (!this.isUserAllowed(userId)) {
        return;
      }

      // 忽略冷却期内的语音（防止残留回声误触发）
      const SPEAK_COOLDOWN_MS = 500;
      if (session.lastSpokeAt && (Date.now() - session.lastSpokeAt) < SPEAK_COOLDOWN_MS) {
        this.logger.debug?.(`[discord-voice] 忽略冷却期内的语音（可能是残留回声）`);
        return;
      }

      this.logger.debug?.(`[discord-voice] 用户 ${userId} 开始说话`);
      
      // ═══════════════════════════════════════════════════════════════
      // 打断功能：如果正在说话且真实用户开始说话，则停止
      // 现在我们已经过滤了机器人的userId，可以安全地执行打断
      // ═══════════════════════════════════════════════════════════════
      if (session.speaking) {
        if (this.config.bargeIn) {
          this.logger.info(`[discord-voice] 检测到用户 ${userId} 的打断！停止播放。`);
          this.stopSpeaking(session);
          session.lastSpokeAt = Date.now();
        }
        // 清除流式转录，等待下一次语音事件
        if (this.streamingSTT) {
          this.streamingSTT.closeSession(userId);
        }
        return;
      }
      
      // 如果正在处理另一个请求，不开始新录音
      if (session.processing) {
        if (this.streamingSTT) {
          this.streamingSTT.closeSession(userId);
        }
        this.logger.debug?.(`[discord-voice] 忽略正在处理中的语音`);
        return;
      }

      let state = session.userAudioStates.get(userId);
      if (!state) {
        state = {
          chunks: [],
          lastActivityMs: Date.now(),
          isRecording: false,
        };
        session.userAudioStates.set(userId, state);
      }

      // 清除现有的静音定时器
      if (state.silenceTimer) {
        clearTimeout(state.silenceTimer);
        state.silenceTimer = undefined;
      }

      if (!state.isRecording) {
        state.isRecording = true;
        state.chunks = [];
        this.startRecording(session, userId);
      }

      state.lastActivityMs = Date.now();
    });

    // 语音结束事件
    receiver.speaking.on("end", (userId: string) => {
      if (!this.isUserAllowed(userId)) {
        return;
      }

      this.logger.debug?.(`[discord-voice] 用户 ${userId} 停止说话`);
      
      const state = session.userAudioStates.get(userId);
      if (!state || !state.isRecording) {
        return;
      }

      state.lastActivityMs = Date.now();

      // 设置静音定时器来处理录音
      state.silenceTimer = setTimeout(async () => {
        if (state.isRecording && state.chunks.length > 0) {
          state.isRecording = false;
          
          // 清理流
          if (state.opusStream) {
            state.opusStream.destroy();
            state.opusStream = undefined;
          }
          if (state.decoder) {
            state.decoder.destroy();
            state.decoder = undefined;
          }
          
          await this.processRecording(session, userId, state.chunks);
          state.chunks = [];
        }
      }, this.config.silenceThresholdMs);
    });
  }

  /**
   * 停止当前语音播放（用于打断）
   * 
   * @param session - 语音会话
   */
  private stopSpeaking(session: VoiceSession): void {
    // 停止主播放器
    if (session.player.state.status !== AudioPlayerStatus.Idle) {
      session.player.stop(true);
    }
    
    // 停止思考声音播放器（如果正在播放）
    if (session.thinkingPlayer && session.thinkingPlayer.state.status !== AudioPlayerStatus.Idle) {
      session.thinkingPlayer.stop(true);
      session.thinkingPlayer.removeAllListeners();
      session.thinkingPlayer = undefined;
    }

    session.speaking = false;
  }

  /**
   * 开始录制用户的音频
   * 
   * 使用Opus解码器将Discord的Opus音频转换为PCM
 * 支持流式STT（如果已启用）
   * 
   * @param session - 语音会话
   * @param userId - 用户ID
   */
  private startRecording(session: VoiceSession, userId: string): void {
    const state = session.userAudioStates.get(userId);
    if (!state) return;

    // 订阅用户音频流，设置为静音后结束
    const opusStream = session.connection.receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: this.config.silenceThresholdMs,
      },
    });

    state.opusStream = opusStream;

    // 创建Opus解码器
    const decoder = new prism.opus.Decoder({
      rate: 48000,
      channels: 1,
      frameSize: 960,
    });

    state.decoder = decoder;
    opusStream.pipe(decoder);

    // 如果启用了流式STT，使用流式模式
    const useStreaming = this.streamingSTT && this.config.sttProvider === "deepgram" && this.config.streamingSTT;
    
    if (useStreaming && this.streamingSTT) {
      // 为该用户创建流式会话
      const streamingSession = this.streamingSTT.getOrCreateSession(userId, (text, isFinal) => {
        if (isFinal) {
          this.logger.debug?.(`[discord-voice] 流式转录（最终）: "${text}"`);
        } else {
          this.logger.debug?.(`[discord-voice] 流式转录（临时）: "${text}"`);
        }
      });

      decoder.on("data", (chunk: Buffer) => {
        if (state.isRecording) {
          // 发送到流式STT
          this.streamingSTT?.sendAudio(userId, chunk);
          
          // 同时缓冲用于回退/调试
          state.chunks.push(chunk);
          state.lastActivityMs = Date.now();

          // 检查最大录音长度
          const totalSize = state.chunks.reduce((sum, c) => sum + c.length, 0);
          const durationMs = (totalSize / 2) / 48; // 48kHz的16位采样
          if (durationMs >= this.config.maxRecordingMs) {
            this.logger.debug?.(`[discord-voice] 用户 ${userId} 达到最大录音长度`);
            state.isRecording = false;
            this.processRecording(session, userId, state.chunks);
            state.chunks = [];
          }
        }
      });
    } else {
      // 批量模式 - 只缓冲音频
      decoder.on("data", (chunk: Buffer) => {
        if (state.isRecording) {
          state.chunks.push(chunk);
          state.lastActivityMs = Date.now();

          // 检查最大录音长度
          const totalSize = state.chunks.reduce((sum, c) => sum + c.length, 0);
          const durationMs = (totalSize / 2) / 48; // 48kHz的16位采样
          if (durationMs >= this.config.maxRecordingMs) {
            this.logger.debug?.(`[discord-voice] 用户 ${userId} 达到最大录音长度`);
            state.isRecording = false;
            this.processRecording(session, userId, state.chunks);
            state.chunks = [];
          }
        }
      });
    }

    decoder.on("end", () => {
      this.logger.debug?.(`[discord-voice] 用户 ${userId} 的解码器流结束`);
    });

    decoder.on("error", (error: Error) => {
      this.logger.error(`[discord-voice] 用户 ${userId} 的解码器错误: ${error.message}`);
    });
  }

  /**
   * 处理录音：通过STT转录，发送到代理，获取响应
   * 
   * 处理流程：
   * 1. 检查各种过滤器（时长、音量、是否正在说话等）
   * 2. 通过STT提供商转录音频
   * 3. 调用onTranscript回调获取代理响应
   * 4. 通过TTS合成响应并播放
   * 
   * @param session - 语音会话
   * @param userId - 用户ID
   * @param chunks - 音频数据块
   */
  private async processRecording(session: VoiceSession, userId: string, chunks: Buffer[]): Promise<void> {
    if (!this.sttProvider || !this.ttsProvider) {
      return;
    }

    // 如果正在说话，跳过（防止重叠响应）
    if (session.speaking) {
      this.logger.debug?.(`[discord-voice] 跳过处理 - 正在说话`);
      return;
    }

    // 如果正在处理另一个请求，跳过（防止重复响应）
    if (session.processing) {
      this.logger.debug?.(`[discord-voice] 跳过处理 - 正在处理另一个请求`);
      return;
    }

    // 说话后的冷却期，防止回声/意外触发（500ms）
    const SPEAK_COOLDOWN_MS = 500;
    if (session.lastSpokeAt && (Date.now() - session.lastSpokeAt) < SPEAK_COOLDOWN_MS) {
      this.logger.debug?.(`[discord-voice] 跳过处理 - 处于说话后的冷却期`);
      return;
    }

    const audioBuffer = Buffer.concat(chunks);
    
    // 跳过非常短的录音（可能是噪音）- 在设置处理锁之前检查
    const durationMs = (audioBuffer.length / 2) / 48; // 48kHz的16位采样
    if (durationMs < this.config.minAudioMs) {
      this.logger.debug?.(`[discord-voice] 跳过短录音（${Math.round(durationMs)}ms < ${this.config.minAudioMs}ms）用户 ${userId}`);
      return;
    }

    // 计算RMS振幅以过滤 quiet 的声音（按键声、背景噪音等）
    const rms = this.calculateRMS(audioBuffer);
    const minRMS = getRmsThreshold(this.config.vadSensitivity);
    if (rms < minRMS) {
      this.logger.debug?.(`[discord-voice] 跳过 quiet 音频（RMS ${Math.round(rms)} < ${minRMS}）用户 ${userId}`);
      return;
    }

    // 通过所有过滤器后设置处理锁
    session.processing = true;

    this.logger.info(`[discord-voice] 处理用户 ${userId}} 的 ${Math.round(durationMs)}ms 音频（RMS: ${Math.round(rms)}）`);

    try {
      let transcribedText: string;

      // 检查是否有可用的流式转录
      if (this.streamingSTT && this.config.sttProvider === "deepgram" && this.config.streamingSTT) {
        // 从流式会话获取累积的转录
        transcribedText = this.streamingSTT.finalizeSession(userId);
        
        // 如果流式转录为空，回退到批量STT
        if (!transcribedText || transcribedText.trim().length === 0) {
          this.logger.debug?.(`[discord-voice] 流式转录为空，回退到批量STT`);
          const sttResult = await this.sttProvider.transcribe(audioBuffer, 48000);
          transcribedText = sttResult.text;
        }
      } else {
        // 批量转录
        const sttResult = await this.sttProvider.transcribe(audioBuffer, 48000);
        transcribedText = sttResult.text;
      }
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        this.logger.debug?.(`[discord-voice] 用户 ${userId} 的转录为空`);
        session.processing = false;
        return;
      }

      this.logger.info(`[discord-voice] 转录结果: "${transcribedText}"`);

      // 在处理时播放循环思考声音
      const stopThinking = await this.startThinkingLoop(session);

      let response: string;
      try {
        // 从代理获取响应
        response = await this.onTranscript(userId, session.guildId, session.channelId, transcribedText);
      } finally {
        // 总是停止思考声音，即使发生错误
        stopThinking();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!response || response.trim().length === 0) {
        session.processing = false;
        return;
      }

      // 确保主播放器已订阅
      session.connection.subscribe(session.player);
      
      // 合成并播放响应
      await this.speak(session.guildId, response);
    } catch (error) {
      this.logger.error(`[discord-voice] 处理音频错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      session.processing = false;
    }
  }

  /**
   * 在语音频道中说话
   * 
   * 使用TTS将文本转换为音频并播放
   * 优先使用流式TTS（更低延迟）
   * 
   * @param guildId - 服务器ID
   * @param text - 要说的文本
   */
  async speak(guildId: string, text: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) {
      throw new Error("未连接到语音频道");
    }

    this.ensureProviders();

    if (!this.streamingTTS && !this.ttsProvider) {
      throw new Error("TTS提供商未初始化");
    }

    session.speaking = true;
    session.startedSpeakingAt = Date.now();

    try {
      this.logger.info(`[discord-voice] 说话: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`);
      
      let resource;

      // 优先尝试流式TTS（更低延迟）
      if (this.streamingTTS) {
        try {
          const streamResult = await this.streamingTTS.synthesizeStream(text);
          
          // 从流创建音频资源
          if (streamResult.format === "opus") {
            resource = createAudioResource(streamResult.stream, {
              inputType: StreamType.OggOpus,
            });
          } else {
            // 对于mp3，音频播放器会转码
            resource = createAudioResource(streamResult.stream);
          }
          
          this.logger.debug?.(`[discord-voice] 使用流式TTS`);
        } catch (streamError) {
          this.logger.warn(`[discord-voice] 流式TTS失败，回退到缓冲TTS: ${streamError instanceof Error ? streamError.message : String(streamError)}`);
          // 回退到缓冲TTS
        }
      }

      // 回退到缓冲TTS
      if (!resource && this.ttsProvider) {
        const ttsResult = await this.ttsProvider.synthesize(text);
        
        if (ttsResult.format === "opus") {
          resource = createAudioResource(Readable.from(ttsResult.audioBuffer), {
            inputType: StreamType.OggOpus,
          });
        } else {
          resource = createAudioResource(Readable.from(ttsResult.audioBuffer));
        }
        
        this.logger.debug?.(`[discord-voice] 使用缓冲TTS`);
      }

      if (!resource) {
        throw new Error("创建音频资源失败");
      }

      session.player.play(resource);

      // 等待播放完成
      await new Promise<void>((resolve) => {
        const onIdle = () => {
          session.speaking = false;
          session.lastSpokeAt = Date.now(); // 设置冷却时间戳
          session.player.off(AudioPlayerStatus.Idle, onIdle);
          session.player.off("error", onError);
          resolve();
        };
        
        const onError = (error: Error) => {
          this.logger.error(`[discord-voice] 播放错误: ${error.message}`);
          session.speaking = false;
          session.lastSpokeAt = Date.now(); // 设置冷却时间戳
          session.player.off(AudioPlayerStatus.Idle, onIdle);
          session.player.off("error", onError);
          resolve();
        };

        session.player.on(AudioPlayerStatus.Idle, onIdle);
        session.player.on("error", onError);
      });
    } catch (error) {
      session.speaking = false;
      session.lastSpokeAt = Date.now(); // 设置冷却时间戳
      throw error;
    }
  }

  /**
   * 启动循环思考声音，返回停止函数
   * 
   * 在等待代理响应时播放思考声音
   * 让用户知道机器人正在处理
   * 
   * @param session - 语音会话
   * @returns 停止函数
   */
  private async startThinkingLoop(session: VoiceSession): Promise<() => void> {
    let stopped = false;
    
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const thinkingPath = path.join(__dirname, "..", "assets", "thinking.mp3");
      
      if (!fs.existsSync(thinkingPath)) {
        return () => {};
      }

      const audioData = fs.readFileSync(thinkingPath);
      
      // 为思考声音创建独立播放器
      const thinkingPlayer = createAudioPlayer();
      session.thinkingPlayer = thinkingPlayer;
      session.connection.subscribe(thinkingPlayer);

      const playLoop = () => {
        if (stopped || !thinkingPlayer) return;
        const resource = createAudioResource(Readable.from(Buffer.from(audioData)), {
          inlineVolume: true,
        });
        resource.volume?.setVolume(0.7);
        thinkingPlayer.play(resource);
      };

      thinkingPlayer.on(AudioPlayerStatus.Idle, playLoop);
      playLoop(); // 开始第一次播放

      return () => {
        stopped = true;
        if (thinkingPlayer) {
          thinkingPlayer.removeAllListeners();
          thinkingPlayer.stop(true);
        }
        session.thinkingPlayer = undefined;
        // 立即重新订阅主播放器
        session.connection.subscribe(session.player);
      };
    } catch (error) {
      this.logger.debug?.(`[discord-voice] 启动思考循环错误: ${error instanceof Error ? error.message : String(error)}`);
      return () => {
        session.thinkingPlayer = undefined;
        session.connection.subscribe(session.player);
      };
    }
  }

  /**
   * 计算音频缓冲区的RMS（均方根）振幅
   * 
   * 用于过滤 quiet 的声音，如按键声和背景噪音
   * 
   * @param audioBuffer - 音频数据缓冲区
   * @returns RMS振幅值
   */
  private calculateRMS(audioBuffer: Buffer): number {
    // 音频是16位有符号PCM
    const samples = audioBuffer.length / 2;
    if (samples === 0) return 0;

    let sumSquares = 0;
    for (let i = 0; i < audioBuffer.length; i += 2) {
      const sample = audioBuffer.readInt16LE(i);
      sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / samples);
  }

  /**
   * 检查用户是否被允许使用语音功能
   * 
   * @param userId - 用户ID
   * @returns 是否允许
   */
  private isUserAllowed(userId: string): boolean {
    if (this.config.allowedUsers.length === 0) {
      return true;
    }
    return this.config.allowedUsers.includes(userId);
  }

  /**
   * 获取服务器的会话
   * 
   * @param guildId - 服务器ID
   * @returns 语音会话（如果存在）
   */
  getSession(guildId: string): VoiceSession | undefined {
    return this.sessions.get(guildId);
  }

  /**
   * 获取所有活跃会话
   * 
   * @returns 语音会话数组
   */
  getAllSessions(): VoiceSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 销毁所有连接
   */
  async destroy(): Promise<void> {
    // 关闭流式STT
    if (this.streamingSTT) {
      this.streamingSTT.closeAll();
    }

    const guildIds = Array.from(this.sessions.keys());
    for (const guildId of guildIds) {
      await this.leave(guildId);
    }
  }
}
