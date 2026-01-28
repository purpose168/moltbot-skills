#!/usr/bin/env python3
"""
Nest 设备访问 API 客户端

支持从 1Password 或环境变量获取凭证。
提供设备列表、温度控制、模式设置和摄像头流生成等功能。
"""

# ==================== 模块导入 ====================
import argparse           # 命令行参数解析
import json               # JSON 数据处理
import os                 # 操作系统功能
import subprocess         # 子进程管理
import sys                # 系统功能

import requests           # HTTP 请求库

# ==================== 凭证获取函数 ====================

def get_credentials():
    """
    从 1Password 或环境变量获取 Nest API 凭证
    
    此函数按照优先级顺序尝试获取 Nest API 凭证：
    1. 首先尝试从 1Password 获取（推荐）
    2. 如果 1Password 失败，回退到环境变量
    
    1Password 配置（可选）:
        - NEST_OP_VAULT: 保险库名称（默认: "Alfred"）
        - NEST_OP_ITEM: 项目名称（默认: "Nest Device Access API"）
        - OP_SERVICE_ACCOUNT_TOKEN 或 OP_TOKEN_*: 1Password 令牌
    
    环境变量（备用）:
        - NEST_PROJECT_ID: GCP 项目 ID
        - NEST_CLIENT_ID: OAuth 客户端 ID
        - NEST_CLIENT_SECRET: OAuth 客户端密钥
        - NEST_REFRESH_TOKEN: OAuth 刷新令牌
    
    返回:
        dict: 包含 credentials 信息的字典
        - project_id: GCP 项目 ID
        - client_id: OAuth 客户端 ID
        - client_secret: OAuth 客户端密钥
        - refresh_token: OAuth 刷新令牌
    
    异常:
        RuntimeError: 当环境变量未设置且 1Password 获取失败时
    """
    # 首先尝试 1Password
    op_token = None
    # 查找 1Password 令牌环境变量
    for key in os.environ:
        if key.startswith('OP_TOKEN_') or key == 'OP_SERVICE_ACCOUNT_TOKEN':
            op_token = os.environ[key]
            break
    
    # 如果找到 1Password 令牌，尝试从 1Password 获取凭证
    if op_token:
        vault = os.environ.get('NEST_OP_VAULT', 'Alfred')
        item = os.environ.get('NEST_OP_ITEM', 'Nest Device Access API')
        
        # 查找 op 可执行文件路径
        op_path = None
        for path in [os.path.expanduser('~/.local/bin/op'), '/usr/local/bin/op', 'op']:
            try:
                # 检查命令是否存在且可执行
                subprocess.run([path, '--version'], capture_output=True, check=True)
                op_path = path
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        # 如果找到 op 可执行文件，尝试读取 1Password 项目
        if op_path:
            try:
                result = subprocess.run(
                    [op_path, 'item', 'get', item, '--vault', vault, '--format', 'json'],
                    capture_output=True, text=True,
                    env={**os.environ, 'OP_SERVICE_ACCOUNT_TOKEN': op_token}
                )
                if result.returncode == 0:
                    item_data = json.loads(result.stdout)
                    # 将 1Password 字段转换为凭证字典
                    return {f['label']: f.get('value', '') for f in item_data['fields']}
            except Exception:
                pass  # 回退到环境变量
    
    # 回退到环境变量
    required = ['NEST_PROJECT_ID', 'NEST_CLIENT_ID', 'NEST_CLIENT_SECRET', 'NEST_REFRESH_TOKEN']
    missing = [k for k in required if not os.environ.get(k)]
    
    if missing:
        raise RuntimeError(
            f"缺少凭证。请设置环境变量: {', '.join(missing)}\n"
            "或使用 OP_SERVICE_ACCOUNT_TOKEN 配置 1Password"
        )
    
    return {
        'project_id': os.environ['NEST_PROJECT_ID'],
        'client_id': os.environ['NEST_CLIENT_ID'],
        'client_secret': os.environ['NEST_CLIENT_SECRET'],
        'refresh_token': os.environ['NEST_REFRESH_TOKEN'],
    }


def get_access_token(creds):
    """
    使用刷新令牌获取新的访问令牌
    
    参数:
        creds (dict): 包含 refresh_token 的凭证字典
    
    返回:
        str: 有效的 SDM API 访问令牌
    
    异常:
        requests.exceptions.HTTPError: 当令牌刷新失败时
    """
    response = requests.post('https://oauth2.googleapis.com/token', data={
        'client_id': creds['client_id'],
        'client_secret': creds['client_secret'],
        'refresh_token': creds['refresh_token'],
        'grant_type': 'refresh_token'
    })
    response.raise_for_status()
    return response.json()['access_token']


# ==================== Nest 客户端类 ====================

class NestClient:
    """
    Nest 智能设备管理 API 客户端
    
    提供与 Nest 设备交互的所有功能，包括：
    - 设备列表和状态查询
    - 恒温器温度和模式控制
    - 摄像头实时流生成
    
    使用方法:
        client = NestClient()  # 自动从 1Password 或环境变量加载凭证
        devices = client.list_devices()  # 获取设备列表
        client.set_heat_temperature(device_id, 21.0)  # 设置温度
    """
    
    # API 基础 URL
    BASE_URL = 'https://smartdevicemanagement.googleapis.com/v1'
    
    def __init__(self, creds=None):
        """
        初始化客户端
        
        参数:
            creds (dict, optional): 包含 project_id、client_id、client_secret、refresh_token 的字典
                                    如果未提供，将从 1Password 或环境变量加载
        """
        self.creds = creds or get_credentials()
        self.project_id = self.creds['project_id']
        self.access_token = get_access_token(self.creds)
        self.headers = {'Authorization': f'Bearer {self.access_token}'}
    
    def _request(self, method, path, **kwargs):
        """
        发送 API 请求的通用方法
        
        参数:
            method (str): HTTP 方法（GET、POST 等）
            path (str): API 路径（相对于 BASE_URL）
            **kwargs: 传递给 requests.request 的其他参数
        
        返回:
            dict: API 响应数据（JSON 解析后）
        """
        url = f"{self.BASE_URL}/enterprises/{self.project_id}{path}"
        response = requests.request(method, url, headers=self.headers, **kwargs)
        response.raise_for_status()
        return response.json() if response.text else {}
    
    # ==================== 设备管理方法 ====================
    
    def list_devices(self):
        """
        列出所有设备
        
        返回:
            list: 设备字典列表，每个设备包含类型、特征等信息
        """
        return self._request('GET', '/devices').get('devices', [])
    
    def get_device(self, device_id):
        """
        获取特定设备的详细信息
        
        参数:
            device_id (str): 设备 ID（如 'enterprises/project-id/devices/device-id'）
        
        返回:
            dict: 设备详细信息，包含类型、名称、特征等
        """
        return self._request('GET', f'/devices/{device_id}')
    
    def execute_command(self, device_id, command, params=None):
        """
        在设备上执行命令
        
        参数:
            device_id (str): 设备 ID
            command (str): 要执行的命令（如 'sdm.devices.commands.ThermostatMode.SetMode'）
            params (dict, optional): 命令参数
        
        返回:
            dict: 命令执行结果
        """
        body = {'command': command, 'params': params or {}}
        return self._request('POST', f'/devices/{device_id}:executeCommand', json=body)
    
    # ==================== 恒温器控制方法 ====================
    
    def set_thermostat_mode(self, device_id, mode):
        """
        设置恒温器模式
        
        参数:
            device_id (str): 恒温器设备 ID
            mode (str): 模式选择
                - 'HEAT': 制热模式
                - 'COOL': 制冷模式
                - 'HEATCOOL': 自动模式（制热+制冷）
                - 'OFF': 关闭
        
        返回:
            dict: 命令执行结果
        """
        return self.execute_command(
            device_id, 
            'sdm.devices.commands.ThermostatMode.SetMode', 
            {'mode': mode}
        )
    
    def set_heat_temperature(self, device_id, temp_celsius):
        """
        设置制热温度点（摄氏度）
        
        参数:
            device_id (str): 恒温器设备 ID
            temp_celsius (float): 目标温度（摄氏度）
        
        返回:
            dict: 命令执行结果
        """
        return self.execute_command(
            device_id,
            'sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat',
            {'heatCelsius': temp_celsius}
        )
    
    def set_cool_temperature(self, device_id, temp_celsius):
        """
        设置制冷温度点（摄氏度）
        
        参数:
            device_id (str): 恒温器设备 ID
            temp_celsius (float): 目标温度（摄氏度）
        
        返回:
            dict: 命令执行结果
        """
        return self.execute_command(
            device_id,
            'sdm.devices.commands.ThermostatTemperatureSetpoint.SetCool',
            {'coolCelsius': temp_celsius}
        )
    
    def set_heat_cool_temperature(self, device_id, heat_celsius, cool_celsius):
        """
        设置 HEATCOOL 模式的温度范围
        
        用于自动模式，设置制热和制冷温度点。
        
        参数:
            device_id (str): 恒温器设备 ID
            heat_celsius (float): 制热温度点（摄氏度）
            cool_celsius (float): 制冷温度点（摄氏度）
        
        返回:
            dict: 命令执行结果
        """
        return self.execute_command(
            device_id,
            'sdm.devices.commands.ThermostatTemperatureSetpoint.SetRange',
            {'heatCelsius': heat_celsius, 'coolCelsius': cool_celsius}
        )
    
    def set_eco_mode(self, device_id, mode):
        """
        设置节能模式
        
        参数:
            device_id (str): 恒温器设备 ID
            mode (str): 节能模式
                - 'MANUAL_ECO': 手动节能模式
                - 'OFF': 关闭节能模式
        
        返回:
            dict: 命令执行结果
        """
        return self.execute_command(
            device_id,
            'sdm.devices.commands.ThermostatEco.SetMode',
            {'mode': mode}
        )
    
    # ==================== 摄像头控制方法 ====================
    
    def generate_stream(self, device_id):
        """
        生成摄像头的 RTSP 实时流 URL
        
        参数:
            device_id (str): 摄像头设备 ID
        
        返回:
            dict: 包含 streamUrls（包含 RTSP URL）和其他流信息的字典
        
        注意:
            RTSP URL 有效期约 5 分钟
            需要使用支持的播放器（如 VLC）查看流
        """
        return self.execute_command(
            device_id,
            'sdm.devices.commands.CameraLiveStream.GenerateRtspStream'
        )
    
    def generate_webrtc_stream(self, device_id, offer_sdp):
        """
        生成摄像头的 WebRTC 流
        
        WebRTC 提供更低的延迟，适合实时通话等场景。
        
        参数:
            device_id (str): 摄像头设备 ID
            offer_sdp (str): WebRTC SDP offer
        
        返回:
            dict: 包含 WebRTC 流信息的字典
        """
        return self.execute_command(
            device_id,
            'sdm.devices.commands.CameraLiveStream.GenerateWebRtcStream',
            {'offerSdp': offer_sdp}
        )
    
    def extend_stream(self, device_id, stream_token):
        """
        延长活动的 RTSP 流
        
        参数:
            device_id (str): 摄像头设备 ID
            stream_token (str): 流扩展令牌
        
        返回:
            dict: 命令执行结果
        """
        return self.execute_command(
            device_id,
            'sdm.devices.commands.CameraLiveStream.ExtendRtspStream',
            {'streamExtensionToken': stream_token}
        )
    
    def stop_stream(self, device_id, stream_token):
        """
        停止活动的流
        
        参数:
            device_id (str): 摄像头设备 ID
            stream_token (str): 流令牌
        
        返回:
            dict: 命令执行结果
        """
        return self.execute_command(
            device_id,
            'sdm.devices.commands.CameraLiveStream.StopRtspStream',
            {'streamExtensionToken': stream_token}
        )


# ==================== 辅助函数 ====================

def format_device(device):
    """
    格式化设备信息以便于显示
    
    从原始设备数据中提取关键信息并格式化。
    
    参数:
        device (dict): 原始设备数据
    
    返回:
        dict: 格式化的设备信息，包含：
            - id: 设备 ID（简化格式）
            - type: 设备类型
            - custom_name: 自定义名称
            - temperature_c: 当前温度（摄氏度）
            - temperature_f: 当前温度（华氏度）
            - humidity: 湿度百分比
            - mode: 恒温器模式
            - available_modes: 可用模式列表
            - heat_setpoint_c: 制热温度点（摄氏度）
            - cool_setpoint_c: 制冷温度点（摄氏度）
            - hvac_status: HVAC 状态
            - eco_mode: 节能模式
            - live_stream: 是否支持实时流
            - event_image: 是否支持事件图像
    """
    # 提取设备名称中的 ID 部分
    name = device['name'].split('/')[-1]
    device_type = device['type'].split('.')[-1]
    traits = device.get('traits', {})
    
    # 初始化结果字典
    info = {'id': name, 'type': device_type}
    
    # 提取设备信息特征
    if 'sdm.devices.traits.Info' in traits:
        info['custom_name'] = traits['sdm.devices.traits.Info'].get('customName', '')
    
    # 提取温度特征
    if 'sdm.devices.traits.Temperature' in traits:
        temp = traits['sdm.devices.traits.Temperature'].get('ambientTemperatureCelsius')
        if temp:
            info['temperature_c'] = round(temp, 1)
            info['temperature_f'] = round(temp * 9/5 + 32, 1)
    
    # 提取湿度特征
    if 'sdm.devices.traits.Humidity' in traits:
        info['humidity'] = traits['sdm.devices.traits.Humidity'].get('ambientHumidityPercent')
    
    # 提取恒温器模式特征
    if 'sdm.devices.traits.ThermostatMode' in traits:
        info['mode'] = traits['sdm.devices.traits.ThermostatMode'].get('mode')
        info['available_modes'] = traits['sdm.devices.traits.ThermostatMode'].get('availableModes', [])
    
    # 提取恒温器温度设定点特征
    if 'sdm.devices.traits.ThermostatTemperatureSetpoint' in traits:
        setpoint = traits['sdm.devices.traits.ThermostatTemperatureSetpoint']
        if 'heatCelsius' in setpoint:
            info['heat_setpoint_c'] = round(setpoint['heatCelsius'], 1)
        if 'coolCelsius' in setpoint:
            info['cool_setpoint_c'] = round(setpoint['coolCelsius'], 1)
    
    # 提取恒温器 HVAC 状态特征
    if 'sdm.devices.traits.ThermostatHvac' in traits:
        info['hvac_status'] = traits['sdm.devices.traits.ThermostatHvac'].get('status')
    
    # 提取恒温器节能特征
    if 'sdm.devices.traits.ThermostatEco' in traits:
        eco = traits['sdm.devices.traits.ThermostatEco']
        info['eco_mode'] = eco.get('mode')
        if 'heatCelsius' in eco:
            info['eco_heat_c'] = eco['heatCelsius']
        if 'coolCelsius' in eco:
            info['eco_cool_c'] = eco['coolCelsius']
    
    # 提取摄像头实时流特征
    if 'sdm.devices.traits.CameraLiveStream' in traits:
        info['live_stream'] = True
        info['stream_protocols'] = traits['sdm.devices.traits.CameraLiveStream'].get('supportedProtocols', [])
    
    # 提取摄像头事件图像特征
    if 'sdm.devices.traits.CameraEventImage' in traits:
        info['event_image'] = True
    
    return info


def fahrenheit_to_celsius(f):
    """
    将华氏度转换为摄氏度
    
    参数:
        f (float): 华氏温度
    
    返回:
        float: 摄氏温度
    """
    return (f - 32) * 5/9


# ==================== 主函数 ====================

def main():
    """
    命令行入口点
    
    提供以下命令:
        list: 列出所有设备
        get: 获取设备详细信息
        set-temp: 设置恒温器温度
        set-mode: 设置恒温器模式
        set-eco: 设置节能模式
        stream: 生成摄像头流 URL
    """
    # 创建参数解析器
    parser = argparse.ArgumentParser(description='Nest 设备访问 API 客户端')
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    # 列出设备命令
    subparsers.add_parser('list', help='列出所有设备')
    
    # 获取设备命令
    get_parser = subparsers.add_parser('get', help='获取设备详情')
    get_parser.add_argument('device_id', help='设备 ID')
    
    # 设置温度命令
    temp_parser = subparsers.add_parser('set-temp', help='设置恒温器温度')
    temp_parser.add_argument('device_id', help='设备 ID')
    temp_parser.add_argument('temperature', type=float, help='温度值')
    temp_parser.add_argument('--unit', choices=['c', 'f'], default='c', help='温度单位（c=摄氏，f=华氏）')
    temp_parser.add_argument('--type', choices=['heat', 'cool'], default='heat', help='温度点类型（heat=制热，cool=制冷）')
    
    # 设置模式命令
    mode_parser = subparsers.add_parser('set-mode', help='设置恒温器模式')
    mode_parser.add_argument('device_id', help='设备 ID')
    mode_parser.add_argument('mode', choices=['HEAT', 'COOL', 'HEATCOOL', 'OFF'], help='恒温器模式')
    
    # 设置节能模式命令
    eco_parser = subparsers.add_parser('set-eco', help='设置节能模式')
    eco_parser.add_argument('device_id', help='设备 ID')
    eco_parser.add_argument('mode', choices=['MANUAL_ECO', 'OFF'], help='节能模式')
    
    # 生成摄像头流命令
    stream_parser = subparsers.add_parser('stream', help='生成摄像头流 URL')
    stream_parser.add_argument('device_id', help='设备 ID')
    
    # 解析参数
    args = parser.parse_args()
    
    # 如果没有提供命令，打印帮助信息
    if not args.command:
        parser.print_help()
        return
    
    try:
        # 创建 Nest 客户端
        client = NestClient()
        
        # 根据命令执行相应操作
        if args.command == 'list':
            devices = client.list_devices()
            print(json.dumps([format_device(d) for d in devices], indent=2))
        
        elif args.command == 'get':
            device = client.get_device(args.device_id)
            print(json.dumps(format_device(device), indent=2))
        
        elif args.command == 'set-temp':
            temp = args.temperature
            # 如果输入是华氏度，转换为摄氏度
            if args.unit == 'f':
                temp = fahrenheit_to_celsius(temp)
            
            # 根据类型设置温度
            if args.type == 'heat':
                client.set_heat_temperature(args.device_id, temp)
            else:
                client.set_cool_temperature(args.device_id, temp)
            print(json.dumps({'success': True, 'setpoint_c': round(temp, 1)}))
        
        elif args.command == 'set-mode':
            client.set_thermostat_mode(args.device_id, args.mode)
            print(json.dumps({'success': True, 'mode': args.mode}))
        
        elif args.command == 'set-eco':
            client.set_eco_mode(args.device_id, args.mode)
            print(json.dumps({'success': True, 'eco_mode': args.mode}))
        
        elif args.command == 'stream':
            result = client.generate_stream(args.device_id)
            print(json.dumps(result, indent=2))
    
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


# ==================== 程序入口 ====================
if __name__ == '__main__':
    main()
