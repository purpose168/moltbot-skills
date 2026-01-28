/**
 * Clawdbot的Discord语音插件主入口
 * 
 * 实现Discord语音频道中的实时语音对话功能
 * 
 * 功能特性：
 * - 通过斜杠命令加入/离开语音频道（/voice join, /voice leave）
 * - 使用VAD（语音活动检测）监听用户语音
 * - 通过Whisper API或Deepgram进行语音转文本
 * - 将转录文本路由到Clawdbot代理处理
 * - 通过OpenAI或ElevenLabs进行文本转语音
 * - 在语音频道中播放音频响应
 */

import crypto from "node:crypto";
import { Type } from "@sinclair/typebox";
import { Client, GatewayIntentBits, type VoiceBasedChannel, type GuildMember } from "discord.js";

import { parseConfig, type DiscordVoiceConfig } from "./src/config.js";
import { VoiceConnectionManager } from "./src/voice-connection.js";
import { loadCoreAgentDeps, type CoreConfig } from "./src/core-bridge.js";

/**
 * 插件API接口
 * 定义了插件与Clawdbot核心交互的所有方法
 */
interface PluginApi {
  /** 插件配置 */
  pluginConfig: unknown;
  /** 全局配置 */
  config: unknown;
  /** 日志记录器 */
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug?(msg: string): void;
  };
  /** 运行时环境 */
  runtime: {
    /** Discord运行时 */
    discord?: {
      getClient(accountId?: string): Client | null;
    };
    /** 代理运行时 */
    agent?: {
      chat(params: {
        sessionKey: string;
        message: string;
        channel?: string;
        senderId?: string;
      }): Promise<{ text: string }>;
    };
  };
  /** 注册网关RPC方法 */
  registerGatewayMethod(
    name: string,
    handler: (ctx: { params: unknown; respond: (ok: boolean, payload?: unknown) => void }) => void | Promise<void>
  ): void;
  /** 注册工具 */
  registerTool(tool: {
    name: string;
    label: string;
    description: string;
    parameters: unknown;
    execute: (toolCallId: string, params: unknown) => Promise<{
      content: Array<{ type: string; text: string }>;
      details?: unknown;
    }>;
  }): void;
  /** 注册服务 */
  registerService(service: {
    id: string;
    start: () => Promise<void> | void;
    stop: () => Promise<void> | void;
  }): void;
  /** 注册CLI命令 */
  registerCli(
    register: (ctx: { program: unknown }) => void,
    opts?: { commands: string[] }
  ): void;
}

/**
 * 语音工具参数模式
 * 使用TypeBox定义工具的参数结构
 */
const VoiceToolSchema = Type.Union([
  // 加入语音频道操作
  Type.Object({
    action: Type.Literal("join"),
    channelId: Type.String({ description: "要加入的语音频道ID" }),
    guildId: Type.Optional(Type.String({ description: "服务器ID（如果在服务器上下文中可选）" })),
  }),
  // 离开语音频道操作
  Type.Object({
    action: Type.Literal("leave"),
    guildId: Type.Optional(Type.String({ description: "要离开的服务器ID（可选）" })),
  }),
  // 在语音频道中说话操作
  Type.Object({
    action: Type.Literal("speak"),
    text: Type.String({ description: "要在语音频道中说的文本" }),
    guildId: Type.Optional(Type.String({ description: "服务器ID（可选）" })),
  }),
  // 获取状态操作
  Type.Object({
    action: Type.Literal("status"),
  }),
]);

/**
 * Discord语音插件定义
 * 
 * 这是插件的主出口，遵循Clawdbot插件规范
 */
const discordVoicePlugin = {
  /** 插件ID */
  id: "discord-voice",
  /** 插件名称 */
  name: "Discord语音",
  /** 插件描述 */
  description: "在Discord语音频道中进行实时语音对话",

  /** 配置模式 */
  configSchema: {
    parse(value: unknown): DiscordVoiceConfig {
      return parseConfig(value);
    },
  },

  /**
   * 注册插件
   * 
   * 这是插件的初始化入口
   * 负责设置Discord客户端、注册命令和工具、初始化语音管理器等
   */
  register(api: PluginApi) {
    const cfg = parseConfig(api.pluginConfig);
    let voiceManager: VoiceConnectionManager | null = null;
    let discordClient: Client | null = null;
    let clientReady = false;

    // 检查插件是否启用
    if (!cfg.enabled) {
      api.logger.info("[discord-voice] 插件已禁用");
      return;
    }

    // 从主配置获取Discord令牌
    const mainConfig = api.config as { discord?: { token?: string }, channels?: { discord?: { token?: string } } };
    const discordToken = mainConfig?.channels?.discord?.token || mainConfig?.discord?.token;
    
    if (!discordToken) {
      api.logger.error("[discord-voice] 配置中未找到Discord令牌。插件需要配置discord.token。");
      return;
    }

    // 创建具有语音意图的Discord客户端
    discordClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
      ],
    });

    // 客户端就绪事件处理
    discordClient.once("ready", async () => {
      clientReady = true;
      api.logger.info(`[discord-voice] Discord客户端已就绪，身份为 ${discordClient?.user?.tag}`);
      
      // 设置机器人用户ID用于回声过滤
      if (discordClient?.user?.id && voiceManager) {
        voiceManager.setBotUserId(discordClient.user.id);
      }
      
      // 如果配置了自动加入频道
      if (cfg.autoJoinChannel) {
        try {
          api.logger.info(`[discord-voice] 自动加入频道 ${cfg.autoJoinChannel}`);
          // 等待初始化完成
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const channel = await discordClient!.channels.fetch(cfg.autoJoinChannel);
          if (channel && channel.isVoiceBased()) {
            const vm = ensureVoiceManager();
            await vm.join(channel as VoiceBasedChannel);
            api.logger.info(`[discord-voice] 已自动加入语音频道: ${channel.name}`);
          } else {
            api.logger.warn(`[discord-voice] 自动加入频道 ${cfg.autoJoinChannel} 不是语音频道`);
          }
        } catch (error) {
          api.logger.error(`[discord-voice] 自动加入失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });

    // 登录Discord
    discordClient.login(discordToken).catch((err) => {
      api.logger.error(`[discord-voice] 登录失败: ${err instanceof Error ? err.message : String(err)}`);
    });

    /**
     * 处理转录文本 - 路由到代理并获取响应
     * 
     * @param userId - 用户ID
     * @param guildId - 服务器ID
     * @param channelId - 频道ID
     * @param text - 转录的文本
     * @returns 代理的响应文本
     */
    async function handleTranscript(
      userId: string,
      guildId: string,
      channelId: string,
      text: string
    ): Promise<string> {
      api.logger.info(`[discord-voice] 处理来自 ${userId} 的转录文本: "${text}"`);

      try {
        const deps = await loadCoreAgentDeps();
        if (!deps) {
          api.logger.error("[discord-voice] 无法加载核心依赖");
          return "我目前无法连接我的大脑。";
        }

        const coreConfig = api.config as CoreConfig;
        const agentId = "main";
        
        // 基于服务器构建会话键
        const sessionKey = `discord:voice:${guildId}`;
        
        // 解析各种路径
        const storePath = deps.resolveStorePath(coreConfig.session?.store, { agentId });
        const agentDir = deps.resolveAgentDir(coreConfig, agentId);
        const workspaceDir = deps.resolveAgentWorkspaceDir(coreConfig, agentId);

        // 确保工作区存在
        await deps.ensureAgentWorkspace({ dir: workspaceDir });

        // 加载或创建会话条目
        const sessionStore = deps.loadSessionStore(storePath);
        const now = Date.now();
        type SessionEntry = { sessionId: string; updatedAt: number };
        let sessionEntry = sessionStore[sessionKey] as SessionEntry | undefined;

        if (!sessionEntry) {
          sessionEntry = {
            sessionId: crypto.randomUUID(),
            updatedAt: now,
          };
          sessionStore[sessionKey] = sessionEntry;
          await deps.saveSessionStore(storePath, sessionStore);
        }

        const sessionId = sessionEntry.sessionId;
        const sessionFile = deps.resolveSessionFilePath(sessionId, sessionEntry, { agentId });

        // 解析模型 - 如果配置了语音专用模型则使用，否则使用默认
        const modelRef = cfg.model || `${deps.DEFAULT_PROVIDER}/${deps.DEFAULT_MODEL}`;
        const slashIndex = modelRef.indexOf("/");
        const provider = slashIndex === -1 ? deps.DEFAULT_PROVIDER : modelRef.slice(0, slashIndex);
        const model = slashIndex === -1 ? modelRef : modelRef.slice(slashIndex + 1);

        // 解析思考级别 - 语音对话默认使用"off"以获得最快响应
        const thinkLevel = cfg.thinkLevel || "off";

        // 解析代理身份
        const identity = deps.resolveAgentIdentity(coreConfig, agentId);
        const agentName = identity?.name?.trim() || "assistant";

        // 构建额外的系统提示
        const extraSystemPrompt = `你是 ${agentName}，在Discord语音频道中说话。保持响应简洁会话式（最多1-2句话）。自然友好。你拥有所有正常工具和技能的访问权限。用户的Discord ID是 ${userId}。`;

        const timeoutMs = deps.resolveAgentTimeoutMs({ cfg: coreConfig });
        const runId = `discord-voice:${guildId}:${Date.now()}`;

        // 运行嵌入式PI代理
        const result = await deps.runEmbeddedPiAgent({
          sessionId,
          sessionKey,
          messageProvider: "discord",
          sessionFile,
          workspaceDir,
          config: coreConfig,
          prompt: text,
          provider,
          model,
          thinkLevel,
          verboseLevel: "off",
          timeoutMs,
          runId,
          // lane: "discord-voice",  // 已移除 - 可能会限制工具访问
          extraSystemPrompt,
          agentDir,
        });

        // 从payload中提取文本
        const texts = (result.payloads ?? [])
          .filter((p) => p.text && !p.isError)
          .map((p) => p.text?.trim())
          .filter(Boolean);

        return texts.join(" ") || "";
      } catch (error) {
        api.logger.error(`[discord-voice] 代理聊天错误: ${error instanceof Error ? error.message : String(error)}`);
        return "抱歉，处理您的请求时遇到错误。";
      }
    }

    /**
     * 确保语音管理器已初始化
     * 
     * @returns 语音连接管理器实例
     */
    function ensureVoiceManager(): VoiceConnectionManager {
      if (!voiceManager) {
        const botUserId = discordClient?.user?.id;
        voiceManager = new VoiceConnectionManager(cfg, api.logger, handleTranscript, botUserId);
      }
      return voiceManager;
    }

    /**
     * 获取Discord客户端
     * 
     * @returns Discord客户端实例，如果未就绪则返回null
     */
    function getDiscordClient(): Client | null {
      if (!clientReady) {
        api.logger.warn("[discord-voice] Discord客户端尚未就绪");
        return null;
      }
      return discordClient;
    }

    // ═══════════════════════════════════════════════════════════════
    // 注册网关RPC方法
    // ═══════════════════════════════════════════════════════════════

    // 加入语音频道方法
    api.registerGatewayMethod("discord-voice.join", async ({ params, respond }) => {
      try {
        const p = params as { channelId?: string; guildId?: string } | null;
        const channelId = p?.channelId;
        const guildId = p?.guildId;

        if (!channelId) {
          respond(false, { error: "需要channelId参数" });
          return;
        }

        const client = getDiscordClient();
        if (!client) {
          respond(false, { error: "Discord客户端不可用" });
          return;
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel || !("guild" in channel) || !channel.isVoiceBased()) {
          respond(false, { error: "无效的语音频道" });
          return;
        }

        const vm = ensureVoiceManager();
        const session = await vm.join(channel as VoiceBasedChannel);
        
        respond(true, {
          joined: true,
          guildId: session.guildId,
          channelId: session.channelId,
        });
      } catch (error) {
        respond(false, { error: error instanceof Error ? error.message : String(error) });
      }
    });

    // 离开语音频道方法
    api.registerGatewayMethod("discord-voice.leave", async ({ params, respond }) => {
      try {
        const p = params as { guildId?: string } | null;
        let guildId = p?.guildId;

        const vm = ensureVoiceManager();
        
        // 如果没有提供guildId，则离开所有
        if (!guildId) {
          const sessions = vm.getAllSessions();
          if (sessions.length === 0) {
            respond(true, { left: false, reason: "不在任何语音频道中" });
            return;
          }
          guildId = sessions[0].guildId;
        }

        const left = await vm.leave(guildId);
        respond(true, { left, guildId });
      } catch (error) {
        respond(false, { error: error instanceof Error ? error.message : String(error) });
      }
    });

    // 在语音频道中说话方法
    api.registerGatewayMethod("discord-voice.speak", async ({ params, respond }) => {
      try {
        const p = params as { text?: string; guildId?: string } | null;
        const text = p?.text;
        let guildId = p?.guildId;

        if (!text) {
          respond(false, { error: "需要text参数" });
          return;
        }

        const vm = ensureVoiceManager();
        
        if (!guildId) {
          const sessions = vm.getAllSessions();
          if (sessions.length === 0) {
            respond(false, { error: "不在任何语音频道中" });
            return;
          }
          guildId = sessions[0].guildId;
        }

        await vm.speak(guildId, text);
        respond(true, { spoken: true });
      } catch (error) {
        respond(false, { error: error instanceof Error ? error.message : String(error) });
      }
    });

    // 获取状态方法
    api.registerGatewayMethod("discord-voice.status", async ({ respond }) => {
      try {
        const vm = ensureVoiceManager();
        const sessions = vm.getAllSessions().map((s) => ({
          guildId: s.guildId,
          channelId: s.channelId,
          speaking: s.speaking,
          usersListening: s.userAudioStates.size,
        }));
        respond(true, { sessions });
      } catch (error) {
        respond(false, { error: error instanceof Error ? error.message : String(error) });
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // 注册代理工具
    // ═══════════════════════════════════════════════════════════════

    api.registerTool({
      name: "discord_voice",
      label: "Discord语音",
      description: "控制Discord语音频道 - 加入、离开、说话或获取状态",
      parameters: VoiceToolSchema,
      async execute(_toolCallId, params) {
        const json = (payload: unknown) => ({
          content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
          details: payload,
        });

        try {
          const p = params as { action: string; channelId?: string; guildId?: string; text?: string };
          const vm = ensureVoiceManager();
          const client = getDiscordClient();

          switch (p.action) {
            case "join": {
              if (!p.channelId) throw new Error("需要channelId参数");
              if (!client) throw new Error("Discord客户端不可用");
              
              const channel = await client.channels.fetch(p.channelId);
              if (!channel || !("guild" in channel) || !channel.isVoiceBased()) {
                throw new Error("无效的语音频道");
              }
              
              const session = await vm.join(channel as VoiceBasedChannel);
              return json({ joined: true, guildId: session.guildId, channelId: session.channelId });
            }

            case "leave": {
              let guildId = p.guildId;
              if (!guildId) {
                const sessions = vm.getAllSessions();
                if (sessions.length === 0) {
                  return json({ left: false, reason: "不在任何语音频道中" });
                }
                guildId = sessions[0].guildId;
              }
              const left = await vm.leave(guildId);
              return json({ left, guildId });
            }

            case "speak": {
              if (!p.text) throw new Error("需要text参数");
              let guildId = p.guildId;
              if (!guildId) {
                const sessions = vm.getAllSessions();
                if (sessions.length === 0) {
                  throw new Error("不在任何语音频道中");
                }
                guildId = sessions[0].guildId;
              }
              await vm.speak(guildId, p.text);
              return json({ spoken: true });
            }

            case "status": {
              const sessions = vm.getAllSessions().map((s) => ({
                guildId: s.guildId,
                channelId: s.channelId,
                speaking: s.speaking,
                usersListening: s.userAudioStates.size,
              }));
              return json({ sessions });
            }

            default:
              throw new Error(`未知操作: ${p.action}`);
          }
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : String(error) });
        }
      },
    });

    // ═══════════════════════════════════════════════════════════════
    // 注册CLI命令
    // ═══════════════════════════════════════════════════════════════

    api.registerCli(
      ({ program }) => {
        const prog = program as any;

        // voice命令组
        const voiceCmd = prog.command("voice").description("Discord语音频道命令");

        // join子命令 - 加入语音频道
        voiceCmd
          .command("join")
          .description("加入Discord语音频道")
          .argument("<channelId>", "语音频道ID")
          .action(async (channelId: string) => {
            const client = getDiscordClient();
            if (!client) {
              console.error("Discord客户端不可用");
              return;
            }

            try {
              const channel = await client.channels.fetch(channelId);
              if (!channel || !("guild" in channel) || !channel.isVoiceBased()) {
                console.error("无效的语音频道");
                return;
              }

              const vm = ensureVoiceManager();
              const session = await vm.join(channel as VoiceBasedChannel);
              console.log(`已加入服务器 ${session.guildId} 中的语音频道`);
            } catch (error) {
              console.error(`加入失败: ${error instanceof Error ? error.message : String(error)}`);
            }
          });

        // leave子命令 - 离开语音频道
        voiceCmd
          .command("leave")
          .description("离开当前语音频道")
          .option("-g, --guild <guildId>", "服务器ID")
          .action(async (opts: { guild?: string }) => {
            const vm = ensureVoiceManager();
            const guildId = opts.guild || vm.getAllSessions()[0]?.guildId;
            
            if (!guildId) {
              console.log("不在任何语音频道中");
              return;
            }

            const left = await vm.leave(guildId);
            console.log(left ? `已离开服务器 ${guildId} 中的语音频道` : "离开失败");
          });

        // status子命令 - 显示语音连接状态
        voiceCmd
          .command("status")
          .description("显示语音连接状态")
          .action(() => {
            const vm = ensureVoiceManager();
            const sessions = vm.getAllSessions();

            if (sessions.length === 0) {
              console.log("未连接到任何语音频道");
              return;
            }

            for (const s of sessions) {
              console.log(`服务器: ${s.guildId}`);
              console.log(`  频道: ${s.channelId}`);
              console.log(`  正在说话: ${s.speaking}`);
              console.log(`  监听用户数: ${s.userAudioStates.size}`);
            }
          });
      },
      { commands: ["voice"] }
    );

    // ═══════════════════════════════════════════════════════════════
    // 注册后台服务
    // ═══════════════════════════════════════════════════════════════

    api.registerService({
      id: "discord-voice",
      start: async () => {
        api.logger.info("[discord-voice] 服务已启动");
      },
      stop: async () => {
        if (voiceManager) {
          await voiceManager.destroy();
          voiceManager = null;
        }
        api.logger.info("[discord-voice] 服务已停止");
      },
    });
  },
};

export default discordVoicePlugin;
