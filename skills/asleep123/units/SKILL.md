---
name: units
description: 使用 GNU Units 执行单位换算和计算。
metadata: {"clawdbot":{"emoji":"📏","requires":{"bins":["units"]}}}
---

# GNU Units 技能

使用 GNU `units` 通过命令行执行单位换算和计算。可通过 brew（macOS）或 apt（Linux）安装，安装包名称为 "units"。

## 使用方法

使用 `bash` 工具运行 `units` 命令。使用 `-t`（简洁）标志仅获取数值结果。

```bash
units -t '源单位' '目标单位'
```

### 示例

**基本换算：**
```bash
units -t '10 kg' 'lbs'
# 输出：22.046226
```

**复合单位：**
```bash
units -t '60 miles/hour' 'm/s'
# 输出：26.8224
```

**温度（非线性换算）：**
温度换算需要特定语法：`tempF(x)`、`tempC(x)`、`tempK(x)`
```bash
units -t 'tempF(98.6)' 'tempC'
# 输出：37
```

**时间换算：**
```bash
units -t '2 weeks' 'seconds'
```

**舍入输出：**
要舍入到指定小数位数（例如 3 位），使用 `-o "%.3f"`：
```bash
units -t -o "%.3f" '10 kg' 'lbs'
# 输出：22.046
```

**查看单位定义：**
要查看单位定义（不进行换算），省略第二个参数（不使用 `-t` 时输出更详细，适用于查看定义）：
```bash
units '1 acre'
```

## 注意事项

- **货币：** `units` 支持货币（USD、EUR 等），但汇率可能已过期，因为它们是定义文件中的静态值。
- **安全性：** 始终为单位加上引号，以防止 Shell 扩展问题（例如 `units -t '1/2 inch' 'mm'`）。
