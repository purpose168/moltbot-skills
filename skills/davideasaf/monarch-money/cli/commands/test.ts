import { Command } from 'commander';                                                              // 导入命令解析库
import { spawn } from 'child_process';                                                           // 导入子进程模块
import { join } from 'path';                                                                     // 导入路径拼接函数

// 创建测试命令
export const testCommand = new Command('test')
  .description('运行端到端测试')                                                                 // 命令描述
  .option('--auth', '仅运行认证测试')                                                           // 认证测试选项
  .option('--read', '仅运行读取测试')                                                           // 读取测试选项
  .option('--write', '仅运行写入测试 (需要 --allow-writes)')                                    // 写入测试选项
  .option('--allow-writes', '启用写入测试 (会修改真实数据!)')                                   // 允许写入选项
  .option('--all', '运行所有测试，包括写入测试')                                                // 运行所有测试选项
  .action(async (options) => {
    const env = { ...process.env };

    // 如果启用写入测试，设置环境变量并显示警告
    if (options.allowWrites || options.all) {
      env.ALLOW_WRITE_TESTS = '1';
      console.log('警告: 已启用写入测试 - 将会修改真实数据!\n');
    }

    // 确定要运行的测试模式
    let testPattern = 'tests/e2e';

    if (options.auth) {
      testPattern = 'tests/e2e/auth.test.ts';
    } else if (options.read) {
      testPattern = 'tests/e2e/read.test.ts';
    } else if (options.write) {
      testPattern = 'tests/e2e/write.test.ts';
      if (!options.allowWrites) {
        console.log(
          '注意: 没有 --allow-writes 参数，写入测试将被跳过\n'
        );
      }
    }

    // Jest参数配置
    const jestArgs = [
      '--runInBand',                                                                             // 串行运行测试
      '--testPathPattern',
      testPattern,
      '--passWithNoTests'                                                                        // 没有测试时通过
    ];

    console.log(`正在运行测试: ${testPattern}\n`);

    // 启动Jest测试进程
    const jest = spawn('npx', ['jest', ...jestArgs], {
      cwd: join(__dirname, '../..'),                                                             // 设置工作目录
      env,                                                                                       // 传递环境变量
      stdio: 'inherit'                                                                           // 继承父进程IO
    });

    // 监听测试进程退出
    jest.on('close', (code) => {
      process.exit(code || 0);
    });
  });
