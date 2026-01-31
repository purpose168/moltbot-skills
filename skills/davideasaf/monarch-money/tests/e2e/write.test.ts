/**
 * 写入操作端到端测试
 * Write Operations E2E Tests
 * 
 * 测试对 Monarch Money API 的写入操作。
 * Tests write operations against Monarch Money API.
 * 
 * 这些测试需要 --allow-writes 标志，且仅用于手动执行。
 * These tests REQUIRE --allow-writes flag and are MANUAL ONLY.
 * 
 * 警告：这些测试会在 Monarch Money 账户中创建/修改真实数据。
 * WARNING: These tests create/modify real data in the Monarch Money account.
 * 仅在手动确认后运行。
 * Only run manually with explicit confirmation.
 */

// 导入 MonarchClient 类用于测试
import { MonarchClient } from '../../lib';

// Monarch Money API 基础 URL
const MONARCH_API_URL = 'https://api.monarch.com';

// 是否允许执行写入测试（通过环境变量控制）
const ALLOW_WRITES = process.env.ALLOW_WRITE_TESTS === '1';

/**
 * 写入操作测试套件（仅手动执行）
 * 包含所有数据写入相关的端到端测试用例
 * 
 * 注意：这些测试会修改真实数据，默认情况下会被跳过
 */
describe('写入操作 / Write Operations (手动执行 / Manual Only)', () => {
  let client: MonarchClient;  // 测试使用的客户端实例

  /**
   * 在所有测试执行前初始化
   * 如果允许写入测试，则创建客户端并登录
   * 超时设置为 30 秒以允许登录过程
   */
  beforeAll(async () => {
    // 如果不允许写入测试，打印跳过信息并返回
    if (!ALLOW_WRITES) {
      console.log('='.repeat(60));
      console.log('跳过写入测试 / SKIPPING WRITE TESTS');
      console.log('设置 ALLOW_WRITE_TESTS=1 以启用 / Set ALLOW_WRITE_TESTS=1 to enable');
      console.log('警告：这些测试会修改真实数据！/ WARNING: These tests modify real data!');
      console.log('='.repeat(60));
      return;
    }

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
    if (client) {
      try {
        await client.close();
      } catch {
        // 忽略关闭错误，避免影响测试结果
        // Ignore close errors
      }
    }
  });

  /**
   * 交易更新测试子套件
   * 包含交易数据修改的测试用例
   */
  describe('交易更新 / Transaction Updates', () => {
    /**
     * 测试更新交易备注
     * 获取一笔交易，修改其备注，然后恢复原始备注
     * 这个测试验证更新功能的完整性
     */
    it('应该能够更新交易备注 / should update transaction notes', async () => {
      // 如果不允许写入，跳过此测试
      if (!ALLOW_WRITES) {
        console.log('跳过写入测试 - 未设置 ALLOW_WRITE_TESTS');
        // console.log('Skipping write test - ALLOW_WRITE_TESTS not set');
        return;
      }

      // 获取最近的一笔交易用于测试
      // Get a recent transaction to update
      const result = await client.transactions.getTransactions({
        limit: 1
      });

      // 如果没有交易，跳过测试
      if (result.transactions.length === 0) {
        console.log('没有可测试的交易');
        // console.log('No transactions to test with');
        return;
      }

      const tx = result.transactions[0];  // 获取第一笔交易
      const originalNotes = tx.notes || '';  // 保存原始备注
      const testNotes = `端到端测试 - ${new Date().toISOString()}`;  // 生成测试备注

      // 更新备注
      // Update notes
      await client.transactions.updateTransaction(tx.id, {
        notes: testNotes
      });

      // 恢复原始备注
      // Restore original notes
      await client.transactions.updateTransaction(tx.id, {
        notes: originalNotes
      });

      // 打印成功信息
      console.log(`成功更新并恢复了交易 ${tx.id} 的备注`);
      // console.log(`Successfully updated and restored transaction ${tx.id}`);
    }, 60000);  // 超时 60 秒（更新操作可能需要更长时间）
  });

  /**
   * 分类更新测试子套件
   * 包含分类数据修改的测试用例
   */
  describe('分类更新 / Category Updates', () => {
    /**
     * 测试更新交易分类
     * 获取一笔交易和一个分类，修改交易的分类，然后恢复原始分类
     * 这个测试验证分类更新功能的完整性
     */
    it('应该能够更新交易分类 / should update transaction category', async () => {
      // 如果不允许写入，跳过此测试
      if (!ALLOW_WRITES) {
        console.log('跳过写入测试 - 未设置 ALLOW_WRITE_TESTS');
        // console.log('Skipping write test - ALLOW_WRITE_TESTS not set');
        return;
      }

      // 并行获取交易和分类列表
      // Get a transaction and categories
      const [txResult, categories] = await Promise.all([
        client.transactions.getTransactions({ limit: 1 }),  // 获取一笔交易
        client.categories.getCategories()  // 获取所有分类
      ]);

      // 如果没有交易，跳过测试
      if (txResult.transactions.length === 0) {
        console.log('没有可测试的交易');
        // console.log('No transactions to test with');
        return;
      }

      // 如果分类数量不足，跳过测试
      if (categories.length < 2) {
        console.log('没有足够的分类用于测试');
        // console.log('Not enough categories to test with');
        return;
      }

      const tx = txResult.transactions[0];  // 获取第一笔交易
      const originalCategoryId = tx.category?.id;  // 保存原始分类 ID

      // 查找一个不同的分类
      // Find a different category
      const newCategory = categories.find((c) => c.id !== originalCategoryId);

      // 如果找不到其他分类，跳过测试
      if (!newCategory) {
        console.log('找不到替换分类');
        // console.log('Could not find alternate category');
        return;
      }

      // 更新分类
      // Update category
      await client.transactions.updateTransaction(tx.id, {
        categoryId: newCategory.id
      });

      // 恢复原始分类
      // Restore original category
      if (originalCategoryId) {
        await client.transactions.updateTransaction(tx.id, {
          categoryId: originalCategoryId
        });
      }

      // 打印成功信息
      console.log(`成功更新并恢复了交易 ${tx.id} 的分类`);
      // console.log(`Successfully updated and restored category for ${tx.id}`);
    }, 60000);  // 超时 60 秒
  });
});
