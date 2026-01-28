#!/usr/bin/env python3
"""
Nest Pub/Sub Webhook 服务器

接收来自谷歌云 Pub/Sub 的 Nest 设备事件推送消息。
对于门铃事件，通过 SDM GenerateImage API 捕获快照并直接发送到 Telegram 以提高速度。
"""

# ==================== 模块导入 ====================
# 导入标准库模块
import base64              # Base64 编码/解码，用于处理 Pub/Sub 消息数据
import json                # JSON 数据解析和序列化
import os                  # 操作系统功能，如环境变量访问
import subprocess          # 子进程管理，用于调用 1Password CLI
import sys                 # 系统相关功能，如退出状态
import tempfile            # 临时文件操作
import time                # 时间相关功能，如时间戳处理
import urllib.request      # HTTP 请求处理
import urllib.error        # HTTP 错误异常处理
from datetime import datetime  # 日期时间处理

# 导入 HTTP 服务器模块
from http.server import HTTPServer, BaseHTTPRequestHandler

# ==================== 配置常量 ====================
# 从环境变量读取配置，如果未设置则使用默认值

# ClawDBot 网关 URL - 用于发送感知通知
# 默认值：http://localhost:18789（本地开发环境）
GATEWAY_URL = os.environ.get('CLAWDBOT_GATEWAY_URL', 'http://localhost:18789')

# ClawDBot 钩子令牌 - 用于身份验证和授权
# 必须设置此值才能发送感知通知
HOOKS_TOKEN = os.environ.get('CLAWDBOT_HOOKS_TOKEN', '')

# Telegram 机器人令牌 - 用于发送消息和照片到 Telegram
# 从环境变量读取，如果未设置则为空字符串
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')

# Telegram 聊天 ID - 指定接收消息的聊天（用户或群组）
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')

# 1Password 服务账户令牌 - 用于从 1Password 获取 Nest API 凭证
# 从环境变量读取，如果未设置则为空字符串
OP_TOKEN = os.environ.get('OP_SVC_ACCT_TOKEN', '')

# ==================== 凭证缓存 ====================
# 用于缓存 Nest API 凭证和访问令牌，避免重复获取

# Nest API 凭证缓存（从 1Password 获取）
# 格式：{'project_id': str, 'client_id': str, 'client_secret': str, 'refresh_token': str}
_nest_creds = {}

# 访问令牌缓存，包含令牌值和过期时间
# 格式：{'token': str, 'expires': float (Unix 时间戳)}
_access_token = {'token': None, 'expires': 0}

# ==================== 事件类型定义 ====================
# Nest 设备事件类型到人类可读描述的映射

EVENT_TYPES = {
    # 门铃事件 - 按门铃时触发
    'sdm.devices.events.DoorbellChime.Chime': '🔔 门铃响了！',
    # 摄像头移动检测事件 - 检测到移动时触发
    'sdm.devices.events.CameraMotion.Motion': '📹 检测到移动',
    # 摄像头人员检测事件 - 检测到人员时触发
    'sdm.devices.events.CameraPerson.Person': '🚶 检测到人员',
    # 摄像头声音检测事件 - 检测到声音时触发
    'sdm.devices.events.CameraSound.Sound': '🔊 检测到声音',
    # 摄像头剪辑预览事件 - 剪辑准备就绪时触发
    'sdm.devices.events.CameraClipPreview.ClipPreview': '🎬 剪辑已准备',
}


# ==================== 凭证管理函数 ====================

def get_nest_creds():
    """
    从 1Password 获取 Nest API 凭证（带缓存）
    
    此函数从 1Password 保险库中读取 Nest 设备访问所需的凭证信息。
    凭证获取后会被缓存，避免重复调用 1Password CLI。
    
    返回:
        dict: 包含 project_id、client_id、client_secret、refresh_token 的字典
        None: 如果无法获取凭证（如未设置 OP_TOKEN 或 1Password 读取失败）
    
    1Password 配置:
        - 保险库名称：Alfred（可通过 NEST_OP_VAULT 环境变量自定义）
        - 项目名称：Nest Device Access API（可通过 NEST_OP_ITEM 环境变量自定义）
    """
    global _nest_creds  # 声明全局变量，以便修改缓存
    
    # 如果已有缓存的凭证，直接返回
    if _nest_creds:
        return _nest_creds
    
    # 检查是否设置了 1Password 服务账户令牌
    if not OP_TOKEN:
        print("[NEST] 未设置 OP_SVC_ACCT_TOKEN 环境变量")
        return None
    
    # 构建环境变量，添加 1Password 服务账户令牌
    env = {**os.environ, 'OP_SERVICE_ACCOUNT_TOKEN': OP_TOKEN}
    
    # 查找 1Password CLI 可执行文件路径
    op = os.path.expanduser('~/.local/bin/op')
    vault_id = 'Alfred'  # 1Password 保险库名称
    
    try:
        # 用于存储从 1Password 读取的字段值
        fields = {}
        
        # 遍历需要读取的字段名
        for field in ['project_id', 'client_id', 'client_secret', 'refresh_token']:
            # 构建 1Password 读取命令
            result = subprocess.run(
                [op, 'read', f'op://{vault_id}/Nest Device Access API/{field}'],  # 1Password 读取命令
                capture_output=True,  # 捕获标准输出和标准错误
                text=True,            # 将输出解析为文本
                env=env,              # 环境变量
                timeout=10            # 超时时间：10秒
            )
            
            # 检查命令执行是否成功
            if result.returncode != 0:
                print(f"[NEST] 读取 {field} 失败: {result.stderr.strip()}")
                return None
            
            # 存储读取的字段值（去除首尾空白）
            fields[field] = result.stdout.strip()
        
        # 缓存凭证（只显示项目 ID 的前 8 位以保护隐私）
        _nest_creds = fields
        print(f"[NEST] 凭证已加载（项目：{fields['project_id'][:8]}...）")
        return fields
    
    except Exception as e:
        print(f"[NEST] 加载凭证时出错: {e}")
        return None


def get_access_token():
    """
    获取有效的 SDM 访问令牌，必要时刷新
    
    此函数检查缓存的访问令牌是否仍然有效。
    如果令牌过期或不存在，则使用刷新令牌获取新的访问令牌。
    
    返回:
        str: 有效的 SDM API 访问令牌
        None: 如果无法获取令牌（如凭证无效或网络错误）
    
    令牌生命周期:
        - 令牌通常有效期为 1 小时
        - 在过期前 60 秒自动刷新（通过检查 expires 字段）
    """
    global _access_token  # 声明全局变量
    
    # 检查缓存的令牌是否存在且未过期
    # time.time() 返回当前 Unix 时间戳
    if _access_token['token'] and time.time() < _access_token['expires']:
        return _access_token['token']  # 返回缓存的令牌
    
    # 获取 Nest API 凭证
    creds = get_nest_creds()
    if not creds:
        return None  # 凭证获取失败
    
    try:
        # 构建刷新令牌的请求数据
        data = urllib.parse.urlencode({
            'client_id': creds['client_id'],          # OAuth 客户端 ID
            'client_secret': creds['client_secret'],  # OAuth 客户端密钥
            'refresh_token': creds['refresh_token'],  # 刷新令牌
            'grant_type': 'refresh_token',            # 授权类型：刷新令牌
        }).encode()  # 编码为字节
        
        # 发送 POST 请求到谷歌 OAuth2 令牌端点
        req = urllib.request.Request('https://oauth2.googleapis.com/token', data=data, method='POST')
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            
            # 更新令牌缓存
            _access_token['token'] = result['access_token']  # 新访问令牌
            # 计算过期时间：当前时间 + 有效期 - 60秒缓冲
            _access_token['expires'] = time.time() + result.get('expires_in', 3600) - 60
            return _access_token['token']
    
    except Exception as e:
        print(f"[NEST] 令牌刷新失败: {e}")
        return None


# ==================== 图像捕获函数 ====================

def generate_event_image(device_id, event_id):
    """
    使用 SDM GenerateImage API 从摄像头事件获取快照
    
    此函数调用 SDM API 生成与特定事件关联的图像。
    这是获取门铃/人员事件快照的首选方法，速度快且准确。
    
    参数:
        device_id (str): Nest 设备 ID，格式如 'enterprises/project-id/devices/device-id'
        event_id (str): 事件 ID，用于关联要捕获的图像
    
    返回:
        bytes: JPEG 格式的图像数据
        None: 如果无法获取图像（如 API 错误或设备不支持）
    
    图像有效期:
        SDM 生成的图像 URL 有效期约 5 分钟
        应尽快下载和使用
    """
    token = get_access_token()
    if not token:
        return None  # 无法获取访问令牌
    
    try:
        # 构建 SDM API 请求 URL
        url = f'https://smartdevicemanagement.googleapis.com/v1/{device_id}:executeCommand'
        
        # 构建请求体：调用 CameraEventImage.GenerateImage 命令
        payload = json.dumps({
            'command': 'sdm.devices.commands.CameraEventImage.GenerateImage',
            'params': {'event_id': event_id}
        }).encode()
        
        # 创建 HTTP 请求，包含授权头
        req = urllib.request.Request(url, data=payload, method='POST', headers={
            'Authorization': f'Bearer {token}',  # Bearer 令牌认证
            'Content-Type': 'application/json',  # 内容类型
        })
        
        # 发送请求并解析响应
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            image_url = result.get('results', {}).get('url')      # 图像 URL
            image_token = result.get('results', {}).get('token')  # 图像访问令牌
            
            # 检查响应中是否包含图像 URL
            if not image_url:
                print(f"[IMAGE] 响应中无 URL: {result}")
                return None
            
            # 下载图像数据
            img_req = urllib.request.Request(image_url, headers={
                'Authorization': f'Basic {image_token}',  # Basic 认证
            })
            with urllib.request.urlopen(img_req, timeout=15) as img_resp:
                image_data = img_resp.read()  # 读取图像数据
                print(f"[IMAGE] 已下载 {len(image_data)} 字节")
                return image_data
    
    except urllib.error.HTTPError as e:
        # 处理 HTTP 错误
        body = e.read().decode() if e.fp else ''
        print(f"[IMAGE] API 错误 {e.code}: {body[:500]}")
        return None
    except Exception as e:
        print(f"[IMAGE] 错误: {e}")
        return None


def capture_rtsp_frame(device_id):
    """
    备用方案：通过 RTSP 流捕获摄像头帧
    
    当 GenerateImage API 失败时，使用此函数作为备选方案。
    通过 RTSP 流获取当前帧截图。
    
    参数:
        device_id (str): Nest 设备 ID
    
    返回:
        bytes: JPEG 格式的图像数据
        None: 如果无法获取帧（如流生成失败或 ffmpeg 错误）
    
    依赖:
        - ffmpeg: 必须安装在系统 PATH 中
        - RTSP 流支持：某些设备可能不支持 RTSP 流
    """
    token = get_access_token()
    if not token:
        return None
    
    try:
        # 生成 RTSP 流
        url = f'https://smartdevicemanagement.googleapis.com/v1/{device_id}:executeCommand'
        payload = json.dumps({
            'command': 'sdm.devices.commands.CameraLiveStream.GenerateRtspStream',
            'params': {}
        }).encode()
        
        req = urllib.request.Request(url, data=payload, method='POST', headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        })
        
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            rtsp_url = result.get('results', {}).get('streamUrls', {}).get('rtspUrl')
        
        if not rtsp_url:
            print("[RTSP] 未返回流 URL")
            return None
        
        # 使用 ffmpeg 捕获帧
        # 创建临时文件存储捕获的图像
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            output_path = f.name
        
        # 运行 ffmpeg 命令捕获帧
        # 参数说明：
        #   -y: 覆盖已存在的文件
        #   -rtsp_transport tcp: 使用 TCP 传输 RTSP 流
        #   -i: 输入源（RTSP URL）
        #   -frames:v 1: 只捕获一帧
        #   -q:v 2: JPEG 质量（2 表示高质量）
        #   -f image2: 输出格式
        subprocess.run([
            'ffmpeg', '-y', '-rtsp_transport', 'tcp',
            '-i', rtsp_url, '-frames:v', '1', '-q:v', '2',
            '-f', 'image2', output_path
        ], capture_output=True, timeout=15)
        
        # 检查文件是否成功创建
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            with open(output_path, 'rb') as f:
                data = f.read()  # 读取图像数据
            os.unlink(output_path)  # 删除临时文件
            print(f"[RTSP] 已捕获 {len(data)} 字节")
            return data
        
        return None
    except Exception as e:
        print(f"[RTSP] 错误: {e}")
        return None


# ==================== Telegram 通知函数 ====================

def send_telegram_photo(image_data, caption):
    """
    直接发送照片到 Telegram
    
    此函数将图像数据发送到 Telegram Bot API。
    用于门铃或人员检测事件时发送快照。
    
    参数:
        image_data (bytes): JPEG 格式的图像数据
        caption (str): 照片的说明文字
    
    返回:
        bool: True 表示发送成功，False 表示失败
    
    依赖:
        - TELEGRAM_BOT_TOKEN: 必须设置有效的机器人令牌
        - TELEGRAM_CHAT_ID: 必须设置有效的聊天 ID
    """
    if not TELEGRAM_BOT_TOKEN:
        print("[TELEGRAM] 未配置机器人令牌")
        return False
    
    try:
        import io  # 内存文件操作
        
        # 定义 multipart 表单数据的边界
        boundary = '----NestWebhookBoundary'
        body = b''
        
        # 构建表单字段：chat_id
        body += f'--{boundary}\r\n'.encode()
        body += b'Content-Disposition: form-data; name="chat_id"\r\n\r\n'
        body += f'{TELEGRAM_CHAT_ID}\r\n'.encode()
        
        # 构建表单字段：caption（说明文字）
        body += f'--{boundary}\r\n'.encode()
        body += b'Content-Disposition: form-data; name="caption"\r\n\r\n'
        body += f'{caption}\r\n'.encode()
        
        # 构建表单字段：photo（图像文件）
        body += f'--{boundary}\r\n'.encode()
        body += b'Content-Disposition: form-data; name="photo"; filename="doorbell.jpg"\r\n'
        body += b'Content-Type: image/jpeg\r\n\r\n'
        body += image_data  # 添加图像数据
        body += b'\r\n'
        
        # 结束边界
        body += f'--{boundary}--\r\n'.encode()
        
        # 发送请求到 Telegram Bot API
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto'
        req = urllib.request.Request(url, data=body, method='POST', headers={
            'Content-Type': f'multipart/form-data; boundary={boundary}',
        })
        
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            if result.get('ok'):
                print(f"[TELEGRAM] 照片发送成功")
                return True
            else:
                print(f"[TELEGRAM] API 错误: {result}")
                return False
    
    except Exception as e:
        print(f"[TELEGRAM] 发送照片时出错: {e}")
        return False


def send_telegram_message(text):
    """
    发送文本消息到 Telegram
    
    参数:
        text (str): 要发送的文本消息
    
    返回:
        bool: True 表示发送成功，False 表示失败
    """
    if not TELEGRAM_BOT_TOKEN:
        return False
    
    try:
        payload = json.dumps({
            'chat_id': TELEGRAM_CHAT_ID,
            'text': text,
        }).encode()
        
        url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
        req = urllib.request.Request(url, data=payload, method='POST', headers={
            'Content-Type': 'application/json',
        })
        
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read()).get('ok', False)
    except Exception as e:
        print(f"[TELEGRAM] 错误: {e}")
        return False


def send_clawdbot_hook(message):
    """
    通过钩子通知 Clawdbot（用于感知，非主要传递方式）
    
    此函数发送通知到 ClawDBot 网关，但不作为主要的事件传递方式。
    用于让 ClawDBot 系统感知到发生了 Nest 事件。
    
    参数:
        message (str): 要发送的通知消息
    
    依赖:
        - HOOKS_TOKEN: 必须设置有效的钩子令牌
        - GATEWAY_URL: 必须设置有效的网关 URL
    """
    if not HOOKS_TOKEN:
        return
    
    try:
        payload = json.dumps({
            'message': f'NEST 事件: {message}',
            'name': 'Nest',
            'deliver': False,  # 不作为主要传递方式
        }).encode()
        
        req = urllib.request.Request(
            f"{GATEWAY_URL}/hooks/agent",
            data=payload, method='POST',
            headers={
                'Authorization': f'Bearer {HOOKS_TOKEN}',
                'Content-Type': 'application/json',
            },
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"[HOOK] 错误: {e}")


# ==================== HTTP 请求处理 ====================

class NestWebhookHandler(BaseHTTPRequestHandler):
    """
    Nest Webhook HTTP 请求处理器
    
    处理来自谷歌云 Pub/Sub 的推送通知。
    支持以下端点：
        - GET /health: 健康检查端点
        - POST /nest/events: Nest 事件接收端点
    """
    
    def log_message(self, fmt, *args):
        """
        覆盖父类的日志方法，自定义日志格式
        
        参数:
            fmt: 格式字符串
            *args: 格式参数
        """
        print(f"[HTTP] {args[0]}")
    
    def send_json(self, data, status=200):
        """
        发送 JSON 响应
        
        参数:
            data: 要序列化为 JSON 的数据
            status: HTTP 状态码（默认 200）
        """
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)
    
    def do_GET(self):
        """
        处理 GET 请求
        
        支持端点:
            /health: 返回服务健康状态
            其他: 返回 404 错误
        """
        if self.path == '/health':
            self.send_json({'status': 'healthy', 'service': 'nest-webhook'})
        else:
            self.send_json({'error': 'Not found'}, 404)
    
    def do_POST(self):
        """
        处理 POST 请求
        
        支持端点:
            /nest/events: 接收 Nest 设备事件
            其他: 返回 404 错误
        """
        if self.path != '/nest/events':
            self.send_json({'error': 'Not found'}, 404)
            return
        
        # 读取请求体
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        # 立即响应，ACK 让 Pub/Sub 不重试
        # 这是重要的一步：确保快速响应避免 Pub/Sub 认为投递失败
        self.send_json({'status': 'ok'})
        
        # 异步处理事件（在响应后处理，但仍在同一处理器中）
        try:
            # 解析 Pub/Sub 信封
            envelope = json.loads(body.decode())
            pubsub_message = envelope.get('message', {})
            data_b64 = pubsub_message.get('data', '')
            # Base64 解码并解析 JSON
            data = json.loads(base64.b64decode(data_b64).decode())
        except Exception as e:
            print(f"[ERROR] 解码失败: {e}")
            return
        
        print(f"[EVENT] {json.dumps(data, indent=2)}")
        
        # 检查事件时效性 - 跳过过期事件（>5 分钟）
        event_ts_str = data.get('timestamp', '')
        if event_ts_str:
            try:
                from datetime import timezone
                # 解析 ISO 时间戳（可能有毫秒部分）
                event_ts_str_clean = event_ts_str.replace('Z', '+00:00')
                event_time = datetime.fromisoformat(event_ts_str_clean)
                now = datetime.now(timezone.utc)
                age_seconds = (now - event_time).total_seconds()
                
                # 如果事件超过 5 分钟，只记录不发送提醒
                if age_seconds > 300:  # 300 秒 = 5 分钟
                    print(f"[EVENT] 过期事件（{age_seconds:.0f}秒前）— 跳过提醒")
                    return
            except Exception as e:
                print(f"[EVENT] 无法解析时间戳: {e}")
        
        # 提取事件数据
        resource_update = data.get('resourceUpdate', {})
        events = resource_update.get('events', {})
        device_id = resource_update.get('name', '')
        
        # 定义哪些事件发送到 Telegram（门铃和人员总是发送）
        ALERT_EVENTS = {
            'sdm.devices.events.DoorbellChime.Chime',
            'sdm.devices.events.CameraPerson.Person',
        }
        # 只记录不发送提醒的事件类型
        LOG_ONLY_EVENTS = {
            'sdm.devices.events.CameraMotion.Motion',
            'sdm.devices.events.CameraSound.Sound',
            'sdm.devices.events.CameraClipPreview.ClipPreview',
        }
        
        # 遍历所有事件
        for event_type, event_data in events.items():
            description = EVENT_TYPES.get(event_type, f'事件: {event_type}')
            event_id = event_data.get('eventId', '')
            
            # 格式化时间戳
            try:
                from datetime import timezone
                timestamp = datetime.now(timezone.utc).strftime('%H:%M:%S UTC')
            except ImportError:
                timestamp = datetime.utcnow().strftime('%H:%M:%S UTC')
            
            print(f"[EVENT] {description} | 设备: {device_id[-8:]} | 事件ID: {event_id[:12]}")
            
            # 只对门铃和人员事件发送提醒
            if event_type in LOG_ONLY_EVENTS:
                print(f"[EVENT] 仅记录（不提醒）: {event_type}")
                send_clawdbot_hook(description)
                continue
            
            # 对于门铃/人员事件，尝试获取图像
            if event_id and ('Doorbell' in event_type or 'Camera' in event_type):
                caption = f"{description}\n🕐 {timestamp}"
                
                # 首选 GenerateImage API（快速），备用 RTSP
                image_data = generate_event_image(device_id, event_id)
                if not image_data:
                    print("[EVENT] GenerateImage 失败，尝试 RTSP 备用...")
                    image_data = capture_rtsp_frame(device_id)
                
                if image_data:
                    send_telegram_photo(image_data, caption)
                else:
                    # 无法捕获图像，发送文本提醒
                    send_telegram_message(f"{description}\n🕐 {timestamp}\n⚠️ 无法捕获图像")
            else:
                # 非摄像头事件，只发送文本
                send_telegram_message(f"{description}\n🕐 {timestamp}")
            
            # 通知 ClawDBot（感知通知，非阻塞）
            send_clawdbot_hook(description)
        
        # 静默记录特征更新
        traits = resource_update.get('traits', {})
        if traits and not events:
            for trait_name, trait_value in traits.items():
                print(f"[TRAIT] {trait_name}: {trait_value}")


# 需要 urllib.parse 用于令牌刷新
import urllib.parse


# ==================== 主函数 ====================

def main():
    """
    主入口函数
    
    启动 Nest webhook 服务器。
    服务器监听指定端口（默认 8420），接受来自谷歌云 Pub/Sub 的推送通知。
    """
    # 从环境变量读取端口配置，默认 8420
    port = int(os.environ.get('PORT', 8420))
    
    # 打印启动信息
    print(f"启动 Nest webhook 服务器，端口 {port}")
    print(f"网关 URL: {GATEWAY_URL}")
    print(f"钩子令牌: {'已设置' if HOOKS_TOKEN else '未设置'}")
    print(f" Telegram 机器人: {'已设置' if TELEGRAM_BOT_TOKEN else '未设置'}")
    print(f" Telegram 聊天: {TELEGRAM_CHAT_ID}")
    
    # 预热凭证（提前获取，避免首次请求延迟）
    get_nest_creds()
    
    # 创建并启动 HTTP 服务器
    server = HTTPServer(('0.0.0.0', port), NestWebhookHandler)
    try:
        server.serve_forever()  # 无限运行
    except KeyboardInterrupt:
        # 捕获 Ctrl+C 信号，优雅关闭
        print("\n正在关闭...")
        server.shutdown()


# ==================== 程序入口 ====================
if __name__ == '__main__':
    main()
