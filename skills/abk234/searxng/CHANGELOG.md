# 更新日志

SearXNG技能的所有重要更改都将记录在此文件中。

格式基于[保持更新日志](https://keepachangelog.com/en/1.0.0/)，
本项目遵循[语义化版本控制](https://semver.org/spec/v2.0.0.html)。

## [1.0.1] - 2026-01-26

### 更改
- **安全性：** 将默认SEARXNG_URL从硬编码的私有URL更改为通用的 `http://localhost:8080`
- **配置：** 将SEARXNG_URL设为必需配置（无私有默认值）
- 更新所有文档以强调配置要求
- 从所有文档中删除硬编码的私有URL

### 安全性
- 消除了在发布的代码中暴露私有SearXNG实例URL

## [1.0.0] - 2026-01-26

### 新增
- 初始发布
- 通过本地SearXNG实例进行网络搜索
- 多种搜索类别（general、images、videos、news、map、music、files、it、science）
- 时间范围筛选（day、week、month、year）
- 带有结果片段的丰富表格输出
- 用于程序化使用的JSON输出模式
- SSL自签名证书支持
- 通过SEARXNG_URL环境变量配置SearXNG实例URL
- 全面的错误处理
- 带有argparse的丰富CLI

### 特性
- 隐私优先（所有搜索本地）
- 无需API密钥
- 多引擎结果聚合
- 美观的格式化输出
- 语言选择支持