#!/usr/bin/env node
/**
 * security-monitor.cjs - Clawdbot 实时安全监控脚本
 * 用法: node monitor.js [--interval 60] [--daemon] [--threats=...]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置常量 - 定义日志和状态文件路径
const LOG_DIR = '/root/clawd/clawdbot-security/logs';
const STATE_FILE = '/root/clawd/clawdbot-security/.monitor-state.json';
const ALERT_LOG = path.join(LOG_DIR, 'alerts.log');

// 监控状态对象 - 存储当前监控状态和历史数据
let state = {
  lastCheck: Date.now(),           // 上次检查时间戳
  failedLogins: {},                // 失败登录记录（按 IP 索引）
  apiCalls: {},                    // API 调用记录
  portScans: {},                   // 端口扫描记录
  alerts: [],                      // 警报历史列表
  lastProcessCount: null,          // 上次进程数量（用于检测异常增长）
  lastMtimes: {}                   // 文件修改时间（用于检测未授权修改）
};

/**
 * 加载持久化的监控状态
 * 从 STATE_FILE 读取之前保存的状态，如果文件不存在或读取失败则使用默认状态
 */
function loadState() {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    // 状态文件不存在或无法读取，使用默认状态
    state = {
      lastCheck: Date.now(),
      failedLogins: {},
      apiCalls: {},
      portScans: {},
      alerts: []
    };
  }
}

/**
 * 保存当前监控状态到文件
 * 持久化状态以便在监控重启后保持历史数据
 */
function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * 记录安全警报
 * @param {string} level - 警报级别 (CRITICAL, HIGH, MEDIUM, LOW, INFO)
 * @param {string} message - 警报消息
 * @param {object} details - 详细信息对象
 */
function log(level, message, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details
  };
  
  const logLine = JSON.stringify(entry);
  console.log(`[${entry.timestamp}] ${level}: ${message}`);
  
  // 写入警报日志文件
  try {
    fs.appendFileSync(ALERT_LOG, logLine + '\n');
  } catch {
    // 忽略日志写入错误
  }
  
  // 存储到状态中（保留最近 100 条）
  state.alerts.unshift(entry);
  state.alerts = state.alerts.slice(0, 100);
  
  // 严重级别以上发送 Telegram 警报（TODO: 实现）
  if (level === 'CRITICAL' || level === 'HIGH') {
    // TODO: 发送 Telegram 警报
  }
}

// === 监控函数 ===

/**
 * 检查失败登录尝试
 * 检测暴力破解攻击：
 * - 从系统日志中读取失败登录记录
 * - 按 IP 分组统计失败次数
 * - 1 小时内失败超过 5 次视为暴力破解
 */
function checkFailedLogins() {
  // 检查认证日志中的失败登录尝试
  try {
    const authLog = execSync('tail -100 /var/log/auth.log 2>/dev/null || tail -100 /var/log/syslog 2>/dev/null || echo ""', 
      { encoding: 'utf8', timeout: 5000 });
    
    // 匹配失败登录模式
    const failedPattern = /Failed password|Failed login|Authentication failure/gi;
    const matches = authLog.match(failedPattern) || [];
    
    const now = Date.now();
    const window = 3600000; // 1 小时的毫秒数
    
    for (const match of matches) {
      // 尝试提取 IP 地址
      const ipMatch = match.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
      if (ipMatch) {
        const ip = ipMatch[0];
        state.failedLogins[ip] = state.failedLogins[ip] || [];
        state.failedLogins[ip].push(now);
        
        // 清理超过 1 小时的旧记录
        state.failedLogins[ip] = state.failedLogins[ip].filter(t => now - t < window);
        
        // 超过阈值时发出警报
        if (state.failedLogins[ip].length >= 5) {
          log('HIGH', '检测到暴力破解攻击', { 
            ip, 
            attempts: state.failedLogins[ip].length,
            window: '1 小时'
          });
        }
      }
    }
  } catch {
    // 认证日志不可访问 - 跳过检查
  }
}

/**
 * 检查开放端口
 * 检测意外的开放端口：
 * - 检查当前开放的端口列表
 * - 与预期端口进行比对
 * - 报告意外的端口开放情况
 */
function checkOpenPorts() {
  // 快速端口检查 - 预期应该开放的端口
  const expectedPorts = [22, 80, 443, 3000, 8080];
  
  try {
    const ssOutput = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo ""', 
      { encoding: 'utf8', timeout: 5000 });
    
    const foundPorts = [];
    const portMatch = ssOutput.match(/:(\d+)\s/g);
    
    if (portMatch) {
      for (const p of portMatch) {
        const port = parseInt(p.replace(/[:\s]/g, ''));
        if (port > 0) foundPorts.push(port);
      }
    }
    
    // 检查意外端口（既不是预期端口，也不是系统保留端口）
    const unexpected = foundPorts.filter(p => !expectedPorts.includes(p));
    
    if (unexpected.length > 0 && unexpected.length < foundPorts.length) {
      log('MEDIUM', '检测到意外开放的端口', { 
        unexpected: unexpected.slice(0, 10),
        expected: expectedPorts
      });
    }
  } catch {
    // 无法检查端口 - 跳过
  }
}

/**
 * 检查进程异常
 * 检测异常的进程数量变化：
 * - 统计当前运行的进程数量
 * - 与历史数据进行对比
 * - 进程数量异常增长时发出警报
 */
function checkProcessAnomalies() {
  // 检查异常进程
  try {
    const psOutput = execSync('ps aux 2>/dev/null | grep -v "^USER" || echo ""', 
      { encoding: 'utf8', timeout: 5000 });
    
    const lines = psOutput.split('\n').filter(l => l.trim());
    const processCount = lines.length;
    
    // 如果进程数量显著增加（超过上次的 150%）则发出警报
    if (state.lastProcessCount && processCount > state.lastProcessCount * 1.5) {
      log('MEDIUM', '检测到进程数量异常增长', {
        current: processCount,
        previous: state.lastProcessCount,
        increase: `${Math.round((processCount - state.lastProcessCount) / state.lastProcessCount * 100)}%`
      });
    }
    
    state.lastProcessCount = processCount;
  } catch {
    // 无法检查进程
  }
}

/**
 * 检查文件变更
 * 检测敏感文件的未授权修改：
 * - 监控关键配置文件
 * - 记录文件的修改时间（mtime）
 * - 发现新修改时发出警报
 */
function checkFileChanges() {
  // 需要监控的文件路径列表
  const watchPaths = [
    '/root/clawd/skills/.env',
    '/root/clawd/config',
    '/root/clawd/.env'
  ];
  
  for (const watchPath of watchPaths) {
    try {
      const stats = fs.statSync(watchPath);
      const mtime = stats.mtimeMs;
      
      if (state.lastMtimes && state.lastMtimes[watchPath]) {
        // 检测到文件被修改（修改时间晚于上次检查）
        if (mtime > state.lastMtimes[watchPath] && mtime > state.lastCheck) {
          log('HIGH', '文件被修改', {
            file: watchPath,
            time: new Date(mtime).toISOString()
          });
        }
      }
      
      state.lastMtimes = state.lastMtimes || {};
      state.lastMtimes[watchPath] = mtime;
    } catch {
      // 文件不存在 - 跳过
    }
  }
}

/**
 * 检查 API 密钥使用情况
 * 检测异常的 API 凭据使用模式：
 * - 检查环境变量中是否存在敏感凭据
 * - 这是一个简化的检查 - 实际实现需要 API 集成
 */
function checkApiKeyUsage() {
  // 检查异常的 API 密钥使用模式
  // 这是一个简化的检查 - 实际实现需要 API 集成
  
  try {
    const envContent = fs.readFileSync('/root/clawd/skills/.env', 'utf8');
    
    if (envContent.includes('TWITTER') || envContent.includes('KAPSO')) {
      log('INFO', '存在 API 凭据', {
        services: envContent.match(/(?:TWITTER|KAPSO|WHATSAPP)/g) || []
      });
    }
  } catch {
    // 无法读取环境变量
  }
}

/**
 * 检查 Docker 容器健康状态
 * 检测异常的容器状态：
 * - 检查容器是否健康
 * - 检测已退出的容器
 */
function checkDockerHealth() {
  // 检查 Docker 容器健康状态
  try {
    const dockerPs = execSync('docker ps --format json 2>/dev/null || docker ps 2>/dev/null || echo ""', 
      { encoding: 'utf8', timeout: 5000 });
    
    if (dockerPs.includes('unhealthy') || dockerPs.includes('Exited')) {
      log('MEDIUM', '检测到容器问题', {
        status: dockerPs.includes('unhealthy') ? '不健康' : '已退出'
      });
    }
  } catch {
    // Docker 不可用
  }
}

// === 主函数 ===

/**
 * 运行安全监控
 * @param {object} options - 监控选项配置
 * @param {number} options.interval - 检查间隔（秒）
 * @param {boolean} options.daemon - 是否以守护进程模式运行
 * @param {string} options.threats - 要监控的威胁类型
 * @returns {Promise<void>}
 */
async function runMonitor(options = {}) {
  const { 
    interval = 60, 
    daemon = false,
    threats = 'all',
    logPath = ALERT_LOG
  } = options;
  
  // 确保日志目录存在
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       CLAWDBOT 安全监控 v1.0                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`监控间隔: ${interval}秒`);
  console.log(`监控威胁: ${threats}`);
  console.log(`警报日志: ${ALERT_LOG}\n`);
  
  if (daemon) {
    console.log('运行在守护进程模式。按 Ctrl+C 停止。\n');
  }
  
  // 加载持久化的状态
  loadState();
  
  /**
   * 执行安全检查的函数
   * 包含所有监控检查项并更新状态
   */
  const runChecks = () => {
    const now = Date.now();
    console.log(`\n[${new Date().toISOString()}] 正在执行安全检查...`);
    
    // 执行各项安全检查
    checkFailedLogins();    // 检查失败登录
    checkOpenPorts();       // 检查开放端口
    checkProcessAnomalies(); // 检查进程异常
    checkFileChanges();     // 检查文件变更
    checkApiKeyUsage();     // 检查 API 密钥使用
    checkDockerHealth();    // 检查 Docker 健康
    
    // 更新状态并保存
    state.lastCheck = now;
    saveState();
    
    // 统计最近 1 小时内的警报数量
    const alertCount = state.alerts.filter(a => 
      new Date(a.timestamp).getTime() > now - 3600000
    ).length;
    
    console.log(`[${new Date().toISOString()}] 检查完成。最近 1 小时有 ${alertCount} 条警报。`);
  };
  
  // 立即执行一次检查
  runChecks();
  
  if (daemon) {
    // 设置定时器进行持续监控
    setInterval(runChecks, interval * 1000);
  }
}

// 直接运行时执行主逻辑
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  const options = {
    interval: parseInt(args.find(a => a.startsWith('--interval='))?.[1] ||
                  args.find(a => a.startsWith('--interval '))?.[1] || '60'),
    daemon: args.includes('--daemon'),
    threats: args.find(a => a.startsWith('--threats='))?.[1] || 'all'
  };
  
  runMonitor(options).catch(e => {
    console.error('监控错误:', e.message);
    process.exit(1);
  });
}

// 导出函数供其他模块调用
module.exports = { runMonitor, checkFailedLogins, checkOpenPorts, checkProcessAnomalies, checkFileChanges };
