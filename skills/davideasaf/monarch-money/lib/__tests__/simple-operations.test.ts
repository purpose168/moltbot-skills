/**
 * 简单单元测试 - 测试操作函数和响应格式化器
 * Simple unit tests for operations and ResponseFormatter
 */

import {
  GET_ACCOUNTS_ULTRA_LIGHT,
  GET_ACCOUNTS_LIGHT,
  GET_ACCOUNTS,
  getQueryForVerbosity
} from '../client/graphql/operations';
import { ResponseFormatter } from '../client/ResponseFormatter';

describe('操作和响应格式化器测试', () => {
  describe('查询选择', () => {
    test('getQueryForVerbosity 账户查询测试', () => {
      expect(getQueryForVerbosity('accounts', 'ultra-light')).toBe(GET_ACCOUNTS_ULTRA_LIGHT);
      expect(getQueryForVerbosity('accounts', 'light')).toBe(GET_ACCOUNTS_LIGHT);
      expect(getQueryForVerbosity('accounts', 'standard')).toBe(GET_ACCOUNTS);
    });

    test('查询内容验证', () => {
      expect(GET_ACCOUNTS_ULTRA_LIGHT).toContain('displayName');
      expect(GET_ACCOUNTS_LIGHT).toContain('institution');
      expect(GET_ACCOUNTS).toContain('credential');
    });
  });

  describe('响应格式化器测试', () => {
    const mockAccounts = [
      {
        id: '1',
        displayName: '测试账户',
        currentBalance: 1000,
        type: { name: 'checking' },
        includeInNetWorth: true
      }
    ];

    test('formatAccounts ultra-light 极简格式测试', () => {
      const result = ResponseFormatter.formatAccounts(mockAccounts, 'ultra-light');
      expect(result).toContain('💰');
      expect(result).toContain('1 accounts');
      expect(result.length).toBeLessThan(100);
    });

    test('formatAccounts light 详细格式测试', () => {
      const result = ResponseFormatter.formatAccounts(mockAccounts, 'light');
      expect(result).toContain('测试账户');
      expect(result).toContain('$1,000');
    });

    test('formatAccounts standard 标准格式测试', () => {
      const result = ResponseFormatter.formatAccounts(mockAccounts, 'standard');
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });
});