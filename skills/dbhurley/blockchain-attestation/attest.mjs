#!/usr/bin/env node
/**
 * 区块链证明工具 - 使用以太坊证明服务（EAS）创建可验证的代理工作证明
 * 
 * 功能：
 * - 注册证明模式（schema）到链上
 * - 创建链上（onchain）或链下（offchain）证明
 * - 验证已存在的证明
 * - 为文件或文本生成哈希值
 * - 为链下证明添加链上时间戳
 * 
 * 支持的链：
 * - Base 主网
 * - Base Sepolia 测试网
 * 
 * 使用示例：
 *   # 注册模式
 *   node attest.mjs schema register --chain base
 *   
 *   # 创建链下证明
 *   node attest.mjs attest --mode offchain --chain base --task-text "任务描述" --output-file ./output.txt
 *   
 *   # 验证证明
 *   node attest.mjs verify --chain base --uid <证明UID>
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// 使用createRequire处理ESM解析问题
const require = createRequire(import.meta.url);
const {
  EAS,              // 以太坊证明服务主类
  NO_EXPIRATION,    // 无过期时间常量
  SchemaEncoder,    // 模式编码器
  SchemaRegistry,   // 模式注册表
  Offchain,         // 链下证明
  OffchainAttestationVersion // 链下证明版本
} = require('@ethereum-attestation-service/eas-sdk');
const { ethers } = require('ethers');  // ethers.js 库

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件路径
const CHAINS_PATH = path.join(__dirname, 'chains.json');     // 链配置文件
const SCHEMAS_PATH = path.join(__dirname, 'schemas.json');    // 模式配置文件

/**
 * 读取JSON文件
 * @param {string} filePath - 文件路径
 * @returns {object} 解析后的JSON对象
 * @throws {Error} 如果文件读取或解析失败
 */
function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`读取JSON文件失败: ${filePath}: ${err?.message || String(err)}`);
  }
}

/**
 * 写入JSON文件（原子操作）
 * @param {string} filePath - 文件路径
 * @param {object} obj - 要写入的对象
 */
function writeJson(filePath, obj) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

/**
 * 获取当前时间的ISO格式字符串
 * @returns {string} ISO格式的时间字符串
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * 输出成功结果
 * @param {object} payload - 成功数据
 */
function ok(payload) {
  process.stdout.write(JSON.stringify({ success: true, ...payload }) + '\n');
}

/**
 * 输出失败结果并设置退出码
 * @param {string} code - 错误代码
 * @param {string} message - 错误消息
 * @param {any} details - 错误详情
 */
function fail(code, message, details) {
  process.stdout.write(
    JSON.stringify({
      success: false,
      error: { code, message, details: details ?? null }
    }) + '\n'
  );
  process.exitCode = 1;
}

/**
 * 检查值是否存在，不存在则抛出错误
 * @param {string} name - 值的名称
 * @param {any} value - 要检查的值
 * @returns {any} 检查后的值
 * @throws {Error} 如果值不存在
 */
function requireValue(name, value) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`缺少必需值: ${name}`);
  }
  return value;
}

/**
 * 检查字符串是否以0x前缀开头
 * @param {string} s - 要检查的字符串
 * @returns {boolean} 是否以0x前缀开头
 */
function isHexPrefixed(s) {
  return typeof s === 'string' && s.startsWith('0x');
}

/**
 * 规范化32字节的十六进制字符串
 * @param {string} hex - 十六进制字符串
 * @returns {string} 规范化的32字节十六进制字符串
 * @throws {Error} 如果输入不是有效的32字节十六进制字符串
 */
function normalizeHexBytes32(hex) {
  if (typeof hex !== 'string') throw new Error('期望十六进制字符串');
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(h)) throw new Error(`无效的十六进制: ${hex}`);
  if (h.length !== 64) throw new Error(`期望32字节十六进制（64个半字节）。得到长度 ${h.length}: ${hex}`);
  return '0x' + h.toLowerCase();
}

/**
 * 规范化证明UID
 * @param {string} uid - 证明UID
 * @returns {string} 规范化的UID
 */
function normalizeUid(uid) {
  return normalizeHexBytes32(uid);
}

/**
 * 规范化以太坊地址
 * @param {string} addr - 以太坊地址
 * @returns {string} 规范化的以太坊地址
 * @throws {Error} 如果地址无效
 */
function normalizeAddress(addr) {
  if (!ethers.isAddress(addr)) throw new Error(`无效地址: ${addr}`);
  return ethers.getAddress(addr);
}

/**
 * 获取零地址（0x0000000000000000000000000000000000000000）
 * @returns {string} 零地址
 */
function zeroAddress() {
  return ethers.ZeroAddress;
}

/**
 * 获取零哈希值（0x0000000000000000000000000000000000000000000000000000000000000000）
 * @returns {string} 零哈希值
 */
function zeroUid() {
  return ethers.ZeroHash;
}

/**
 * 计算数据的SHA-256哈希值（32字节）
 * @param {Buffer|string} data - 要哈希的数据
 * @returns {string} 32字节的SHA-256哈希值（带0x前缀）
 */
function sha256Bytes32(data) {
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return '0x' + hash;
}

/**
 * 计算数据的Keccak-256哈希值（32字节）
 * @param {Buffer|string} data - 要哈希的数据
 * @returns {string} 32字节的Keccak-256哈希值（带0x前缀）
 */
function keccakBytes32(data) {
  // ethers.keccak256 期望 BytesLike 类型
  return ethers.keccak256(data);
}

/**
 * 从文本生成哈希值
 * @param {string} text - 要哈希的文本
 * @param {string} algo - 哈希算法（'sha256'或'keccak256'）
 * @returns {string} 32字节的哈希值（带0x前缀）
 */
function hashFromText(text, algo) {
  const buf = Buffer.from(String(text), 'utf8');
  if (algo === 'keccak256') return keccakBytes32(buf);
  return sha256Bytes32(buf);
}

/**
 * 从文件生成哈希值
 * @param {string} filePath - 要哈希的文件路径
 * @param {string} algo - 哈希算法（'sha256'或'keccak256'）
 * @returns {string} 32字节的哈希值（带0x前缀）
 */
function hashFromFile(filePath, algo) {
  const buf = fs.readFileSync(filePath);
  if (algo === 'keccak256') return keccakBytes32(buf);
  return sha256Bytes32(buf);
}

/**
 * 解析模式字符串
 * @param {string} schemaString - 模式字符串，例如："bytes32 taskHash, bytes32 outputHash, string agentId, string metadata"
 * @returns {object} 解析后的模式对象，包含fields、types和names
 * @throws {Error} 如果模式字符串无效
 */
function parseSchemaString(schemaString) {
  const parts = String(schemaString)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const fields = parts.map((p) => {
    // 按空白分割，第一个标记是类型，最后一个标记是名称
    const tokens = p.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) throw new Error(`无效的模式字段: ${p}`);
    const type = tokens[0];
    const name = tokens[tokens.length - 1];
    return { type, name };
  });

  return {
    fields,
    types: fields.map((f) => f.type),
    names: fields.map((f) => f.name)
  };
}

/**
 * 解码编码的数据
 * @param {string} schemaString - 模式字符串
 * @param {string} encodedData - 编码的数据
 * @returns {object} 解码后的数据对象
 */
function decodeEncodedData(schemaString, encodedData) {
  const { types, names } = parseSchemaString(schemaString);
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const decoded = coder.decode(types, encodedData);
  const out = {};
  for (let i = 0; i < names.length; i++) out[names[i]] = decoded[i];
  return out;
}

/**
 * 加载链配置
 * @returns {object} 链配置对象
 */
function loadChains() {
  return readJson(CHAINS_PATH);
}

/**
 * 加载模式配置
 * @returns {object} 模式配置对象
 */
function loadSchemas() {
  return readJson(SCHEMAS_PATH);
}

/**
 * 解析链键
 * @param {string} chainArg - 命令行传入的链键
 * @returns {string} 解析后的链键（默认base）
 */
function resolveChainKey(chainArg) {
  return (chainArg || process.env.EAS_CHAIN || 'base').trim();
}

/**
 * 获取链配置
 * @param {object} chains - 链配置对象
 * @param {string} chainKey - 链键
 * @returns {object} 链配置
 * @throws {Error} 如果链键未知
 */
function getChainConfig(chains, chainKey) {
  const cfg = chains[chainKey];
  if (!cfg) {
    const known = Object.keys(chains).join(', ');
    throw new Error(`未知链键: ${chainKey}。已知: ${known}`);
  }
  return cfg;
}

/**
 * 构建浏览器URL
 * @param {object} chainCfg - 链配置
 * @param {string} uid - UID
 * @param {string} mode - 模式（onchain、offchain、schema）
 * @returns {object} 包含view URL的对象
 */
function buildExplorerUrls(chainCfg, uid, mode) {
  const base = String(chainCfg.explorer).replace(/\/+$/, '');
  if (mode === 'onchain') return { view: `${base}/attestation/view/${uid}` };
  if (mode === 'offchain') return { view: `${base}/offchain/attestation/view/${uid}` };
  if (mode === 'schema') return { view: `${base}/schema/view/${uid}` };
  return { view: base };
}

/**
 * 获取RPC URL
 * @param {string} argRpc - 命令行传入的RPC URL
 * @returns {string} RPC URL（优先使用命令行参数，然后是环境变量）
 */
function getRpcUrl(argRpc) {
  return argRpc || process.env.EAS_RPC_URL || '';
}

/**
 * 获取私钥
 * @param {string} argPk - 命令行传入的私钥
 * @returns {string} 私钥（优先使用命令行参数，然后是环境变量）
 */
function getPrivateKey(argPk) {
  return argPk || process.env.EAS_PRIVATE_KEY || '';
}

/**
 * 创建以太坊提供者
 * @param {string} rpcUrl - RPC URL
 * @param {number} chainId - 链ID
 * @returns {ethers.JsonRpcProvider|null} 以太坊提供者实例
 */
function makeProvider(rpcUrl, chainId) {
  if (!rpcUrl) return null;
  // 提供chainId以尽可能避免额外的网络调用
  try {
    return new ethers.JsonRpcProvider(rpcUrl, chainId);
  } catch {
    return new ethers.JsonRpcProvider(rpcUrl);
  }
}

/**
 * 创建以太坊签名者
 * @param {string} privateKey - 私钥
 * @param {ethers.JsonRpcProvider} provider - 以太坊提供者
 * @returns {ethers.Wallet|null} 以太坊签名者实例
 */
function makeSigner(privateKey, provider) {
  if (!privateKey) return null;
  if (provider) return new ethers.Wallet(privateKey, provider);
  return new ethers.Wallet(privateKey);
}

/**
 * 将值强制转换为布尔值
 * @param {any} v - 要转换的值
 * @param {boolean} defaultValue - 默认值
 * @returns {boolean} 转换后的布尔值
 * @throws {Error} 如果值无法转换为布尔值
 */
function coerceBool(v, defaultValue) {
  if (v === undefined || v === null) return defaultValue;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  throw new Error(`无效的布尔值: ${v}`);
}

/**
 * 确保文件所在目录存在
 * @param {string} filePath - 文件路径
 */
function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * 安全读取文本文件
 * @param {string} filePath - 文件路径
 * @returns {string} 文件内容
 */
function safeReadTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * 解析JSON或原始字符串
 * @param {string} s - 要解析的字符串
 * @returns {string} 解析后的字符串
 */
function parseJsonOrRawString(s) {
  const trimmed = String(s ?? '').trim();
  if (!trimmed) return '';
  try {
    // 如果是JSON，通过重新字符串化来标准化间距
    return JSON.stringify(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
}

async function schemaRegister({ chainKey, rpcUrl, privateKey, resolver, revocable, writeBack }) {
  const chains = loadChains();
  const schemas = loadSchemas();
  const chainCfg = getChainConfig(chains, chainKey);

  const schemaString = schemas?.schema?.string;
  if (!schemaString) throw new Error('schemas.json missing schema.string');

  const resolverAddress = resolver || schemas?.schema?.resolver || zeroAddress();
  const revocableFlag = revocable ?? schemas?.schema?.revocable ?? true;

  const provider = makeProvider(rpcUrl, chainCfg.chainId);
  if (!provider) throw new Error('EAS_RPC_URL (or --rpc) is required to register schemas');

  const signer = makeSigner(privateKey, provider);
  if (!signer) throw new Error('EAS_PRIVATE_KEY (or --private-key) is required to register schemas');

  const schemaRegistry = new SchemaRegistry(chainCfg.schemaRegistry);
  schemaRegistry.connect(signer);

  const tx = await schemaRegistry.register({
    schema: schemaString,
    resolverAddress: resolverAddress,
    revocable: revocableFlag
  });

  const waitResult = await tx.wait();

  let schemaUid = null;

  // Most EAS SDK Transaction.wait() calls resolve to the UID string.
  if (typeof waitResult === 'string' && isHexPrefixed(waitResult) && waitResult.length === 66) {
    schemaUid = waitResult;
  }

  // Fallback: attempt to extract from receipt logs if available.
  if (!schemaUid) {
    const receipt = tx?.receipt;
    if (receipt?.logs && schemaRegistry?.contract?.interface) {
      for (const log of receipt.logs) {
        try {
          const parsed = schemaRegistry.contract.interface.parseLog(log);
          if (parsed?.name?.toLowerCase() === 'registered') {
            // Some versions emit: Registered(bytes32 uid, address registrar, bytes32 schemaUID, string schema, address resolver, bool revocable)
            const possible = parsed?.args?.uid || parsed?.args?.schemaUID || parsed?.args?.[0];
            if (typeof possible === 'string' && isHexPrefixed(possible) && possible.length === 66) {
              schemaUid = possible;
              break;
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Last-resort: try getSchemaUID if present.
  if (!schemaUid && typeof schemaRegistry.getSchemaUID === 'function') {
    try {
      const uidMaybe = await schemaRegistry.getSchemaUID({
        schema: schemaString,
        resolverAddress: resolverAddress,
        revocable: revocableFlag
      });
      if (typeof uidMaybe === 'string' && isHexPrefixed(uidMaybe) && uidMaybe.length === 66) schemaUid = uidMaybe;
    } catch {
      // ignore
    }
  }

  if (!schemaUid) throw new Error('Failed to determine schema UID after registration');

  if (writeBack) {
    schemas.uids = schemas.uids || {};
    schemas.uids[chainKey] = schemaUid;
    schemas.schema = schemas.schema || {};
    schemas.schema.resolver = resolverAddress;
    schemas.schema.revocable = revocableFlag;
    writeJson(SCHEMAS_PATH, schemas);
  }

  return {
    chain: chainKey,
    chainName: chainCfg.name,
    schemaUid,
    schemaString,
    resolver: resolverAddress,
    revocable: revocableFlag,
    explorer: buildExplorerUrls(chainCfg, schemaUid, 'schema').view
  };
}

function requireSchemaUid(schemas, chainKey) {
  const uid = schemas?.uids?.[chainKey];
  if (uid && typeof uid === 'string' && uid.startsWith('0x') && uid.length === 66) return uid;
  throw new Error(`Schema UID missing for chain ${chainKey}. Run: node attest.mjs schema register --chain ${chainKey}`);
}

async function createAttestation({
  mode,
  chainKey,
  rpcUrl,
  privateKey,
  recipient,
  taskHash,
  outputHash,
  agentId,
  metadata,
  savePath,
  timestampAfter
}) {
  const chains = loadChains();
  const schemas = loadSchemas();
  const chainCfg = getChainConfig(chains, chainKey);

  const schemaString = schemas?.schema?.string;
  if (!schemaString) throw new Error('schemas.json missing schema.string');

  const schemaUid = requireSchemaUid(schemas, chainKey);

  const recipientAddr = recipient ? normalizeAddress(recipient) : zeroAddress();
  const agent = agentId || process.env.CLAWDBOT_AGENT_ID || process.env.AGENT_ID || 'clawdbot';
  const metadataStr = metadata ?? '{}';

  const schemaEncoder = new SchemaEncoder(schemaString);
  const encodedData = schemaEncoder.encodeData([
    { name: 'taskHash', value: normalizeHexBytes32(taskHash), type: 'bytes32' },
    { name: 'outputHash', value: normalizeHexBytes32(outputHash), type: 'bytes32' },
    { name: 'agentId', value: String(agent), type: 'string' },
    { name: 'metadata', value: String(metadataStr), type: 'string' }
  ]);

  const commonRecord = {
    createdAt: nowIso(),
    chain: chainKey,
    chainName: chainCfg.name,
    mode,
    schemaUid,
    schemaString,
    recipient: recipientAddr,
    agentId: agent,
    taskHash: normalizeHexBytes32(taskHash),
    outputHash: normalizeHexBytes32(outputHash),
    metadata: metadataStr,
    encodedData
  };

  if (mode === 'offchain') {
    const signer = makeSigner(privateKey, null);
    if (!signer) throw new Error('EAS_PRIVATE_KEY (or --private-key) is required for offchain signing');

    // Prefer EAS.getOffchain() when an RPC URL is present (lets the SDK derive domain values from chain).
    const provider = makeProvider(rpcUrl, chainCfg.chainId);
    let offchainAttestation = null;

    if (provider) {
      const signerWithProvider = makeSigner(privateKey, provider);
      const eas = new EAS(chainCfg.eas);
      // Connect signer so the SDK can read domain separator when needed.
      eas.connect(signerWithProvider);
      const offchain = await eas.getOffchain();
      offchainAttestation = await offchain.signOffchainAttestation(
        {
          schema: schemaUid,
          recipient: recipientAddr,
          time: BigInt(Math.floor(Date.now() / 1000)),
          expirationTime: NO_EXPIRATION,
          revocable: true,
          refUID: zeroUid(),
          data: encodedData
        },
        signerWithProvider
      );
    } else {
      // Offline path: use static chain config.
      const cfg = {
        address: chainCfg.eas,
        version: chainCfg.easVersion,
        chainId: chainCfg.chainId
      };
      const offchain = new Offchain(cfg, OffchainAttestationVersion.Version2);
      offchainAttestation = await offchain.signOffchainAttestation(
        {
          schema: schemaUid,
          recipient: recipientAddr,
          time: BigInt(Math.floor(Date.now() / 1000)),
          expirationTime: NO_EXPIRATION,
          revocable: true,
          refUID: zeroUid(),
          data: encodedData
        },
        signer
      );
    }

    const uid = offchainAttestation?.uid || offchainAttestation?.sig?.uid;
    if (!uid) throw new Error('Offchain attestation did not include a UID');

    const record = {
      ...commonRecord,
      uid,
      verifyUrl: buildExplorerUrls(chainCfg, uid, 'offchain').view,
      offchainAttestation
    };

    let timestampTx = null;
    if (timestampAfter) {
      if (!provider) throw new Error('EAS_RPC_URL (or --rpc) is required to timestamp onchain');
      const signerWithProvider = makeSigner(privateKey, provider);
      const eas = new EAS(chainCfg.eas);
      eas.connect(signerWithProvider);
      const tx = await eas.timestamp(normalizeUid(uid));
      await tx.wait();
      timestampTx = {
        txHash: tx?.tx?.hash || tx?.receipt?.transactionHash || null
      };
      record.timestamp = timestampTx;
    }

    if (savePath) {
      ensureDirForFile(savePath);
      fs.writeFileSync(savePath, JSON.stringify(record, null, 2) + '\n', 'utf8');
    }

    return record;
  }

  if (mode === 'onchain') {
    const rpc = rpcUrl;
    if (!rpc) throw new Error('EAS_RPC_URL (or --rpc) is required for onchain attestations');

    const provider = makeProvider(rpc, chainCfg.chainId);
    const signer = makeSigner(privateKey, provider);
    if (!signer) throw new Error('EAS_PRIVATE_KEY (or --private-key) is required for onchain attestations');

    const eas = new EAS(chainCfg.eas);
    eas.connect(signer);

    const tx = await eas.attest({
      schema: schemaUid,
      data: {
        recipient: recipientAddr,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: zeroUid(),
        data: encodedData
      }
    });

    const uid = await tx.wait();

    const record = {
      ...commonRecord,
      uid,
      verifyUrl: buildExplorerUrls(chainCfg, uid, 'onchain').view,
      tx: {
        txHash: tx?.tx?.hash || tx?.receipt?.transactionHash || null,
        receipt: tx?.receipt || null
      }
    };

    if (savePath) {
      ensureDirForFile(savePath);
      fs.writeFileSync(savePath, JSON.stringify(record, null, 2) + '\n', 'utf8');
    }

    return record;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

async function verifyOnchain({ chainKey, rpcUrl, uid }) {
  const chains = loadChains();
  const schemas = loadSchemas();
  const chainCfg = getChainConfig(chains, chainKey);

  const schemaString = schemas?.schema?.string;
  if (!schemaString) throw new Error('schemas.json missing schema.string');

  const rpc = rpcUrl;
  if (!rpc) throw new Error('EAS_RPC_URL (or --rpc) is required to verify onchain attestations');

  const provider = makeProvider(rpc, chainCfg.chainId);

  const eas = new EAS(chainCfg.eas);
  eas.connect(provider);

  // EAS SDK exposes getAttestation(uid) on many versions. If it is unavailable, return a minimal response.
  let attestation = null;
  try {
    if (typeof eas.getAttestation === 'function') {
      attestation = await eas.getAttestation(normalizeUid(uid));
    } else if (typeof eas.getAttestation === 'undefined') {
      throw new Error('EAS SDK method getAttestation not available');
    }
  } catch (err) {
    return {
      uid: normalizeUid(uid),
      chain: chainKey,
      chainName: chainCfg.name,
      verifyUrl: buildExplorerUrls(chainCfg, normalizeUid(uid), 'onchain').view,
      warning: 'Local fetch failed. Use verifyUrl to inspect on the explorer.',
      error: String(err?.message || err)
    };
  }

  const decoded = attestation?.data ? decodeEncodedData(schemaString, attestation.data) : null;

  return {
    uid: normalizeUid(uid),
    chain: chainKey,
    chainName: chainCfg.name,
    verifyUrl: buildExplorerUrls(chainCfg, normalizeUid(uid), 'onchain').view,
    attestation,
    decoded
  };
}

function normalizeOffchainPayload(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Invalid offchain payload (expected object)');

  // Accept either:
  // 1) { signer, sig }
  // 2) { offchainAttestation: { signer, sig } }
  // 3) { offchainAttestation: { uid, ... } } (best effort)
  const directSigner = obj.signer;
  const directSig = obj.sig;

  if (directSigner && directSig) return { signer: directSigner, sig: directSig };

  if (obj.offchainAttestation?.signer && obj.offchainAttestation?.sig) {
    return { signer: obj.offchainAttestation.signer, sig: obj.offchainAttestation.sig };
  }

  // If this is the raw object returned by signOffchainAttestation, it usually includes { signer, sig } already.
  // Some versions may return { uid, ... } only. Fail clearly.
  throw new Error('Unsupported offchain payload format. Expected fields: signer and sig.');
}

async function verifyOffchain({ payload }) {
  const { signer, sig } = normalizeOffchainPayload(payload);

  const domain = sig?.domain;
  const message = sig?.message;
  if (!domain?.verifyingContract || domain?.chainId == null || !domain?.version) {
    throw new Error('Offchain payload missing EIP712 domain fields');
  }

  const easCfg = {
    address: domain.verifyingContract,
    version: domain.version,
    chainId: Number(domain.chainId)
  };

  const offchainVersion = message?.version ?? OffchainAttestationVersion.Version2;
  const offchain = new Offchain(easCfg, offchainVersion);

  const isValid = offchain.verifyOffchainAttestationSignature(signer, sig);

  return {
    uid: sig?.uid || null,
    chainId: easCfg.chainId,
    verifyingContract: easCfg.address,
    domainVersion: easCfg.version,
    valid: Boolean(isValid)
  };
}

async function timestampUid({ chainKey, rpcUrl, privateKey, uid }) {
  const chains = loadChains();
  const chainCfg = getChainConfig(chains, chainKey);

  const rpc = rpcUrl;
  if (!rpc) throw new Error('EAS_RPC_URL (or --rpc) is required to timestamp');

  const provider = makeProvider(rpc, chainCfg.chainId);
  const signer = makeSigner(privateKey, provider);
  if (!signer) throw new Error('EAS_PRIVATE_KEY (or --private-key) is required to timestamp');

  const eas = new EAS(chainCfg.eas);
  eas.connect(signer);

  const tx = await eas.timestamp(normalizeUid(uid));
  await tx.wait();

  return {
    chain: chainKey,
    chainName: chainCfg.name,
    uid: normalizeUid(uid),
    txHash: tx?.tx?.hash || tx?.receipt?.transactionHash || null
  };
}

async function revokeUid({ chainKey, rpcUrl, privateKey, uid, mode }) {
  const chains = loadChains();
  const schemas = loadSchemas();
  const chainCfg = getChainConfig(chains, chainKey);

  const rpc = rpcUrl;
  if (!rpc) throw new Error('EAS_RPC_URL (or --rpc) is required to revoke');

  const provider = makeProvider(rpc, chainCfg.chainId);
  const signer = makeSigner(privateKey, provider);
  if (!signer) throw new Error('EAS_PRIVATE_KEY (or --private-key) is required to revoke');

  const eas = new EAS(chainCfg.eas);
  eas.connect(signer);

  if (mode === 'offchain') {
    const tx = await eas.revokeOffchain(normalizeUid(uid));
    await tx.wait();
    return {
      chain: chainKey,
      chainName: chainCfg.name,
      mode,
      uid: normalizeUid(uid),
      txHash: tx?.tx?.hash || tx?.receipt?.transactionHash || null
    };
  }

  if (mode === 'onchain') {
    const schemaUid = requireSchemaUid(schemas, chainKey);
    const tx = await eas.revoke({
      schema: schemaUid,
      data: { uid: normalizeUid(uid) }
    });
    await tx.wait();
    return {
      chain: chainKey,
      chainName: chainCfg.name,
      mode,
      uid: normalizeUid(uid),
      schemaUid,
      txHash: tx?.tx?.hash || tx?.receipt?.transactionHash || null
    };
  }

  throw new Error(`Unknown revoke mode: ${mode}`);
}

async function main() {
  const program = new Command();

  program
    .name('attest')
    .description('Create and verify EAS attestations (opinionated defaults for Clawdbot)')
    .showHelpAfterError(true);

  program
    .command('hash')
    .description('Hash a text or file to bytes32 (sha256 default)')
    .option('--algo <algo>', 'sha256 or keccak256', 'sha256')
    .option('--text <text>', 'text to hash')
    .option('--file <path>', 'file path to hash')
    .action((opts) => {
      try {
        const algo = (opts.algo || 'sha256').toLowerCase().trim();
        if (!['sha256', 'keccak256'].includes(algo)) throw new Error('algo must be sha256 or keccak256');

        const hasText = opts.text !== undefined;
        const hasFile = opts.file !== undefined;

        if (hasText === hasFile) throw new Error('Provide exactly one of --text or --file');

        const digest = hasText ? hashFromText(opts.text, algo) : hashFromFile(opts.file, algo);

        ok({
          algo,
          digest: normalizeHexBytes32(digest),
          source: hasText ? { kind: 'text' } : { kind: 'file', path: opts.file }
        });
      } catch (err) {
        fail('HASH_ERROR', err?.message || String(err));
      }
    });

  const schemaCmd = program.command('schema').description('Schema management');

  schemaCmd
    .command('info')
    .description('Show the schema string and configured UIDs')
    .action(() => {
      try {
        const schemas = loadSchemas();
        ok({ schema: schemas.schema, uids: schemas.uids });
      } catch (err) {
        fail('SCHEMA_INFO_ERROR', err?.message || String(err));
      }
    });

  schemaCmd
    .command('register')
    .description('Register the schema onchain and store the UID into schemas.json')
    .option('--chain <chain>', 'chain key (base or base_sepolia)', 'base')
    .option('--rpc <url>', 'RPC URL (overrides EAS_RPC_URL)')
    .option('--private-key <hex>', 'private key (overrides EAS_PRIVATE_KEY)')
    .option('--resolver <address>', 'resolver address (default zero address)')
    .option('--revocable <bool>', 'true or false (default true)')
    .option('--no-write', 'do not write schemas.json (prints UID only)')
    .action(async (opts) => {
      try {
        const chainKey = resolveChainKey(opts.chain);
        const rpcUrl = getRpcUrl(opts.rpc);
        const privateKey = getPrivateKey(opts.privateKey);
        const resolver = opts.resolver ? normalizeAddress(opts.resolver) : null;
        const revocable = opts.revocable !== undefined ? coerceBool(opts.revocable, true) : null;
        const writeBack = Boolean(opts.write);

        const result = await schemaRegister({
          chainKey,
          rpcUrl,
          privateKey,
          resolver,
          revocable,
          writeBack
        });

        ok(result);
      } catch (err) {
        fail('SCHEMA_REGISTER_ERROR', err?.message || String(err));
      }
    });

  program
    .command('attest')
    .description('Create an attestation (offchain default)')
    .option('--mode <mode>', 'offchain or onchain', 'offchain')
    .option('--chain <chain>', 'chain key (base or base_sepolia)', 'base')
    .option('--rpc <url>', 'RPC URL (overrides EAS_RPC_URL)')
    .option('--private-key <hex>', 'private key (overrides EAS_PRIVATE_KEY)')
    .option('--recipient <address>', 'recipient address (default zero address)')
    .option('--agent-id <id>', 'agent id (default env CLAWDBOT_AGENT_ID or "clawdbot")')
    .option('--metadata <string>', 'metadata string or JSON')
    .option('--metadata-file <path>', 'read metadata from file')
    .option('--hash-algo <algo>', 'sha256 or keccak256', 'sha256')
    .option('--task-hash <hex>', 'bytes32 task hash (0x...)')
    .option('--task-text <text>', 'task text to hash')
    .option('--task-file <path>', 'task file to hash')
    .option('--output-hash <hex>', 'bytes32 output hash (0x...)')
    .option('--output-text <text>', 'output text to hash')
    .option('--output-file <path>', 'output file to hash')
    .option('--save <path>', 'write a JSON record to this path')
    .option('--timestamp', 'after offchain signing, timestamp the UID onchain')
    .action(async (opts) => {
      try {
        const mode = String(opts.mode || 'offchain').toLowerCase().trim();
        if (!['offchain', 'onchain'].includes(mode)) throw new Error('mode must be offchain or onchain');

        const chainKey = resolveChainKey(opts.chain);
        const rpcUrl = getRpcUrl(opts.rpc);
        const privateKey = getPrivateKey(opts.privateKey);

        const algo = String(opts.hashAlgo || 'sha256').toLowerCase().trim();
        if (!['sha256', 'keccak256'].includes(algo)) throw new Error('hash-algo must be sha256 or keccak256');

        // task hash sources
        const taskSources = [opts.taskHash, opts.taskText, opts.taskFile].filter((v) => v !== undefined);
        if (taskSources.length !== 1) throw new Error('Provide exactly one of --task-hash, --task-text, --task-file');

        // output hash sources
        const outSources = [opts.outputHash, opts.outputText, opts.outputFile].filter((v) => v !== undefined);
        if (outSources.length !== 1) throw new Error('Provide exactly one of --output-hash, --output-text, --output-file');

        const taskHash =
          opts.taskHash !== undefined
            ? normalizeHexBytes32(opts.taskHash)
            : opts.taskText !== undefined
              ? normalizeHexBytes32(hashFromText(opts.taskText, algo))
              : normalizeHexBytes32(hashFromFile(opts.taskFile, algo));

        const outputHash =
          opts.outputHash !== undefined
            ? normalizeHexBytes32(opts.outputHash)
            : opts.outputText !== undefined
              ? normalizeHexBytes32(hashFromText(opts.outputText, algo))
              : normalizeHexBytes32(hashFromFile(opts.outputFile, algo));

        let metadataStr = opts.metadata !== undefined ? parseJsonOrRawString(opts.metadata) : '{}';
        if (opts.metadataFile) {
          metadataStr = parseJsonOrRawString(safeReadTextFile(opts.metadataFile));
        }

        const recipient = opts.recipient ? normalizeAddress(opts.recipient) : zeroAddress();
        const agentId = opts.agentId ? String(opts.agentId) : null;
        const savePath = opts.save ? String(opts.save) : null;
        const timestampAfter = Boolean(opts.timestamp);

        const record = await createAttestation({
          mode,
          chainKey,
          rpcUrl,
          privateKey,
          recipient,
          taskHash,
          outputHash,
          agentId,
          metadata: metadataStr,
          savePath,
          timestampAfter
        });

        ok(record);
      } catch (err) {
        fail('ATTEST_ERROR', err?.message || String(err));
      }
    });

  program
    .command('verify')
    .description('Verify an onchain UID or an offchain payload')
    .option('--chain <chain>', 'chain key (base or base_sepolia)', 'base')
    .option('--rpc <url>', 'RPC URL (overrides EAS_RPC_URL)')
    .option('--uid <hex>', 'onchain UID to fetch and decode')
    .option('--offchain-file <path>', 'offchain attestation JSON file (as produced by this skill)')
    .option('--offchain-json <json>', 'offchain attestation JSON string')
    .action(async (opts) => {
      try {
        const chainKey = resolveChainKey(opts.chain);
        const rpcUrl = getRpcUrl(opts.rpc);

        const hasUid = opts.uid !== undefined;
        const hasOffFile = opts.offchainFile !== undefined;
        const hasOffJson = opts.offchainJson !== undefined;

        const count = [hasUid, hasOffFile, hasOffJson].filter(Boolean).length;
        if (count !== 1) throw new Error('Provide exactly one of --uid, --offchain-file, --offchain-json');

        if (hasUid) {
          const res = await verifyOnchain({ chainKey, rpcUrl, uid: opts.uid });
          ok(res);
          return;
        }

        const payload = hasOffFile ? JSON.parse(fs.readFileSync(opts.offchainFile, 'utf8')) : JSON.parse(opts.offchainJson);
        const res = await verifyOffchain({ payload });
        ok(res);
      } catch (err) {
        fail('VERIFY_ERROR', err?.message || String(err));
      }
    });

  program
    .command('timestamp')
    .description('Timestamp a UID onchain (commonly used to anchor an offchain attestation UID)')
    .option('--chain <chain>', 'chain key (base or base_sepolia)', 'base')
    .option('--rpc <url>', 'RPC URL (overrides EAS_RPC_URL)')
    .option('--private-key <hex>', 'private key (overrides EAS_PRIVATE_KEY)')
    .requiredOption('--uid <hex>', 'UID to timestamp (bytes32)')
    .action(async (opts) => {
      try {
        const chainKey = resolveChainKey(opts.chain);
        const rpcUrl = getRpcUrl(opts.rpc);
        const privateKey = getPrivateKey(opts.privateKey);

        const res = await timestampUid({ chainKey, rpcUrl, privateKey, uid: opts.uid });
        ok(res);
      } catch (err) {
        fail('TIMESTAMP_ERROR', err?.message || String(err));
      }
    });

  program
    .command('revoke')
    .description('Revoke an attestation (onchain or offchain revocation record)')
    .option('--mode <mode>', 'onchain or offchain', 'onchain')
    .option('--chain <chain>', 'chain key (base or base_sepolia)', 'base')
    .option('--rpc <url>', 'RPC URL (overrides EAS_RPC_URL)')
    .option('--private-key <hex>', 'private key (overrides EAS_PRIVATE_KEY)')
    .requiredOption('--uid <hex>', 'UID to revoke (bytes32)')
    .action(async (opts) => {
      try {
        const chainKey = resolveChainKey(opts.chain);
        const rpcUrl = getRpcUrl(opts.rpc);
        const privateKey = getPrivateKey(opts.privateKey);
        const mode = String(opts.mode || 'onchain').toLowerCase().trim();
        if (!['onchain', 'offchain'].includes(mode)) throw new Error('mode must be onchain or offchain');

        const res = await revokeUid({ chainKey, rpcUrl, privateKey, uid: opts.uid, mode });
        ok(res);
      } catch (err) {
        fail('REVOKE_ERROR', err?.message || String(err));
      }
    });

  await program.parseAsync(process.argv);

  if (!process.exitCode) process.exitCode = 0;
}

main().catch((err) => {
  fail('FATAL', err?.message || String(err));
});
