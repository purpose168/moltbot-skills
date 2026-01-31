/**
 * 读取操作端到端测试
 * Read Operations E2E Tests
 * 
 * 测试对 Monarch Money API 的只读操作。
 * Tests read-only operations against Monarch Money API.
 * 
 * 这些测试是只读的，可安全用于自动化执行。
 * These tests are READ-ONLY and safe for automated execution.
 */

// 导入 MonarchClient 类用于测试
import { MonarchClient } from '../../lib';

// Monarch Money API 基础 URL
const MONARCH_API_URL = 'https://api.monarch.com';

/**
 * 读取操作测试套件
 * 包含所有数据读取相关的端到端测试用例
 */
describe('读取操作 / Read Operations', () => {
  let client: MonarchClient;  // 测试使用的客户端实例

  /**
   * 在所有测试执行前初始化
   * 创建客户端并完成登录认证
   * 超时设置为 30 秒以允许登录过程
   */
  beforeAll(async () => {
    // 创建客户端实例
    client = new MonarchClient({
      baseURL: MONARCH_API_URL,  // 设置 API 基础 URL
      enablePersistentCache: false  // 禁用持久化缓存
    });

    // 执行登录操作
    await client.login({
      email: process.env.MONARCH_EMAIL!,           // 从环境变量获取邮箱
      password: process.env.MONARCH_PASSWORD!,     // 从环境变量获取密码
      mfaSecretKey: process.env.MONARCH_MFA_SECRET,  // 从环境变量获取 MFA 密钥
      useSavedSession: true,    // 使用已保存的会话
      saveSession: true         // 保存会话以供后续使用
    });
  }, 30000);  // 超时 30 秒

  /**
   * 在所有测试执行后清理
   * 关闭客户端连接，忽略关闭过程中的错误
   */
  afterAll(async () => {
    try {
      await client.close();
    } catch {
      // 忽略关闭错误，避免影响测试结果
      // Ignore close errors
    }
  });

  /**
   * 交易相关测试子套件
   * 包含交易数据读取的测试用例
   */
  describe('交易 / Transactions', () => {
    /**
     * 测试列出交易功能
     * 验证能够正确获取交易列表
     */
    it('应该列出交易 / should list transactions', async () => {
      // 获取交易列表，限制为 5 条
      const result = await client.transactions.getTransactions({
        limit: 5
      });

      // 验证结果存在
      expect(result).toBeDefined();
      // 验证交易数组存在
      expect(result.transactions).toBeDefined();
      // 验证结果是数组类型
      expect(Array.isArray(result.transactions)).toBe(true);
    }, 30000);  // 超时 30 秒

    /**
     * 测试带日期过滤的交易列表
     * 验证日期过滤功能正常工作
     */
    it('应该能够使用日期过滤列出交易 / should list transactions with date filter', async () => {
      // 计算日期范围：过去 30 天
      const endDate = new Date().toISOString().split('T')[0];  // 结束日期为今天
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)  // 开始日期为 30 天前
        .toISOString()
        .split('T')[0];

      // 使用日期范围获取交易列表
      const result = await client.transactions.getTransactions({
        limit: 10,
        startDate,
        endDate
      });

      // 验证交易数组存在
      expect(result.transactions).toBeDefined();
      // 所有交易都应在日期范围内
      // All transactions should be within date range
      for (const tx of result.transactions) {
        // 验证交易日期不早于开始日期
        expect(new Date(tx.date).getTime()).toBeGreaterThanOrEqual(
          new Date(startDate).getTime()
        );
        // 验证交易日期不晚于结束日期
        expect(new Date(tx.date).getTime()).toBeLessThanOrEqual(
          new Date(endDate).getTime() + 24 * 60 * 60 * 1000
        );
      }
    }, 30000);  // 超时 30 秒

    /**
     * 测试不同详细程度级别的交易查询
     * 验证 ultra-light 和 light 详细程度都能正常工作
     */
    it('应该能够处理不同详细程度的交易 / should handle transaction with verbosity levels', async () => {
      // 获取极简格式的交易列表
      const ultraLight = await client.transactions.getTransactions({
        limit: 3,
        verbosity: 'ultra-light'  // 极简模式，只返回基本信息
      });

      // 获取标准格式的交易列表
      const light = await client.transactions.getTransactions({
        limit: 3,
        verbosity: 'light'  // 标准模式，返回更多详情
      });

      // 验证两种格式都能正常返回
      expect(ultraLight.transactions).toBeDefined();
      expect(light.transactions).toBeDefined();
    }, 30000);  // 超时 30 秒
  });

  /**
   * 分类相关测试子套件
   * 包含分类数据读取的测试用例
   */
  describe('分类 / Categories', () => {
    /**
     * 测试列出所有分类
     * 验证能够正确获取分类列表
     */
    it('应该列出分类 / should list categories', async () => {
      // 获取所有分类
      const categories = await client.categories.getCategories();

      // 验证结果存在
      expect(categories).toBeDefined();
      // 验证结果是数组类型
      expect(Array.isArray(categories)).toBe(true);
      // 验证至少有一个分类
      expect(categories.length).toBeGreaterThan(0);
    }, 30000);  // 超时 30 秒

    /**
     * 测试分类对象包含预期的属性
     * 验证分类数据结构的正确性
     */
    it('分类应该包含预期的属性 / should have expected category properties', async () => {
      // 获取分类列表
      const categories = await client.categories.getCategories();

      // 获取第一个分类进行验证
      const category = categories[0];
      // 验证包含 id 属性
      expect(category).toHaveProperty('id');
      // 验证包含 name 属性
      expect(category).toHaveProperty('name');
    }, 30000);  // 超时 30 秒
  });

  /**
   * 账户相关测试子套件
   * 包含账户数据读取的测试用例
   */
  describe('账户 / Accounts', () => {
    /**
     * 测试列出所有账户
     * 验证能够正确获取账户列表
     */
    it('应该列出账户 / should list accounts', async () => {
      // 获取所有账户
      const accounts = await client.accounts.getAll();

      // 验证结果存在
      expect(accounts).toBeDefined();
      // 验证结果是数组类型
      expect(Array.isArray(accounts)).toBe(true);
      // 验证至少有一个账户
      expect(accounts.length).toBeGreaterThan(0);
    }, 30000);  // 超时 30 秒

    /**
     * 测试账户对象包含预期的属性
     * 验证账户数据结构的正确性
     */
    it('账户应该包含预期的属性 / should have expected account properties', async () => {
      // 获取账户列表
      const accounts = await client.accounts.getAll();

      // 获取第一个账户进行验证
      const account = accounts[0];
      // 验证包含 id 属性
      expect(account).toHaveProperty('id');
      // 验证包含 displayName 属性
      expect(account).toHaveProperty('displayName');
    }, 30000);  // 超时 30 秒

    /**
     * 测试账户查询支持不同详细程度级别
     * 验证 ultra-light 和 light 详细程度都能正常工作
     */
    it('应该支持详细程度级别 / should support verbosity levels', async () => {
      // 获取极简格式的账户列表
      const ultraLight = await client.accounts.getAll({
        verbosity: 'ultra-light'  // 极简模式
      });

      // 获取标准格式的账户列表
      const light = await client.accounts.getAll({
        verbosity: 'light'  // 标准模式
      });

      // 验证两种格式都能正常返回
      expect(ultraLight).toBeDefined();
      expect(light).toBeDefined();
    }, 30000);  // 超时 30 秒
  });
});
