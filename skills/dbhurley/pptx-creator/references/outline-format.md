# 大纲格式参考

## 基本结构

```markdown
# 演示文稿标题
subtitle: 可选副标题
author: 您的姓名

## 第一张幻灯片标题
- 项目符号一
- 项目符号二
- 项目符号三

## 第二张幻灯片标题
- 更多内容
- 这里也是
```

## 特殊指令

### 图像
```markdown
## 带图像的幻灯片
- ![替代文本](/path/to/image.png)
- ![hero](generate: AI图像生成描述)
```

### 图表
```markdown
## 图表幻灯片
- chart: bar
- data: /path/to/data.csv
- 描述图表的可选项目符号
```

图表类型: `bar`, `column`, `line`, `pie`, `doughnut`, `area`, `scatter`

### 表格
```markdown
## 表格幻灯片  
- table: my_table
- data: /path/to/data.csv
- columns: name, value, category
```

### 布局
```markdown
## 自定义布局幻灯片
- layout: two_column
- 左栏内容
- 右栏内容
```

布局: `title_and_content`, `two_column`, `image_and_text`, `chart`, `table`, `section`, `blank`

### 演讲者备注
```markdown
## 幻灯片标题
- 项目符号
> 这些是不会在幻灯片上显示的演讲者备注
> 它们帮助演讲者记住关键点
```

## 完整示例

```markdown
# 2026年第四季度回顾
subtitle: 表现与展望
author: 您的姓名

## 议程
- 第四季度表现亮点
- 区域细分
- 关键成果
- 2027年展望

## 第四季度亮点
- 收入: $4.2M (+18% 同比)
- 新客户: 47
- 留存率: 94%
> 强调与第三季度相比的留存率提升

## 区域表现
- chart: bar
- data: regional_sales_q4.csv
- 东北部领先增长24%
- 西部在第三季度下滑后恢复

## 关键成果
- ![logo](generate: 抽象庆祝场景，五彩纸屑，企业风格)
- 关闭重大企业交易
- 签署战略合作伙伴关系
- 产品发布成功

## 2027年展望
- layout: two_column
- **目标**: 1800万美元收入，200个新客户
- **投资**: 团队扩张，平台升级
- **风险**: 市场条件，竞争

## 后续步骤
- 敲定2027年目标
- 启动规划会议
- 第一季度管线审查
> 安排与区域负责人的跟进
```
