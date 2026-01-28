# 每日文章模板

每日博客文章的头部和主体示例。

## 头部内容

```
title: 日记 {日期}
link: 日记-{日期}
published_date: {日期} 09:00
tags: 日记, 每日
make_discoverable: true
is_page: false
meta_description: {日期} 的思考和笔记
lang: fr
```

## 主体内容

```markdown
今天...

## 我学到的

- 第一点
- 第二点

## 我做的

- [x] 已完成任务
- [ ] 进行中的任务

## 思考

> 当日引用或想法

---

*明天见！*

{{ previous_post }}
```

## 使用说明

将 `{日期}` 替换为 YYYY-MM-DD 格式的实际日期。
