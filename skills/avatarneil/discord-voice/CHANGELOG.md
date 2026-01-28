# 更新日志

Clawdbot的Discord语音插件的所有重大更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/spec/v2.0.0.html)。

## [0.1.0] - 2026-01-26

### 新增功能
- Discord语音插件初始发布
- 语音活动检测(VAD)用于自动语音检测
- 支持使用Whisper(OpenAI)和Deepgram进行语音转文本
- 使用Deepgram WebSocket进行流式STT，延迟降低约1秒
- 支持使用OpenAI TTS和ElevenLabs进行文本转语音
- 流式TTS实现实时音频播放
- 打断支持以中断机器人回复
- 带心跳监控的自动重连功能
- Discord斜杠命令：`/voice join`、`/voice leave`、`/voice status`
- 用于语音管理的CLI命令
- 代理工具 `discord_voice` 用于程序控制
- 可配置的VAD灵敏度(低/中等/高)
- 用户白名单支持以限制访问
- STT连接设置期间的自动音频缓冲
- 处理锁防止重复/竞争响应
- 代理处理期间的思考声音指示器

### 问题修复
- 流式STT连接设置期间缓冲音频
- 将处理锁移到音频滤镜之后以防止永久锁定
- 即使代理调用失败也要始终停止思考声音
- 移除车道限制以允许完整的工具访问

### 安全性
- STT/TTS提供商的API密钥验证
- 允许用户的用户权限检查
- 敏感凭据的环境变量支持
