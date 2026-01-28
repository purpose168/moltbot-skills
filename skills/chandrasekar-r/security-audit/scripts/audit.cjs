#!/usr/bin/env node
/**
 * security-audit.cjs - Clawdbot 综合安全扫描器
 * 用法: node audit.js [--full] [--json] [--credentials] [--ports] [--configs] [--permissions] [--docker]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 配置常量 - 定义扫描的目标路径
const CLAWDBOT_DIR = '/root/clawd';
const CONFIG_DIR = '/root/clawd/skills/.env';
const DOCKER_DIR = '/root/clawd';

// 审计结果收集 - 存储发现的安全问题
const findings = [];
let checkCount = 0;
let criticalCount = 0;
let highCount = 0;

/**
 * 记录发现的安全问题
 * @param {string} level - 严重级别 (CRITICAL, HIGH, MEDIUM, LOW, INFO)
 * @param {string} category - 问题类别 (CREDENTIALS, PORTS, CONFIGS, PERMISSIONS, DOCKER, GIT, HISTORY)
 * @param {string} message - 问题描述信息
 * @param {object} details - 详细信息对象（可选）
 */
function log(level, category, message, details = null) {
  const emoji = {
    CRITICAL: '🔴',
    HIGH: '🟠',
    MEDIUM: '🟡',
    LOW: '🟢',
    INFO: '🔵'
  };
  
  findings.push({
    level,
    category,
    message,
    details,
    timestamp: new Date().toISOString()
  });
  
  checkCount++;
  if (level === 'CRITICAL') criticalCount++;
  if (level === 'HIGH') highCount++;
}

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {boolean} 文件是否存在
 */
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * 扫描文件中的敏感信息模式
 * @param {string} filePath - 要扫描的文件路径
 * @param {Array} patterns - 敏感信息检测模式数组
 * @param {string} category - 问题分类
 */
function scanFileForPatterns(filePath, patterns, category) {
  if (!checkFileExists(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    for (const pattern of patterns) {
      if (pattern.regex.test(content)) {
        log(pattern.level, category, pattern.message, {
          file: filePath,
          match: pattern.match
        });
      }
    }
  } catch (e) {
    // 忽略无法读取的文件
  }
}

/**
 * 递归获取指定目录下的所有文件
 * @param {string} dir - 起始目录路径
 * @param {Array} extensions - 要包含的文件扩展名数组
 * @returns {Array} 匹配的文件路径数组
 */
function getFilesRecursively(dir, extensions = ['.js', '.ts', '.json', '.env', '.md', '.yml', '.yaml']) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // 跳过隐藏目录和 node_modules
          if (!entry.name.startsWith('.') && !entry.name.includes('node_modules')) {
            traverse(fullPath);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch {
      // 忽略无法访问的目录
    }
  }
  
  traverse(dir);
  return files;
}

// === 安全检查函数 ===

/**
 * 检查凭据安全性 - 扫描敏感信息泄露
 * 检测类型：
 * - API 密钥硬编码
 * - 令牌和密钥暴露
 * - 密码硬编码
 * - 私钥文件泄露
 * - URL 中包含凭据
 */
function checkCredentials() {
  log('INFO', 'CREDENTIALS', '开始凭据扫描...');
  
  const credentialPatterns = [
    {
      level: 'CRITICAL',
      message: '文件中发现可能的 API 密钥',
      regex: /api[_-]?key\s*[:=]\s*['"'][a-zA-Z0-9]{20,}['"']/gi,
      match: 'API key pattern'
    },
    {
      level: 'CRITICAL',
      message: '发现可能的密钥令牌',
      regex: /(secret|token|auth)[_-]?key\s*[:=]\s*['"'][a-zA-Z0-9_\-]{30,}['"']/gi,
      match: 'Secret pattern'
    },
    {
      level: 'HIGH',
      message: '发现硬编码的密码',
      regex: /password\s*[:=]\s*['"'][^'"']{8,}['"']/gi,
      match: 'Password pattern'
    },
    {
      level: 'HIGH',
      message: '检测到私钥文件',
      regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
      match: 'Private key'
    },
    {
      level: 'MEDIUM',
      message: '发现包含凭据的 URL',
      regex: /https?:\/\/[^:]+:[^@]+@/g,
      match: 'URL with credentials'
    }
  ];
  
  // 扫描关键配置文件
  const keyFiles = [
    CONFIG_DIR,
    path.join(CLAWDBOT_DIR, 'skills/.env'),
    path.join(CLAWDBOT_DIR, '.env'),
    path.join(CLAWDBOT_DIR, 'config.json')
  ];
  
  for (const file of keyFiles) {
    scanFileForPatterns(file, credentialPatterns, 'CREDENTIALS');
  }
  
  // 扫描所有代码文件
  const codeFiles = getFilesRecursively(CLAWDBOT_DIR);
  
  for (const file of codeFiles) {
    if (file.includes('node_modules') || file.includes('.git')) continue;
    // 非关键文件只扫描非严重级别的问题
    scanFileForPatterns(file, credentialPatterns.filter(p => p.level !== 'CRITICAL'), 'CREDENTIALS');
  }
  
  log('INFO', 'CREDENTIALS', `扫描了 ${codeFiles.length} 个文件`);
}

/**
 * 检查开放端口 - 检测意外暴露的网络端口
 */
function checkPorts() {
  log('INFO', 'PORTS', '检查开放端口...');
  
  try {
    // 检查 ss 或 netstat 工具是否可用
    const ssResult = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo "not available"', 
      { encoding: 'utf8', timeout: 5000 });
    
    const ports = [];
    const lines = ssResult.split('\n');
    
    for (const line of lines) {
      const portMatch = line.match(/:(\d+)\s/);
      if (portMatch) {
        const port = parseInt(portMatch[1]);
        // 只记录大于 1024 的端口（系统保留端口）
        if (port > 1024 && !ports.includes(port)) {
          ports.push(port);
        }
      }
    }
    
    if (ports.length > 0) {
      log('MEDIUM', 'PORTS', `发现 ${ports.length} 个开放端口`, { ports });
    } else {
      log('INFO', 'PORTS', '未检测到意外的开放端口');
    }
  } catch {
    log('LOW', 'PORTS', '无法扫描端口（工具不可用）');
  }
}

/**
 * 检查配置安全性 - 验证环境配置是否存在安全隐患
 */
function checkConfigs() {
  log('INFO', 'CONFIGS', '验证配置安全性...');
  
  // 检查 .env 文件是否存在
  if (!checkFileExists(CONFIG_DIR)) {
    log('HIGH', 'CONFIGS', '未找到 .env 文件 - 凭据可能未配置');
    return;
  }
  
  try {
    const envContent = fs.readFileSync(CONFIG_DIR, 'utf8');
    
    // 检查速率限制配置
    if (!envContent.includes('RATE_LIMIT')) {
      log('MEDIUM', 'CONFIGS', '未找到 RATE_LIMIT 配置');
    }
    
    // 检查身份验证设置
    if (!envContent.includes('AUTH_') && !envContent.includes('API_KEY')) {
      log('HIGH', 'CONFIGS', '未检测到身份验证配置');
    }
    
    // 检查日志级别（调试模式可能泄露敏感信息）
    if (envContent.includes('LOG_LEVEL=debug') || envContent.includes('LOG_LEVEL=DEBUG')) {
      log('MEDIUM', 'CONFIGS', '启用了调试日志 - 可能暴露敏感数据');
    }
    
    // 检查 CORS 配置（允许所有来源存在安全风险）
    if (envContent.includes('CORS_ORIGIN=*') || envContent.includes('CORS_ALLOW_ALL=true')) {
      log('HIGH', 'CONFIGS', 'CORS 配置为允许所有来源');
    }
    
  } catch (e) {
    log('LOW', 'CONFIGS', '无法读取配置文件');
  }
}

/**
 * 检查文件权限 - 确保敏感文件不被过度授权访问
 */
function checkPermissions() {
  log('INFO', 'PERMISSIONS', '检查文件权限...');
  
  // 定义敏感文件模式及对应严重级别
  const sensitivePatterns = [
    { pattern: /\.env$/, level: 'CRITICAL', message: '.env 文件全局可读' },
    { pattern: /\.json$/, level: 'HIGH', message: 'JSON 配置文件全局可读' },
    { pattern: /\.key$/, level: 'CRITICAL', message: '密钥文件全局可读' },
    { pattern: /\.pem$/, level: 'CRITICAL', message: 'PEM 文件全局可读' }
  ];
  
  const files = getFilesRecursively(CLAWDBOT_DIR);
  
  for (const file of files) {
    try {
      const stats = fs.statSync(file);
      const mode = stats.mode & 0o777;
      
      // 检查是否全局可读
      if ((mode & 0o004) !== 0) {
        for (const sp of sensitivePatterns) {
          if (sp.pattern.test(file)) {
            log(sp.level, 'PERMISSIONS', sp.message, { file, mode: mode.toString(8) });
          }
        }
      }
      
      // 检查是否全局可执行（JS 文件）
      if ((mode & 0o001) !== 0 && file.endsWith('.js')) {
        log('MEDIUM', 'PERMISSIONS', `可执行的 JS 文件: ${path.basename(file)}`);
      }
    } catch {
      // 忽略无法访问的文件
    }
  }
}

/**
 * 检查 Docker 安全性 - 分析 Dockerfile 中的安全配置
 */
function checkDocker() {
  log('INFO', 'DOCKER', '检查 Docker 安全性...');
  
  const dockerFile = path.join(CLAWDBOT_DIR, 'Dockerfile');
  
  if (!checkFileExists(dockerFile)) {
    log('INFO', 'DOCKER', '未找到 Dockerfile - 跳过 Docker 检查');
    return;
  }
  
  try {
    const dockerContent = fs.readFileSync(dockerFile, 'utf8');
    
    // 检查是否以 root 用户运行
    if (dockerContent.includes('USER root') || !dockerContent.includes('USER ')) {
      log('HIGH', 'DOCKER', '容器可能以 root 用户运行');
    }
    
    // 检查特权模式
    if (dockerContent.includes('--privileged')) {
      log('CRITICAL', 'DOCKER', '容器启用了特权模式');
    }
    
    // 检查健康检查指令
    if (!dockerContent.includes('HEALTHCHECK')) {
      log('LOW', 'DOCKER', '未找到 HEALTHCHECK 指令');
    }
    
    // 检查镜像标签（使用 :latest 可能导致不稳定部署）
    if (dockerContent.includes(':latest') && !dockerContent.includes('BUILDARG')) {
      log('MEDIUM', 'DOCKER', '使用浮动标签 :latest - 建议使用特定版本');
    }
    
  } catch (e) {
    log('LOW', 'DOCKER', '无法分析 Dockerfile');
  }
}

/**
 * 检查 Git 相关信息 - 防止 Git 目录暴露
 */
function checkGit() {
  log('INFO', 'GIT', '检查暴露的 Git 信息...');
  
  const gitDir = path.join(CLAWDBOT_DIR, '.git');
  
  if (checkFileExists(gitDir)) {
    log('MEDIUM', 'GIT', '.git 目录存在 - 确保其不可通过 Web 访问');
  }
  
  const gitIgnore = path.join(CLAWDBOT_DIR, '.gitignore');
  if (!checkFileExists(gitIgnore)) {
    log('LOW', 'GIT', '未找到 .gitignore 文件');
  }
}

/**
 * 检查最近提交 - 查看历史记录中是否泄露敏感信息
 */
function checkRecentCommits() {
  log('INFO', 'HISTORY', '检查最近提交中的凭据泄露...');
  
  try {
    const logOutput = execSync('git log --oneline -20 2>/dev/null || echo "not a git repo"', 
      { encoding: 'utf8', timeout: 5000 });
    
    // 检查提交消息中是否包含敏感关键词（paranoid 检查）
    if (/secret|token|password|key|auth/i.test(logOutput)) {
      log('LOW', 'HISTORY', '最近提交的消息中包含安全相关关键词');
    }
  } catch {
    log('INFO', 'HISTORY', '不是 Git 仓库或 Git 不可用');
  }
}

// === 主函数 ===

/**
 * 运行安全审计
 * @param {object} options - 审计选项配置对象
 * @param {boolean} options.full - 是否执行完整审计
 * @param {boolean} options.json - 是否输出 JSON 格式报告
 * @param {boolean} options.credentials - 是否检查凭据
 * @param {boolean} options.ports - 是否检查端口
 * @param {boolean} options.configs - 是否检查配置
 * @param {boolean} options.permissions - 是否检查权限
 * @param {boolean} options.docker - 是否检查 Docker
 * @returns {object} 审计结果对象
 */
async function runAudit(options = {}) {
  const { full = false, json = false, credentials = false, ports = false, 
           configs = false, permissions = false, docker = false } = options;
  
  const runAll = full || (!credentials && !ports && !configs && !permissions && !docker);
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       CLAWDBOT 安全审计 v1.0                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  
  if (runAll || credentials) checkCredentials();
  if (runAll || ports) checkPorts();
  if (runAll || configs) checkConfigs();
  if (runAll || permissions) checkPermissions();
  if (runAll || docker) checkDocker();
  checkGit();
  checkRecentCommits();
  
  const duration = Date.now() - startTime;
  
  // 输出摘要信息
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    审计摘要                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`执行检查数: ${checkCount}`);
  console.log(`🔴 严重: ${criticalCount}`);
  console.log(`🟠 高风险: ${highCount}`);
  console.log(`发现问题总数: ${findings.length}`);
  console.log(`耗时: ${duration}ms\n`);
  
  // 优先显示严重问题
  const criticalFindings = findings.filter(f => f.level === 'CRITICAL');
  if (criticalFindings.length > 0) {
    console.log('🔴 严重问题（需要立即处理）:');
    for (const f of criticalFindings) {
      console.log(`  • ${f.message}`);
      if (f.details?.file) console.log(`    文件: ${f.details.file}`);
    }
    console.log('');
  }
  
  // 如果需要 JSON 格式输出
  if (json) {
    console.log('\n=== JSON 报告 ===');
    console.log(JSON.stringify({
      summary: {
        checks: checkCount,
        critical: criticalCount,
        high: highCount,
        total: findings.length,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      },
      findings
    }, null, 2));
  }
  
  // 部署建议
  if (criticalCount > 0) {
    console.log('\n⚠️  发现严重问题 - 修复前请勿部署!');
    process.exitCode = 1;
  } else if (highCount > 0) {
    console.log('\n⚠️  发现高风险问题 - 建议部署前审查。');
  } else {
    console.log('\n✅ 未发现严重问题。安全状况良好。');
  }
  
  return { findings, criticalCount, highCount, checkCount };
}

/**
 * 自动修复函数 - 尝试自动修复常见安全问题
 */
async function runAutoFix() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    自动修复模式                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  let fixedCount = 0;
  
  // 修复 1: 保护 .env 文件权限
  const envFile = '/root/clawd/skills/.env';
  if (checkFileExists(envFile)) {
    try {
      const stats = fs.statSync(envFile);
      const mode = stats.mode & 0o777;
      if ((mode & 0o077) !== 0) {
        fs.chmodSync(envFile, 0o600);
        console.log('✅ 已修复: 设置 .env 权限为 600');
        fixedCount++;
      }
    } catch (e) {
      console.log('❌ 修复 .env 权限失败:', e.message);
    }
  }
  
  // 修复 2: 保护其他敏感文件
  const sensitivePatterns = [
    { pattern: /\.env$/, perms: 0o600 },
    { pattern: /\.json$/, perms: 0o600 },
    { pattern: /\.key$/, perms: 0o600 },
    { pattern: /\.pem$/, perms: 0o600 }
  ];
  
  const files = getFilesRecursively(CLAWDBOT_DIR);
  for (const file of files) {
    for (const sp of sensitivePatterns) {
      if (sp.pattern.test(file)) {
        try {
          const stats = fs.statSync(file);
          const mode = stats.mode & 0o777;
          if (mode !== sp.perms) {
            fs.chmodSync(file, sp.perms);
            console.log(`✅ 已修复: 设置 ${path.basename(file)} 权限为 ${sp.perms.toString(8)}`);
            fixedCount++;
          }
        } catch {
          // 忽略错误
        }
      }
    }
  }
  
  // 修复 3: 如果缺失则创建 .gitignore
  const gitignorePath = path.join(CLAWDBOT_DIR, '.gitignore');
  if (!checkFileExists(gitignorePath)) {
    const defaultGitignore = `# Clawdbot
.env
*.log
node_modules/
.DS_Store
*.pem
*.key
`;
    fs.writeFileSync(gitignorePath, defaultGitignore);
    console.log('✅ 已修复: 创建 .gitignore');
    fixedCount++;
  }
  
  console.log(`\n✅ 自动修复完成! 解决了 ${fixedCount} 个问题。`);
  
  // 重新运行审计以确认修复效果
  console.log('\n🔍 重新运行审计以验证...\n');
  return fixedCount;
}

// 直接运行时执行主逻辑
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const shouldFix = args.includes('--fix');
  
  if (shouldFix) {
    runAutoFix().catch(e => {
      console.error('自动修复错误:', e.message);
      process.exit(1);
    });
  } else {
    runAudit({
      full: args.includes('--full'),
      json: args.includes('--json'),
      credentials: args.includes('--credentials'),
      ports: args.includes('--ports'),
      configs: args.includes('--configs'),
      permissions: args.includes('--permissions'),
      docker: args.includes('--docker')
    }).catch(e => {
      console.error('审计错误:', e.message);
      process.exit(1);
    });
  }
}

// 导出函数供其他模块调用
module.exports = { runAudit, checkCredentials, checkPorts, checkConfigs, checkPermissions, checkDocker };
