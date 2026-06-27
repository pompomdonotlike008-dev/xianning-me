---
name: green-power-calc
description: 绿电直连电费计算器（三种模式对比：传统两部制、绿电两部制、绿电容量制）。基于1192号文，支持授权管理、每日限频、永久白名单。部署于 GitHub Pages。
---

# 绿电直连电费计算器

基于1192号文的三模式电费对比工具。用户在微信中可使用，支持免费试用、管理员授权、永久白名单。

## 项目文件

项目路径：`F:\试验\项目14-费用支付\`

| 文件 | 说明 |
|------|------|
| `electricity_calculator.html` | 主计算器页面（部署为 GitHub Pages index.html） |
| `admin_approve.html` | 管理员授权面板（部署为 approve.html） |
| `_deploy_v12.py` | 部署脚本 |
| `_validate_deploy.py` | 线上验证脚本 |
| `_update_algorithm.py` | 算法更新脚本 |

## 计算公式

```javascript
// 基础变量
H = 730
E_total = E_new + E_grid
p_full = p_buy + p_loss + p_trans + p_op + p_fund
p_grid_no_trans = p_buy + p_loss + p_op + p_fund

// 1️⃣ 传统两部制（全部大网购电）
total_trad = T × p_cap + E_total × p_full

// 2️⃣ 绿电直连两部制
cap_g2 = T × p_cap
green_g2 = E_new × (p_protocol + p_fund + p_trans)
grid_g2 = E_grid × p_full
total_g2 = cap_g2 + green_g2 + grid_g2

// 3️⃣ 绿电直连容量制
cap_gc = T × p_cap
green_gc = E_new × (p_protocol + p_fund)
grid_gc = E_grid × p_grid_no_trans
trans_gc = T × 730 × p_trans × (LFm%)
total_gc = cap_gc + green_gc + grid_gc + trans_gc
```

## 授权流程

```
打开页面 → 覆盖层显示（昵称输入）
         → 输昵称 → 关弹窗 → 进入计算界面
         → 点「开始计算」→ _click=0 → 免费出结果 → _click=1
         → 再点「开始计算」→ showPaymentWall()
         → 输入昵称 → 提交到 pending_list
         → 管理员 approve → calc_unlocked=true
         → 点「开始计算」→ 消耗 calc_unlocked → 出结果
         → 再点「开始计算」→ 回到授权弹窗
```

## 关键机制

### 免费追踪（内存变量）
```javascript
var _click = 0;  // 刷新页面重置
if (_click === 0) { _click++; __runCalc(); return; }
```

### 覆盖层显示（三重保障）
1. CSS class: `.payment-overlay { display: flex }`
2. HTML inline: `style="display:flex!important"`
3. Inline script: `<script>document.getElementById(...).style.display='flex'</script>`

### 授权消耗（用完即锁）
```javascript
localStorage.removeItem('calc_unlocked');
localStorage.removeItem('calc_ticket');
__runCalc(); return;
```

### 每日限频
```javascript
function checkDailyLimit(nick) {
  var key = 'dl_' + nick + '_' + YYYY-MM-DD;
  var n = parseInt(localStorage.getItem(key)) || 0;
  if (n >= 30) { alert('今日已用30次'); return false; }
  localStorage.setItem(key, String(n + 1));
  return true;
}
```

## localStorage 键清单

| 键 | 用途 | 生命周期 |
|----|------|---------|
| `_v8` | 版本迁移标记 | 永久 |
| `_fr1` | 免费标记/历史遗留 | 永久 |
| `calc_nick` | 用户微信昵称 | 关注后 |
| `calc_unlocked` | 授权解锁 | 每次计算消耗 |
| `calc_waiting` | 等待授权中 | 授权后清除 |
| `calc_ticket` | 授权票据 | 授权后清除 |
| `calc_perm_{nick}` | 永久白名单 | 永久 |
| `auto_mode` | 自动模式 | 开关 |
| `dl_{nick}_{date}` | 每日次数 | 日级 |

## GitHub 数据文件

路径：`unlock_data/` 目录下

| 文件 | 说明 |
|------|------|
| `pending_list.json` | 待授权列表 `[{nick, ticket, time}]` |
| `approved_list.json` | 已授权列表 `[{nick, ticket, time}]` |
| `permanent.json` | 永久白名单 `[{nick, added}]` |
| `auto_mode.json` | 自动模式标志 |

## 部署

```bash
# 部署计算器
python _deploy_v12.py

# 验证线上
python _validate_deploy.py
```

GitHub Pages URL: `https://pompomdonotlike008-dev.github.io/green-power-calculator/`
管理员面板: `https://pompomdonotlike008-dev.github.io/green-power-calculator/approve.html`

GitHub Token: 需替换为你自己的 `ghp_xxx`（在 GitHub Settings → Developer settings → PAT 中生成，勾选 repo 权限）

## 微信 X5 兼容要点

- `localStorage` 可能抛出异常 → 全部包 `try-catch`
- 覆盖层用 `!important` + 内联 `<script>` 双保险
- `doCalc` 最外层 `catch(e) { showPaymentWall(); }` 不让绕过
