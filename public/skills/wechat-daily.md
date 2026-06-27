---
name: wechat-daily
description: 为个人微信公众号「王炸小纸条」生成每日「新能源&AI」日报，自动登录公众号后台创建草稿，用户只需在手机上点发布。触发词：运行日报、发布日报、生成日报、日报、做日报、今天的日报、推送日报、每日推文、公众号日报、微信日报。只要用户提到给公众号做日报、推送信息到公众号，就应当使用此skill，即使他们只是模糊地问"今天日报做好了吗"、"推一下今天的"。
---

# 微信公众号日报 Skill

为公众号 **「王炸小纸条」** 生成每日 **新能源&AI 日报** 并自动保存为公众号草稿。

## Workflow（按顺序执行）

### Step 1：信息搜集
搜索以下内容，每项都要附带原文链接：

| 搜索项 | 数量 | 说明 |
|--------|------|------|
| 南昌当日天气预报 | 1条 | 天气/温度/风力/湿度/AQI等 |
| AI领域动态（AI Coding + 具身智能） | 3~5条 | 每条附原文链接 |
| 新能源电源领域（风光储、零碳园区、绿电直连、虚拟电厂） | 3~5条 | 每条附原文链接，优先找 **江西省** 相关政策和动态 |

**重要程度标记**：新能源政策按重要程度标注 ⭐⭐⭐⭐⭐

### Step 2：编译内容
将搜集到的信息整理为以下结构：

```
标题：新能源&AI 日报 | YYYY.MM.DD
作者：王炸小纸条
正文：
  1. 顶部：居中标题 + 英文副标题 + 日期
  2. 天气卡片：浅米色卡片（背景色 #f8f6f2）
  3. 能源前沿（3~5条）：每条含来源标签、标题、摘要、原文链接、解读卡片
  4. AI视野（3~5条）：每条含来源标签、标题、摘要、原文链接
  5. 今日聚焦：双列卡片（ENERGY / AI 各一个一句话总结）
  6. 底部：CLAUDE · 每日简报
```

### Step 3：注入模板
读取 `C:\Users\Administrator\.claude\skills\wechat-daily\scripts\inject_template.txt` 模板文件，参考其HTML结构和排版样式，构建新的注入脚本内容。模板中的HTML结构、样式、配色方案必须保留，只需替换数据（日期、天气、新闻条目、链接、解读、聚焦）。

**CSS 配色规范（固定不变）：**
- 主标题金色渐变 → 用 `color:#1a1713` + `color:#b8942e`
- 能源边框 → `border-left:4px solid #d4af37`
- AI边框 → `border-left:4px solid #4a6fa5`
- 天气卡片 → `background-color:#f8f6f2;border:1px solid #e8e0d0;border-radius:12px`
- 解读卡片 → `background-color:#fdfbf7;border:1px solid #ede6d5;border-radius:8px`
- 正文文字 → `font-size:15px;color:#555;line-height:1.8`
- 标题文字 → `font-size:17px;font-weight:bold;color:#1a1713`
- 标签日期 → `font-size:13px;color:#b8942e`
- 链接文本 → `font-size:13px;color:#b8942e;word-break:break-all`
- 字体大小偏大，适合40+年龄段

**链接处理**：微信后台会过滤可点击的外部链接，所以链接以**纯文本超链接**形式显示：
```
📎 来源：https://xxx.xxx/xxx
```
用户长按复制即可访问。

### Step 4：登录公众号后台并创建草稿
使用 CDP 浏览器代理（web-access skill）：

1. 打开新标签页到 `https://mp.weixin.qq.com/`
2. 检查是否已登录（看页面URL是否包含 `token=`）
3. 如未登录 → 提示用户扫码
4. 已登录 → 获取 token 值
5. 导航到新文章编辑器：
   ```
   /cgi-bin/appmsg?t=media/appmsg_edit&action=edit&lang=zh_CN&token=TOKEN&type=10&create=1
   ```
6. 设置标题（`document.getElementById('title').value`）
7. 设置作者（`document.getElementById('author').value = '王炸小纸条'`）
8. 找到正文编辑器：`document.querySelectorAll('[contenteditable]')[2]`
9. 使用 `execCommand('insertHTML')` 注入内容
10. 点击「保存为草稿」（`document.querySelector('span.btn.btn_primary')`）

### Step 5：通知用户
告知用户草稿已就绪，到手机「公众号助手」App预览发布。

## ⚠️ 关键注意事项（必须遵守）

### 编码问题
**必须使用 PowerShell 执行 CDP eval，不得使用 bash。** Bash 传输中文字符会损坏导致乱码。

正确的调用方式：
```powershell
$t = "targetId"
$jsCode = Get-Content -Path "脚本路径.js" -Raw -Encoding UTF8
Invoke-RestMethod -Uri "http://localhost:3456/eval?target=$t" -Method Post -Body $jsCode -ContentType "text/plain; charset=utf-8"
```

### 注入方式
- 先 `execCommand('insertHTML')` 注入全部HTML内容
- 内容里不包含 `<a href>` 可点击链接（微信后台会过滤），改用纯文本展示URL
- 不要在内容中使用 ClipboardEvent 粘贴方式（会导致中文乱码）

### 保存前确认
注入后检查：
- 标题是否正确设置
- 正文编辑器有内容（`textContent.length > 0`）
- 然后才点击保存按钮

### 浏览器标签管理
- 所有操作使用 CDP 创建的新后台 tab
- 完成后关闭自己创建的 tab（`/close`）
- 不要操作用户已有的 tab

## 示例模板路径
`C:\Users\Administrator\.claude\skills\wechat-daily\scripts\inject_template.txt`
