# 韦斯莱魔法赌坊 - 开发进度报告

## 需求概要

- **主题**: 韦斯莱魔法赌坊 (哈利波特主题)
- **货币**: 直接用 API 额度下注 (500000 quota = $1)
- **赔率**: 标准赌场赔率 (庄家微弱优势)
- **随机数**: 服务端 crypto/rand
- **下注限制**: 全局统一 (min $0.01, max $10.00, 日亏损上限 $50.00)

## 游戏列表 (6个)

| # | 游戏 | 类型 | 阶段 | 状态 |
|---|------|------|------|------|
| 1 | 21点 (Blackjack) | 经典桌游 | P1 | ✅ 已完成 |
| 2 | 骰子猜大小 (Hi-Lo Dice) | 简单游戏 | P1 | ✅ 已完成 |
| 3 | 轮盘 (Roulette) | 经典桌游 | P2 | ✅ 已完成 |
| 4 | 百家乐 (Baccarat) | 经典桌游 | P2 | ✅ 已完成 |
| 5 | HP老虎机 (Slot Machine) | 老虎机 | P3 | ✅ 已完成 |
| 6 | 德州扑克 (Texas Hold'em) | 扑克 | P3 | ✅ 已完成 |

## 开发阶段

### Phase 1: 框架 + 21点 + 骰子 + 大厅 + 管理后台 ✅ 已完成
- [x] **后端框架**: 数据模型 (CasinoGameRecord, CasinoDailyStats)、服务层、路由、控制器
- [x] **赌场配置**: CasinoSetting (下注限制、日亏损、6个游戏开关) via config.GlobalConfig
- [x] **21点游戏**: 完整 Blackjack 引擎 (hit/stand/double/split, 6副牌, 庄家站软17, BJ赔2.5x)
- [x] **骰子游戏**: 4种下注 (大/小/幸运7/猜数字), 各有独立赔率
- [x] **游戏记录**: 完整下注/结果/盈亏历史 + 分页查询
- [x] **赌场大厅页**: 6个游戏卡片 + 用户统计 + Top5排行榜 + HP主题
- [x] **21点前端**: 完整游戏UI + CSS发牌动画 + 翻牌动画 + PlayingCard组件
- [x] **骰子前端**: 完整游戏UI + CSS骰子滚动动画 + DiceDisplay组件 + 赔率表
- [x] **管理后台**: 3个Tab (设置/运营统计/用户管理) + Recharts图表
- [x] **侧栏入口**: 一级菜单「韦斯莱赌坊」+ 管理员「赌场管理」
- [x] **共享组件**: BetControls, PlayingCard, CardHand, DiceDisplay, DicePair
- [x] **i18n**: zh-CN + en 翻译键 (~100个)
- [x] **CSS动画**: card-deal, card-shake, dice-roll 3个keyframe动画

### Phase 2: 轮盘 + 百家乐 ✅ 已完成
- [x] **轮盘后端**: 欧式单零轮盘, 13种下注 (单号/红黑/奇偶/高低/打/列), crypto/rand
- [x] **轮盘前端**: 数字网格 + 外围注按钮 + 旋转动画 + roulette-reveal CSS + 最近开奖彩色圆点
- [x] **百家乐后端**: 8副牌, 完整第三张牌规则, 庄家5%佣金, 和局8:1
- [x] **百家乐前端**: 闲庄双区牌桌 + PlayingCard复用 + 交错发牌动画 + 天牌检测 + golden-glow CSS
- [x] **大厅更新**: roulette/baccarat 从"即将开放"变为可玩
- [x] **路由**: App.jsx 新增2条路由, router/api-router.go 新增2条API路由
- [x] **i18n**: zh-CN + en 新增~30个翻译键
- [x] **CSS动画**: roulette-reveal + golden-glow 2个新keyframe动画

### Phase 3: 老虎机 + 德州扑克 ✅ 已完成
- [x] **老虎机后端**: 3x3网格, 8种HP符号(巧克力蛙→金色飞贼), 加权随机(crypto/rand), 5条赔付线, 免费旋转(最多3次), RTP~95%
- [x] **老虎机前端**: 卷轴旋转动画(逐列停止), 符号表情渲染, 赔付表(可折叠), 中奖线高亮+弹跳, 免费旋转闪光
- [x] **德扑后端**: 1v3 AI(弗雷德激进/乔治保守/卢娜平衡), 完整牌力评估(皇家同花顺→高牌), Fisher-Yates洗牌, 盲注系统, AI决策+诈唬
- [x] **德扑前端**: 椭圆绿色牌桌, 4人座位布局, AI性格徽章, 阶段指示器, 操作按钮(弃/跟/加/All-in), AI思考动画, 牌型展示
- [x] **大厅更新**: 全部6个游戏从"即将开放"变为可玩
- [x] **路由**: App.jsx +2路由, router/api-router.go +3 API路由
- [x] **i18n**: zh-CN + en ~54个新翻译键
- [x] **CSS动画**: slot-spin, slot-bounce, thinking-pulse 3个新keyframe

### Phase 4: 成就 + 排行榜 + 跑马灯 + 统计 ✅ 已完成
- [x] **成就系统**: 12个默认成就 (初入赌坊/连胜/盈利/场次/单笔大奖/BJ天牌/皇家同花顺/免费旋转/All-in), 自动检测+领取奖励
- [x] **大奖跑马灯**: CasinoBigWin模型, payout>=5x自动记录, 前端无限滚动marquee组件, 60秒自动刷新
- [x] **排行榜页面**: 5种排名(盈亏/场次/最大奖/胜率/下注量), 奖牌Top3 + 表格, 胜率需10局起
- [x] **个人统计页面**: 总览卡片(场次/胜率/盈亏/最大奖) + 详细数据 + 游戏历史
- [x] **成就弹窗**: AchievementToast组件, 游戏中自动弹出新解锁成就
- [x] **SettleBet增强**: 结算后异步检查成就+记录大奖
- [x] **大厅增强**: 跑马灯+成就进度摘要+快捷链接(成就/排行榜/统计)
- [x] **API不一致修复**: 6处前后端字段名不一致全部修复
- [x] **DB新增3表**: casino_achievements, casino_user_achievements, casino_big_wins + 种子数据

## 技术架构

### 后端文件 (Phase 1 已创建)
```
model/casino.go                          — CasinoGameRecord + CasinoDailyStats + 全部CRUD
setting/operation_setting/casino_setting.go — CasinoSetting (enabled, bet limits, game toggles)
service/casino.go                        — ValidateBet, PlaceBet, SettleBet, GetConfig, GetStats
service/casino_blackjack.go              — 完整Blackjack引擎 (6副牌, crypto/rand, Fisher-Yates)
service/casino_dice.go                   — 骰子引擎 (4种下注, crypto/rand)
controller/casino.go                     — 11个API handler (7 user + 4 admin)
router/api-router.go                     — 新增11条路由 (/api/casino/*)
model/main.go                            — 新增2张表自动迁移
```

### 前端文件 (Phase 1 已创建)
```
web/src/pages/casino/lobby.jsx           — 赌场大厅 (HP主题, 游戏卡片, 统计, 排行)
web/src/pages/casino/blackjack.jsx       — 21点游戏页 (完整游戏流程 + 动画)
web/src/pages/casino/dice.jsx            — 骰子游戏页 (4种下注 + 滚动动画)
web/src/pages/admin/casino.jsx           — 管理后台 (设置/统计/用户 3个Tab)
web/src/components/casino/playing-card.jsx — CSS扑克牌组件 + CardHand
web/src/components/casino/dice-display.jsx — CSS骰子组件 + DicePair
web/src/components/casino/bet-controls.jsx — 通用下注控件 (快捷按钮 + 余额)
web/src/components/layout/sidebar.jsx    — 新增赌场+赌场管理侧栏入口
web/src/hooks/use-sidebar-modules.js     — 新增casino模块配置
web/src/App.jsx                          — 新增4条前端路由
web/src/styles/globals.css               — 新增3个CSS keyframe动画
web/src/i18n/locales/zh-CN.json          — 新增~100个中文翻译键
web/src/i18n/locales/en.json             — 新增~100个英文翻译键
```

### 数据库表 (自动迁移)
```
casino_game_records  — 游戏记录 (下注/结果/盈亏/游戏类型/状态/详情JSON)
casino_daily_stats   — 用户每日统计 (控制日亏损上限 + 运营分析)
```

### API 端点 (11个)
```
用户端 (UserAuth):
  GET  /api/casino/config         — 赌场配置 (游戏列表, 下注限制)
  GET  /api/casino/me             — 个人统计
  GET  /api/casino/history        — 游戏历史 (?page=&per_page=&game_type=)
  GET  /api/casino/leaderboard    — 排行榜 (?type=profit&limit=20)
  POST /api/casino/blackjack/deal — 21点发牌 {bet}
  POST /api/casino/blackjack/action — 21点操作 {game_id, action}
  POST /api/casino/dice/roll      — 骰子 {bet, bet_type, bet_value?}

管理端 (AdminAuth):
  GET  /api/casino/admin/stats    — 运营统计
  GET  /api/casino/admin/users    — 用户列表 (?page=&per_page=&search=)
  POST /api/casino/admin/ban      — 封禁用户 {user_id, banned}
  POST /api/casino/admin/toggle   — 游戏开关 {game, enabled}
```

## 代码审计结果

### 后端: A+ (优秀)
- ✅ JSON规则: 全部使用 common.Marshal/Unmarshal
- ✅ 数据库兼容: 纯GORM抽象, 支持 SQLite/MySQL/PostgreSQL
- ✅ 随机数安全: crypto/rand + Fisher-Yates洗牌
- ✅ 额度系统: 正确使用 IncreaseUserQuota/DecreaseUserQuota
- ✅ 错误信息: 全部中文
- ⚡ 已修复: 庄家补牌逻辑冗余条件
- ⚡ 已修复: 成就领取竞态条件 (原子UPDATE WHERE)
- ⚡ 已修复: SettleBet goroutine panic恢复
- ⚡ 已修复: 管理后台3个API字段名不一致

### 前端: A (良好)
- ✅ 组件: Radix UI + Tailwind CSS, 响应式布局
- ✅ API集成: 所有端点正确调用
- ✅ 错误处理: 统一使用 showError()
- ✅ 动画: 纯CSS实现 (card-deal, dice-roll, card-shake)
- ⚡ 已修复: bet-controls快捷按钮i18n, blackjack结果文案i18n

## 设计配色
- 深紫色 #2D1B4E — 魔法背景
- 金色 #C5A55A — 胜利高亮
- 暗绿 #1B4332 — 赌桌底色
- 陶土色 #D97757 — 项目强调色 (图表)

## 更新日志

- **2026-03-15**: Phase 1 完成 — 框架+21点+骰子+大厅+管理后台, 后端编译通过, 前端构建通过, 代码审计通过
- **2026-03-15**: Phase 2 完成 — 轮盘(13种下注)+百家乐(完整第三张牌规则), 后端编译通过, 前端构建通过
- **2026-03-15**: Phase 3 完成 — HP老虎机(8符号+5赔付线+免费旋转)+德州扑克(1v3 AI+完整手牌评估), 全6游戏可玩
- **2026-03-15**: Phase 4 完成 — 成就系统(12个)+排行榜(5维度)+大奖跑马灯+个人统计+6处API不一致修复. 赌场系统全部完成!
- **2026-03-15**: 收尾审计修复 — 3份审计报告(API一致性/后端bug/前端质量)处理完成:
  - CRITICAL: 管理后台API字段名不一致修复3处 (total_games→total_bets, unique_players→active_users, total_bet→total_wagered)
  - CRITICAL: 成就领取竞态条件修复 — 改用原子UPDATE WHERE防止并发重复领取奖励
  - HIGH: SettleBet异步goroutine添加panic恢复
  - HIGH: Blackjack庄家补牌注释修正 (代码逻辑正确, 注释描述有误)
  - 排除3项误报: Blackjack split/double扣款逻辑正确, Poker raise验证正确, Baccarat整数除法在最低下注额下无精度损失
- **2026-03-15**: 深度审计修复 — 第二轮4 agent并行审计(API一致性/后端bug/前端质量/路由+i18n), 修复15项问题:
  - CRITICAL: PlaceBet原子扣款 — 新增SafeDecreaseQuotaForBet(WHERE quota >= ?)防止并发负余额
  - HIGH: 管理后台API路径修复 — stats/summary→stats, ban URL和请求体修正
  - HIGH: AdminToggleGame持久化 — 游戏开关写入DB(model.UpdateOption)
  - HIGH: AdminBanUser实际生效 — 封禁状态存入options表, ValidateBet检查封禁
  - HIGH: 成就页claimed_at→claimed字段修正 + target字段添加
  - HIGH: 管理用户列表添加banned字段
  - MEDIUM: 德扑hand_rank+winner字段添加, Blackjack dealer_showing添加
  - MEDIUM: Poker AI开注bug修复 (CurrentBet=0时使用底池比例作为基础)
  - MEDIUM: 清理未使用导入(baccarat/leaderboard/admin/poker), 删除死代码
  - i18n: zh-CN与en翻译键完全一致(234个), 路由一致性通过
