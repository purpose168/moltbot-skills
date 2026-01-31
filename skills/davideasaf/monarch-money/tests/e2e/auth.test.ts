/**
 * 认证端到端测试
 * Authentication E2E Tests
 * 
 * 测试与 Monarch Money API 的认证流程。
 * Tests authentication flow with Monarch Money API.
 * 
 * 这些测试是只读的，可安全用于自动化执行。
 * These tests are READ-ONLY and safe for automated execution.
 */

// 导入 MonarchClient 类用于测试
import { MonarchClient } from '../../lib';

// Monarch Money API 基础 URL
const MONARCH_API_URL = 'https://api.monarch.com';

/**
 * 认证测试套件
 * 包含所有认证相关的端到端测试用例
 */
describe('认证 / Authentication', () => {
  let client: MonarchClient;  // 测试使用的客户端实例

  /**
   * 每个测试用例执行前初始化客户端
   * 创建一个新的 MonarchClient 实例用于测试
   */
  beforeEach(() => {
    client = new MonarchClient({
      baseURL: MONARCH_API_URL,  // 设置 API 基础 URL
      enablePersistentCache: false  // 禁用持久化缓存以确保测试隔离性
    });
  });

  /**
   * 每个测试用例执行后清理客户端
   * 关闭客户端连接，忽略关闭过程中的错误
   */
  afterEach(async () => {
    try {
      await client.close();
    } catch {
      // 忽略关闭错误，避免影响测试结果
      // Ignore close errors
    }
  });

  /**
   * 测试环境变量是否正确配置
   * 验证认证所需的三个关键环境变量是否存在
   */
  it('应该包含必需的环境变量 / should have required environment variables', () => {
    // 验证邮箱环境变量
    expect(process.env.MONARCH_EMAIL).toBeDefined();
    // 验证密码环境变量
    expect(process.env.MONARCH_PASSWORD).toBeDefined();
    // 验证 MFA 密钥环境变量
    expect(process.env.MONARCH_MFA_SECRET).toBeDefined();
  });

  /**
   * 测试使用有效凭据登录
   * 验证登录功能正常工作，并能够成功调用 API
   * 超时设置为 30 秒
   */
  it('应该使用有效凭据登录成功 / should login with valid credentials', async () => {
    // 从环境变量获取认证信息
    const email = process.env.MONARCH_EMAIL!;
    const password = process.env.MONARCH_PASSWORD!;
    const mfaSecret = process.env.MONARCH_MFA_SECRET;

    // 执行登录操作
    await client.login({
      email,
      password,
      mfaSecretKey: mfaSecret,  // MFA 密钥（可选）
      useSavedSession: false,   // 不使用保存的会话
      saveSession: false        // 不保存会话
    });

    // 验证我们能够成功调用 API
    // Verify we can make an API call
    const accounts = await client.accounts.getAll();
    expect(accounts).toBeDefined();
    expect(Array.isArray(accounts)).toBe(true);
  }, 30000);  // 超时 30 秒

  /**
   * 测试加载已保存的会话
   * 如果存在已保存的会话，验证其有效性
   * 如果没有保存的会话，在 CI 环境中是正常的
   */
  it('如果可用应该加载已保存的会话 / should load saved session if available', async () => {
    // 尝试加载已保存的会话
    const loaded = client.loadSession();

    if (loaded) {
      // 会话存在 - 验证其有效性
      // Session exists - verify it works
      const accounts = await client.accounts.getAll();
      expect(accounts).toBeDefined();
    } else {
      // 没有保存的会话 - 在 CI 环境中是正常的
      // No saved session - this is fine for CI
      console.log('没有找到保存的会话（在 CI 环境中是正常的）');
      // console.log('No saved session found (expected in CI)');
    }
  }, 30000);  // 超时 30 秒

  /**
   * 测试使用密钥自动处理 MFA
   * 如果配置了 MFA 密钥，验证登录过程能够自动处理 MFA 验证
   */
  it('应该使用密钥自动处理 MFA / should handle MFA automatically with secret', async () => {
    const mfaSecret = process.env.MONARCH_MFA_SECRET;

    // 如果没有设置 MFA 密钥，跳过此测试
    if (!mfaSecret) {
      console.log('跳过 MFA 测试 - 未设置 MFA_SECRET');
      // console.log('Skipping MFA test - no MFA_SECRET set');
      return;
    }

    const email = process.env.MONARCH_EMAIL!;
    const password = process.env.MONARCH_PASSWORD!;

    // 登录应该自动处理 MFA
    // Login should handle MFA automatically
    await client.login({
      email,
      password,
      mfaSecretKey: mfaSecret,
      useSavedSession: false,
      saveSession: false
    });

    // 验证认证成功
    // Verify successful auth
    const accounts = await client.accounts.getAll();
    expect(accounts.length).toBeGreaterThan(0);
  }, 30000);  // 超时 30 秒
});
