/**
 * ClawdLink 加密库模块
 * 
 * 提供完整的加密功能支持：
 * - Ed25519：用于身份认证和数字签名
 * - X25519：用于密钥交换
 * - XChaCha20-Poly1305：用于消息加密（对称加密）
 * 
 * 加密流程说明：
 * 1. 用户生成 Ed25519 密钥对作为身份标识
 * 2. 将 Ed25519 私钥转换为 X25519 格式用于加密
 * 3. 通过 X25519 密钥交换协议与好友建立共享密钥
 * 4. 使用 XChaCha20-Poly1305 算法加密消息
 * 5. 使用 Ed25519 对密文进行数字签名以确保完整性
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

const { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } = util;

/**
 * 生成新的 Ed25519 密钥对用于身份认证
 * Ed25519 是一种高性能的数字签名算法，广泛用于区块链和加密应用
 * 
 * @returns {Object} 包含 publicKey（公钥）和 secretKey（私钥）的对象
 */
export function generateIdentity() {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  };
}

/**
 * 将 Ed25519 密钥转换为 X25519 密钥用于加密
 * Ed25519 签名密钥可以通过数学变换转换为 X25519 加密密钥
 * 这种转换保持了密钥对之间的对应关系，使得两种算法可以协同工作
 * 
 * @param {string} ed25519SecretKey - Ed25519 格式的 Base64 编码私钥
 * @returns {Object} 包含转换后的 X25519 公钥和私钥
 */
export function ed25519ToX25519(ed25519SecretKey) {
  const secretKeyBytes = decodeBase64(ed25519SecretKey);
  const x25519SecretKey = secretKeyBytes.slice(0, 32);
  const x25519PublicKey = nacl.scalarMult.base(x25519SecretKey);
  return {
    publicKey: encodeBase64(x25519PublicKey),
    secretKey: encodeBase64(x25519SecretKey)
  };
}

/**
 * 使用 X25519 密钥交换协议派生共享密钥
 * 
 * X25519 协议工作原理：
 * - 我方使用私钥，对方使用公钥
 * - 通过标量乘法运算得到共享点
 * - 对共享点进行哈希得到最终的共享密钥
 * 
 * @param {string} ourSecretKey - 己方的 X25519 私钥（Base64 编码）
 * @param {string} theirPublicKey - 对方的 X25519 公钥（Base64 编码）
 * @returns {Uint8Array} 32字节的共享密钥，用于后续对称加密
 */
export function deriveSharedSecret(ourSecretKey, theirPublicKey) {
  const ourSecret = decodeBase64(ourSecretKey);
  const theirPublic = decodeBase64(theirPublicKey);
  const shared = nacl.scalarMult(ourSecret.slice(0, 32), theirPublic);
  return nacl.hash(shared).slice(0, 32);
}

/**
 * 使用 XChaCha20-Poly1305 算法加密消息
 * 
 * XChaCha20-Poly1305 是一种现代对称加密算法：
 * - ChaCha20：流加密算法，提供优秀的加密强度
 * - Poly1305：消息认证码，确保消息完整性和真实性
 * 
 * 加密过程：
 * 1. 生成 24 字节随机 nonce（数字初始化向量）
 * 2. 将消息转换为字节格式
 * 3. 使用共享密钥和 nonce 进行加密
 * 
 * @param {Object} message - 要加密的消息对象
 * @param {Uint8Array} sharedSecret - 32字节的共享密钥
 * @returns {Object} 包含 nonce 和 ciphertext 的加密结果
 */
export function encrypt(message, sharedSecret) {
  const nonce = nacl.randomBytes(24);
  const messageBytes = decodeUTF8(JSON.stringify(message));
  const encrypted = nacl.secretbox(messageBytes, nonce, sharedSecret);
  return {
    nonce: encodeBase64(nonce),
    ciphertext: encodeBase64(encrypted)
  };
}

/**
 * 解密 XChaCha20-Poly1305 加密的消息
 * 
 * 解密是加密的逆过程：
 * 1. 将密文和 nonce 从 Base64 解码为字节
 * 2. 使用共享密钥和 nonce 调用 secretbox.open
 * 3. 如果解密成功，返回原始消息内容
 * 
 * @param {string} ciphertext - Base64 编码的密文
 * @param {string} nonce - Base64 编码的随机数
 * @param {Uint8Array} sharedSecret - 32字节的共享密钥
 * @returns {Object} 解密后的原始消息对象
 * @throws {Error} 如果解密失败（如密钥错误或消息被篡改）
 */
export function decrypt(ciphertext, nonce, sharedSecret) {
  const ciphertextBytes = decodeBase64(ciphertext);
  const nonceBytes = decodeBase64(nonce);
  const decrypted = nacl.secretbox.open(ciphertextBytes, nonceBytes, sharedSecret);
  if (!decrypted) {
    throw new Error('解密失败');
  }
  return JSON.parse(encodeUTF8(decrypted));
}

/**
 * 使用 Ed25519 私钥对消息进行数字签名
 * 
 * 数字签名的作用：
 * - 验证消息确实来自声称的发送者
 * - 确保消息在传输过程中未被篡改
 * - 提供不可否认性（发送者无法否认发送过的消息）
 * 
 * @param {Object|string} message - 要签名的消息（对象或字符串）
 * @param {string} secretKey - Ed25519 私钥（Base64 编码）
 * @returns {string} Base64 编码的数字签名
 */
export function sign(message, secretKey) {
  const messageBytes = decodeUTF8(typeof message === 'string' ? message : JSON.stringify(message));
  const secretKeyBytes = decodeBase64(secretKey);
  const signature = nacl.sign.detached(messageBytes, secretKeyBytes);
  return encodeBase64(signature);
}

/**
 * 使用 Ed25519 公钥验证数字签名
 * 
 * 签名验证过程：
 * 1. 将消息转换为字节格式
 * 2. 将签名从 Base64 解码
 * 3. 使用公钥验证签名是否有效
 * 
 * @param {Object|string} message - 原始消息
 * @param {string} signature - Base64 编码的数字签名
 * @param {string} publicKey - Ed25519 公钥（Base64 编码）
 * @returns {boolean} 签名是否有效
 */
export function verify(message, signature, publicKey) {
  const messageBytes = decodeUTF8(typeof message === 'string' ? message : JSON.stringify(message));
  const signatureBytes = decodeBase64(signature);
  const publicKeyBytes = decodeBase64(publicKey);
  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
}

/**
 * 生成安全的随机 ID
 * 使用 nacl.randomBytes 生成 16 字节随机数据
 * 移除 Base64 字符串中的特殊字符以获得简洁的 ID 格式
 * 
 * @returns {string} 16字符的随机 ID 字符串
 */
export function randomId() {
  return encodeBase64(nacl.randomBytes(16)).replace(/[/+=]/g, '').slice(0, 16);
}

export default {
  generateIdentity,
  ed25519ToX25519,
  deriveSharedSecret,
  encrypt,
  decrypt,
  sign,
  verify,
  randomId
};
