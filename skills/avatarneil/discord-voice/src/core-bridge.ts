/**
 * 核心桥接模块
 * 
 * 提供与Clawdbot核心功能的桥接接口
 * 用于加载核心依赖、管理会话、运行代理等
 * 
 * 主要功能：
 * - 动态加载核心模块依赖
 * - 解析Clawdbot根目录
 * - 提供代理运行、会话管理、工作区管理等核心功能
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { VoiceCallTtsConfig } from "./config.js";

/**
 * 核心配置类型
 */
export type CoreConfig = {
  /** 会话存储配置 */
  session?: {
    store?: string;
  };
  /** 消息配置 */
  messages?: {
    tts?: VoiceCallTtsConfig;
  };
  [key: string]: unknown;
};

/**
 * 核心代理依赖接口
 * 
 * 定义了与Clawdbot核心交互所需的所有方法
 */
type CoreAgentDeps = {
  /** 解析代理目录路径 */
  resolveAgentDir: (cfg: CoreConfig, agentId: string) => string;
  /** 解析代理工作区目录路径 */
  resolveAgentWorkspaceDir: (cfg: CoreConfig, agentId: string) => string;
  /** 解析代理身份信息 */
  resolveAgentIdentity: (
    cfg: CoreConfig,
    agentId: string,
  ) => { name?: string | null } | null | undefined;
  /** 解析默认思考级别 */
  resolveThinkingDefault: (params: {
    cfg: CoreConfig;
    provider?: string;
    model?: string;
  }) => string;
  /** 运行嵌入式PI代理 */
  runEmbeddedPiAgent: (params: {
    sessionId: string;
    sessionKey?: string;
    messageProvider?: string;
    sessionFile: string;
    workspaceDir: string;
    config?: CoreConfig;
    prompt: string;
    provider?: string;
    model?: string;
    thinkLevel?: string;
    verboseLevel?: string;
    timeoutMs: number;
    runId: string;
    lane?: string;
    extraSystemPrompt?: string;
    agentDir?: string;
  }) => Promise<{
    payloads?: Array<{ text?: string; isError?: boolean }>;
    meta?: { aborted?: boolean };
  }>;
  /** 解析代理超时时间 */
  resolveAgentTimeoutMs: (opts: { cfg: CoreConfig }) => number;
  /** 确保工作区目录存在 */
  ensureAgentWorkspace: (params?: { dir: string }) => Promise<void>;
  /** 解析存储路径 */
  resolveStorePath: (store?: string, opts?: { agentId?: string }) => string;
  /** 加载会话存储 */
  loadSessionStore: (storePath: string) => Record<string, unknown>;
  /** 保存会话存储 */
  saveSessionStore: (
    storePath: string,
    store: Record<string, unknown>,
  ) => Promise<void>;
  /** 解析会话文件路径 */
  resolveSessionFilePath: (
    sessionId: string,
    entry: unknown,
    opts?: { agentId?: string },
  ) => string;
  /** 默认模型名称 */
  DEFAULT_MODEL: string;
  /** 默认提供商名称 */
  DEFAULT_PROVIDER: string;
};

/**
 * Clawdbot根目录缓存
 */
let coreRootCache: string | null = null;
/**
 * 核心依赖Promise缓存（避免重复加载）
 */
let coreDepsPromise: Promise<CoreAgentDeps> | null = null;

/**
 * 查找指定包的根目录
 * 
 * 从起始目录向上遍历目录树，查找指定名称的npm包
 * 
 * @param startDir - 起始搜索目录
 * @param name - 要查找的包名
 * @returns 包的根目录路径，未找到则返回null
 */
function findPackageRoot(startDir: string, name: string): string | null {
  let dir = startDir;
  for (;;) {
    const pkgPath = path.join(dir, "package.json");
    try {
      if (fs.existsSync(pkgPath)) {
        const raw = fs.readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(raw) as { name?: string };
        if (pkg.name === name) return dir;
      }
    } catch {
      // 忽略解析错误，继续向上遍历
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * 解析Clawdbot根目录
 * 
 * 优先使用CLAWDBOT_ROOT环境变量
 * 否则从多个候选路径搜索clawdbot包
 * 
 * @returns Clawdbot包根目录路径
 * @throws 如果无法解析根目录则抛出错误
 */
function resolveClawdbotRoot(): string {
  if (coreRootCache) return coreRootCache;
  const override = process.env.CLAWDBOT_ROOT?.trim();
  if (override) {
    coreRootCache = override;
    return override;
  }

  const candidates = new Set<string>();
  if (process.argv[1]) {
    candidates.add(path.dirname(process.argv[1]));
  }
  candidates.add(process.cwd());
  try {
    const urlPath = fileURLToPath(import.meta.url);
    candidates.add(path.dirname(urlPath));
  } catch {
    // 忽略错误
  }

  for (const start of candidates) {
    const found = findPackageRoot(start, "clawdbot");
    if (found) {
      coreRootCache = found;
      return found;
    }
  }

  throw new Error(
    "无法解析Clawdbot根目录。请设置CLAWDBOT_ROOT环境变量为包根目录。",
  );
}

/**
 * 导入核心模块
 * 
 * 从Clawdbot的dist目录动态导入指定模块
 * 
 * @param relativePath - 相对于dist目录的模块路径
 * @returns 导入的模块实例
 * @throws 如果模块文件不存在
 */
async function importCoreModule<T>(relativePath: string): Promise<T> {
  const root = resolveClawdbotRoot();
  const distPath = path.join(root, "dist", relativePath);
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `核心模块不存在于 ${distPath}。请运行 pnpm build 或安装官方包。`,
    );
  }
  return (await import(pathToFileURL(distPath).href)) as T;
}

/**
 * 加载核心代理依赖
 * 
 * 并行加载所有核心模块并组合成统一的依赖接口
 * 使用缓存避免重复加载
 * 
 * @returns 核心代理依赖Promise
 */
export async function loadCoreAgentDeps(): Promise<CoreAgentDeps> {
  if (coreDepsPromise) return coreDepsPromise;

  coreDepsPromise = (async () => {
    const [
      agentScope,
      defaults,
      identity,
      modelSelection,
      piEmbedded,
      timeout,
      workspace,
      sessions,
    ] = await Promise.all([
      // 代理范围解析模块
      importCoreModule<{
        resolveAgentDir: CoreAgentDeps["resolveAgentDir"];
        resolveAgentWorkspaceDir: CoreAgentDeps["resolveAgentWorkspaceDir"];
      }>("agents/agent-scope.js"),
      // 默认配置模块
      importCoreModule<{
        DEFAULT_MODEL: string;
        DEFAULT_PROVIDER: string;
      }>("agents/defaults.js"),
      // 身份解析模块
      importCoreModule<{
        resolveAgentIdentity: CoreAgentDeps["resolveAgentIdentity"];
      }>("agents/identity.js"),
      // 模型选择模块
      importCoreModule<{
        resolveThinkingDefault: CoreAgentDeps["resolveThinkingDefault"];
      }>("agents/model-selection.js"),
      // 嵌入式PI代理模块
      importCoreModule<{
        runEmbeddedPiAgent: CoreAgentDeps["runEmbeddedPiAgent"];
      }>("agents/pi-embedded.js"),
      // 超时解析模块
      importCoreModule<{
        resolveAgentTimeoutMs: CoreAgentDeps["resolveAgentTimeoutMs"];
      }>("agents/timeout.js"),
      // 工作区管理模块
      importCoreModule<{
        ensureAgentWorkspace: CoreAgentDeps["ensureAgentWorkspace"];
      }>("agents/workspace.js"),
      // 会话管理模块
      importCoreModule<{
        resolveStorePath: CoreAgentDeps["resolveStorePath"];
        loadSessionStore: CoreAgentDeps["loadSessionStore"];
        saveSessionStore: CoreAgentDeps["saveSessionStore"];
        resolveSessionFilePath: CoreAgentDeps["resolveSessionFilePath"];
      }>("config/sessions.js"),
    ]);

    return {
      resolveAgentDir: agentScope.resolveAgentDir,
      resolveAgentWorkspaceDir: agentScope.resolveAgentWorkspaceDir,
      resolveAgentIdentity: identity.resolveAgentIdentity,
      resolveThinkingDefault: modelSelection.resolveThinkingDefault,
      runEmbeddedPiAgent: piEmbedded.runEmbeddedPiAgent,
      resolveAgentTimeoutMs: timeout.resolveAgentTimeoutMs,
      ensureAgentWorkspace: workspace.ensureAgentWorkspace,
      resolveStorePath: sessions.resolveStorePath,
      loadSessionStore: sessions.loadSessionStore,
      saveSessionStore: sessions.saveSessionStore,
      resolveSessionFilePath: sessions.resolveSessionFilePath,
      DEFAULT_MODEL: defaults.DEFAULT_MODEL,
      DEFAULT_PROVIDER: defaults.DEFAULT_PROVIDER,
    };
  })();

  return coreDepsPromise;
}
