# Nox API 宠物系统 — 分阶段开发计划

## 系统概述

为 Nox API 平台增加一套虚拟宠物系统，提供养成、收集、交易的娱乐体验，与签到、社区、额度经济深度整合。

### 核心设定

| 项目 | 设定 |
|------|------|
| 宠物风格 | 像素/卡通幻想生物（宝可梦风），CSS/SVG 纯代码动画 |
| 初始种类 | 5-10 种（如火焰狐、水晶兔、电子猫、星辰龙、暗影鸦…） |
| 稀有度 | N / R / SR / SSR（影响属性、外观精细度、产出能力） |
| 进化 | 3 阶段自动进化：蛋 → 幼生 → 成熟（达到等级阈值自动触发） |
| 拥有上限 | 每用户固定 20 只 |
| 状态系统 | 多维：饱食度、心情、洁净度（需定期维护） |
| 死亡机制 | 不会死亡，不喂养会进入"虚弱"状态（不能派遣/产出） |
| 重复宠物 | 融合升星（提升属性/星级） |
| 装扮系统 | 后续版本 |

### 页面导航

侧边栏独立分组"宠物"，包含子菜单：
- 我的宠物（宠物园）
- 召唤（扭蛋）
- 冒险（任务派遣）
- 市场（交易所）
- 排行榜

---

## Phase 1：基础框架 + 宠物领养

> 目标：搭建数据模型和管理后台，实现最基本的宠物领养与展示。

### 后端

#### 数据模型

```
pet_species (宠物物种定义)
├── id, name, description
├── rarity (N/R/SR/SSR)
├── element (属性/元素类型)
├── base_stats (JSON: attack, defense, speed, luck)
├── evolution_stages (JSON: [{stage, level_required, name, description}])
├── visual_key (CSS/SVG 资源标识符)
├── is_starter (是否为初始可选宠物)
├── enabled (上下架)
├── created_at, updated_at

user_pets (用户拥有的宠物实例)
├── id, user_id, species_id
├── nickname (用户自定义昵称)
├── level, exp
├── stage (0=蛋, 1=幼生, 2=成熟)
├── star (星级，融合升星)
├── stats (JSON: 当前属性，受等级/星级加成)
├── status (JSON: {hunger, mood, cleanliness})
├── is_primary (是否为主宠展示)
├── state (normal/weak/dispatched)
├── last_fed_at, last_played_at
├── hatched_at (孵化时间)
├── created_at, updated_at

pet_items (物品定义)
├── id, name, description, type (food/potion/material)
├── rarity, effect (JSON: {hunger: +30, mood: +20, ...})
├── price (quota 价格)
├── visual_key
├── enabled, created_at, updated_at

user_pet_items (用户物品背包)
├── id, user_id, item_id, quantity
├── created_at, updated_at

pet_config (系统配置，存入 setting/option)
├── pet_enabled (总开关)
├── max_pets_per_user (上限，默认 20)
├── starter_species_ids (初始可选物种列表)
├── status_decay_rate (状态衰减速率)
```

#### API 端点

```
# 管理员 - 物种管理
GET    /api/admin/pet/species          — 列表（分页、筛选）
POST   /api/admin/pet/species          — 创建
PUT    /api/admin/pet/species/:id      — 更新
DELETE /api/admin/pet/species/:id      — 删除

# 管理员 - 物品管理
GET    /api/admin/pet/items            — 列表
POST   /api/admin/pet/items            — 创建
PUT    /api/admin/pet/items/:id        — 更新
DELETE /api/admin/pet/items/:id        — 删除

# 管理员 - 配置
GET    /api/admin/pet/config           — 获取配置
PUT    /api/admin/pet/config           — 更新配置

# 用户 - 宠物
GET    /api/pet/my                     — 我的宠物列表
GET    /api/pet/:id                    — 宠物详情
POST   /api/pet/adopt                  — 领养初始宠物（首次免费）
PUT    /api/pet/:id/nickname           — 修改昵称
PUT    /api/pet/:id/primary            — 设为主宠
DELETE /api/pet/:id                    — 放生（释放宠物）

# 用户 - 背包
GET    /api/pet/inventory              — 我的物品背包
```

### 前端

#### 管理后台页面
- `web/src/pages/admin/pet-species.jsx` — 宠物物种管理（CRUD 表格 + 编辑弹窗）
- `web/src/pages/admin/pet-items.jsx` — 物品管理
- 运营设置 tab 中增加宠物系统开关 + 基础配置

#### 用户页面
- `web/src/pages/pet/index.jsx` — 宠物园主页（网格展示所有宠物，点击进入详情）
- `web/src/pages/pet/detail.jsx` — 宠物详情页（大图、属性、状态条）
- `web/src/pages/pet/adopt.jsx` — 初始宠物领养页（选择 starter 宠物）

#### 视觉组件
- `web/src/components/pet/pet-sprite.jsx` — 宠物精灵渲染组件（根据 species + stage 渲染 CSS/SVG）
- `web/src/components/pet/pet-card.jsx` — 宠物卡片组件（用于宠物园网格）
- `web/src/components/pet/rarity-badge.jsx` — 稀有度徽章（N/R/SR/SSR 颜色标识）

#### 侧边栏
- 新增"宠物"分组，子菜单：我的宠物

### Phase 1 交付物
- [x] 数据库迁移（所有基础表）
- [x] 管理员可创建/编辑/上下架宠物物种
- [x] 管理员可创建/编辑物品
- [x] 管理员可开关宠物系统
- [x] 用户可领养一只初始宠物（从 starter 列表中选择）
- [x] 宠物园页面展示用户所有宠物
- [x] 宠物详情页展示基本信息和属性
- [x] 宠物精灵 CSS/SVG 组件（至少 5 种物种 × 1 阶段）
- [x] 侧边栏导航

---

## Phase 2：养成系统 + 签到整合

> 目标：实现宠物养成核心循环（喂养→互动→升级→进化），与签到系统联动。

### 后端

#### 状态衰减机制
- 定时任务或惰性计算：根据 `last_fed_at` / `last_played_at` 与当前时间差，按配置速率计算当前状态值
- 状态值范围 0-100，降至 0 时宠物进入"虚弱"状态
- 虚弱状态：不能派遣任务、不产出收益、在宠物园中显示特殊外观

#### 喂养与互动
- 使用物品喂养：消耗背包中的食物，恢复对应状态值，获得 EXP
- 触摸/玩耍：每日有次数限制（如 5 次），每次恢复少量心情 + 获得 EXP
- 洁净度：随时间下降，使用清洁物品恢复

#### 等级与进化
- EXP 累积升级，升级曲线递增
- 达到进化等级阈值时自动进化（如 Lv.10 → 幼生, Lv.30 → 成熟）
- 进化时属性成长、外观变化

#### 签到整合
- 签到奖励除 quota 外，额外获得：宠物食物 × N、少量 EXP 直接注入主宠
- 连续签到天数越多，宠物资源奖励越丰厚

#### API 端点

```
# 互动
POST   /api/pet/:id/feed              — 喂养（body: {item_id, quantity}）
POST   /api/pet/:id/play              — 玩耍/触摸
POST   /api/pet/:id/clean             — 清洁
GET    /api/pet/:id/status             — 获取实时状态（惰性计算）

# 商店
GET    /api/pet/shop                   — 物品商店列表
POST   /api/pet/shop/buy               — 购买物品（消耗 quota）
```

### 前端

#### 宠物详情页增强
- 状态条可视化（饱食度/心情/洁净度 三色进度条）
- 喂养按钮（打开背包选择食物）
- 玩耍按钮（触发触摸/玩耍动画，冷却状态显示）
- 清洁按钮
- 等级/经验条
- 进化提示 + 进化动画

#### 商店页面
- `web/src/pages/pet/shop.jsx` — 物品商店（按类型分 tab：食物/药水/材料）

#### 视觉组件
- 宠物精灵组件增加 3 阶段外观
- 互动动画（喂食、触摸、清洁的 CSS 动画反馈）
- 进化动画（光效 + 形态切换）
- 虚弱状态外观（灰暗/瞌睡效果）

#### 签到页面改造
- 签到奖励展示增加宠物资源（图标 + 数量）
- 签到成功弹窗中展示获得的宠物物品

### 侧边栏
- 新增子菜单：商店

### Phase 2 交付物
- [x] 状态惰性计算 + 衰减机制
- [x] 喂养/玩耍/清洁互动 + EXP 获取
- [x] 虚弱状态视觉反馈
- [x] 等级升级 + 3 阶段自动进化
- [x] 进化动画
- [x] 全部 5-10 种物种 × 3 阶段的 CSS/SVG 精灵
- [x] 物品商店（quota 购买）
- [x] 签到联动（额外宠物资源奖励）

---

## Phase 3：召唤（扭蛋）+ 融合

> 目标：实现宠物抽取和重复宠物融合升星系统。

### 后端

#### 数据模型扩展

```
gacha_pools (卡池定义)
├── id, name, description
├── cost_per_pull (单抽 quota 价格)
├── ten_pull_discount (十连折扣，如 0.9 = 九折)
├── rates (JSON: {N: 0.60, R: 0.25, SR: 0.12, SSR: 0.03})
├── pity_config (JSON: {sr_pity: 10, ssr_pity: 80})
├── species_pool (JSON: [{species_id, weight}])
├── enabled, start_time, end_time
├── created_at, updated_at

gacha_history (抽取记录)
├── id, user_id, pool_id
├── species_id, rarity
├── is_pity (是否触发保底)
├── created_at

user_pity_counter (保底计数器)
├── id, user_id, pool_id
├── sr_counter, ssr_counter
├── updated_at
```

#### 抽取逻辑
- 单抽：消耗 quota，按概率出宠物
- 十连：消耗 quota × 10 × 折扣率，保底至少一只 R 或以上
- SR 保底：每 N 抽必出（如 10 抽保底）
- SSR 保底：每 N 抽必出（如 80 抽保底）
- 抽到宠物后自动加入宠物园（满 20 只时无法抽取，需先放生或交易）

#### 融合升星
- 消耗同种宠物 + 少量 quota 进行融合
- 每次融合提升 1 星（最高 5 星）
- 星级加成：属性百分比提升（如每星 +10% 全属性）
- 被融合的宠物销毁

#### API 端点

```
# 扭蛋
GET    /api/pet/gacha/pools            — 可用卡池列表
POST   /api/pet/gacha/pull             — 抽取（body: {pool_id, count: 1|10}）
GET    /api/pet/gacha/history          — 我的抽取记录
GET    /api/pet/gacha/pity             — 我的保底计数

# 融合
POST   /api/pet/fusion                 — 融合升星（body: {pet_id, material_pet_id}）

# 管理员 - 卡池管理
GET    /api/admin/pet/gacha/pools      — 列表
POST   /api/admin/pet/gacha/pools      — 创建
PUT    /api/admin/pet/gacha/pools/:id  — 更新
DELETE /api/admin/pet/gacha/pools/:id  — 删除
```

### 前端

#### 召唤页面
- `web/src/pages/pet/gacha.jsx` — 扭蛋主页
  - 卡池展示（banner + 概率公示）
  - 单抽/十连按钮（显示 quota 价格）
  - 抽取动画（蛋碎裂 → 宠物出现 → 稀有度光效）
  - SSR 出货时全屏特效
  - 保底计数器显示（距离下次保底 X 抽）
  - 抽取历史记录

#### 融合页面
- `web/src/pages/pet/fusion.jsx` — 融合升星
  - 选择主宠 + 选择材料宠物（同种）
  - 融合预览（升星后属性对比）
  - 融合动画

#### 视觉组件
- 稀有度抽卡动画（N 普通光效 → SSR 炫彩全屏）
- 星级显示组件（1-5 星 ★）
- 融合动画

### 侧边栏
- 新增子菜单：召唤、融合

### Phase 3 交付物
- [x] 卡池管理（管理员 CRUD）
- [x] 单抽 + 十连 + 保底机制
- [x] 抽卡动画（分稀有度不同特效）
- [x] 概率公示
- [x] 抽取历史
- [x] 同种宠物融合升星
- [x] 星级属性加成

---

## Phase 4：冒险（任务派遣）+ 社交整合

> 目标：实现宠物任务派遣系统和社区联动。

### 后端

#### 数据模型扩展

```
pet_missions (任务定义)
├── id, name, description
├── duration (时长，秒)
├── difficulty (1-5)
├── required_level (最低等级要求)
├── stat_weights (JSON: {attack: 0.3, speed: 0.5, luck: 0.2} — 影响成功率的属性权重)
├── rewards (JSON: [{type: "quota"|"item"|"exp", id?, amount, probability}])
├── max_daily (每日可派遣次数上限)
├── enabled, created_at, updated_at

pet_dispatches (派遣记录)
├── id, user_id, pet_id, mission_id
├── started_at, ends_at
├── status (in_progress/completed/collected)
├── success (bool，完成时计算)
├── rewards_data (JSON: 实际获得的奖励)
├── created_at

pet_activities (宠物动态，用于社区 Feed)
├── id, user_id, pet_id
├── activity_type (hatched/evolved/star_up/ssr_pulled/mission_complete)
├── data (JSON: 动态详情)
├── post_id (关联的社区帖子 ID，可空)
├── created_at
```

#### 任务派遣逻辑
- 选择宠物 + 选择任务 → 开始派遣
- 派遣期间宠物状态为 `dispatched`，不能喂养/玩耍/交易
- 倒计时结束后变为 `completed`，等待领取
- 成功率 = 基于宠物属性 × 任务属性权重计算（0-100%）
- 成功：获得全部奖励；失败：获得部分奖励（如 30%）
- 可同时派遣多只宠物执行不同任务

#### 社交整合
- 关键事件自动生成宠物动态：进化、升星、SSR 出货、稀有任务完成
- 动态可选择发布到社区（作为特殊类型帖子）
- 个人主页展示主宠信息（物种、等级、星级、精灵图）
- 宠物园对外开放（他人可访问 `/console/user/:id` 查看宠物园 tab）

#### API 端点

```
# 任务派遣
GET    /api/pet/missions               — 可用任务列表
POST   /api/pet/dispatch               — 派遣（body: {pet_id, mission_id}）
GET    /api/pet/dispatches             — 我的派遣列表（进行中+待领取）
POST   /api/pet/dispatch/:id/collect   — 领取奖励
GET    /api/pet/dispatch/history       — 派遣历史

# 社交
GET    /api/pet/user/:id               — 查看他人宠物园
GET    /api/pet/activities             — 宠物动态 Feed

# 排行榜
GET    /api/pet/ranking                — 宠物排行（最高等级/最多宠物/最高星级）

# 管理员 - 任务管理
GET    /api/admin/pet/missions         — 列表
POST   /api/admin/pet/missions         — 创建
PUT    /api/admin/pet/missions/:id     — 更新
DELETE /api/admin/pet/missions/:id     — 删除
```

### 前端

#### 冒险页面
- `web/src/pages/pet/adventure.jsx` — 任务派遣主页
  - 可用任务列表（难度/时长/奖励预览/推荐宠物）
  - 派遣中的任务（倒计时进度条）
  - 待领取的任务（闪烁提示）
  - 领取奖励弹窗（展示获得物品）

#### 社交组件
- 个人主页 (`user-profile`) 增加宠物 tab — 展示宠物园
- 个人主页旁显示主宠精灵小图标
- 社区帖子旁显示作者主宠小图标
- 宠物动态卡片组件（用于社区 Feed）

#### 排行榜
- `web/src/pages/pet/ranking.jsx` — 宠物排行榜
  - 最高等级宠物
  - 最多宠物收集
  - 最高总星级

### 侧边栏
- 新增子菜单：冒险、排行榜

### Phase 4 交付物
- [x] 管理员可创建/编辑任务
- [x] 宠物派遣 + 倒计时 + 奖励领取
- [x] 成功率计算（属性相关）
- [x] 宠物动态系统（关键事件自动记录）
- [x] 个人主页展示主宠 + 宠物园 tab
- [x] 社区帖子旁显示主宠
- [x] 宠物排行榜

---

## Phase 5：交易所 + 管理后台完善

> 目标：实现完整的宠物交易市场，完善管理后台。

### 后端

#### 数据模型扩展

```
pet_market_listings (市场挂单)
├── id, seller_id, pet_id
├── listing_type (fixed_price/auction)
├── price (一口价，fixed_price 时使用)
├── min_bid (起拍价，auction 时使用)
├── current_bid (当前最高出价)
├── current_bidder_id
├── bid_count
├── expires_at (挂单到期时间)
├── status (active/sold/expired/cancelled)
├── created_at, updated_at

pet_market_bids (竞价记录)
├── id, listing_id, bidder_id
├── amount
├── created_at

pet_market_transactions (成交记录)
├── id, listing_id
├── seller_id, buyer_id, pet_id
├── price (成交价)
├── listing_type
├── created_at

pet_price_history (价格历史，按物种聚合)
├── id, species_id, rarity, star
├── avg_price, min_price, max_price
├── transaction_count
├── period (daily 快照)
├── date, created_at
```

#### 交易逻辑
- **一口价**：卖家设定固定价格，买家直接支付 quota 购买
- **竞拍**：卖家设定起拍价 + 到期时间，买家出价（每次 +5% 或自定义），到期最高价成交
- 挂单时宠物状态变为 `listed`，不能喂养/派遣
- 手续费：成交金额的 5% 扣除（可管理员配置）
- 价格历史：每日定时聚合成交数据

#### 管理后台完善
- 查看任意用户的宠物列表和详情
- 给指定用户发放宠物（指定物种、等级、星级）
- 给指定用户发放物品
- 市场交易监控（近期交易、异常检测）
- 宠物系统数据统计面板（总宠物数、活跃用户、交易量等）

#### API 端点

```
# 市场
GET    /api/pet/market                 — 浏览市场（分页、筛选：物种/稀有度/价格区间/类型）
GET    /api/pet/market/:id             — 挂单详情
POST   /api/pet/market/list            — 创建挂单（body: {pet_id, type, price, ...}）
POST   /api/pet/market/:id/buy         — 一口价购买
POST   /api/pet/market/:id/bid         — 竞价出价
DELETE /api/pet/market/:id             — 取消挂单
GET    /api/pet/market/my              — 我的挂单
GET    /api/pet/market/history         — 我的交易记录
GET    /api/pet/market/price/:species_id — 价格走势

# 管理员
GET    /api/admin/pet/users/:id/pets   — 查看用户宠物
POST   /api/admin/pet/grant            — 发放宠物（body: {user_id, species_id, level, star}）
POST   /api/admin/pet/grant-item       — 发放物品（body: {user_id, item_id, quantity}）
GET    /api/admin/pet/market/recent    — 近期交易监控
GET    /api/admin/pet/stats            — 统计面板数据
```

### 前端

#### 市场页面
- `web/src/pages/pet/market.jsx` — 交易市场
  - 浏览/搜索/筛选（物种、稀有度、价格、星级、排序）
  - 挂单卡片（宠物精灵 + 属性 + 价格 + 竞价信息）
  - 一口价购买确认弹窗
  - 竞拍出价弹窗（当前价 + 出价输入）
  - 我的挂单管理

#### 价格走势
- 按物种查看历史成交价折线图（用 Recharts）

#### 管理后台增强
- `web/src/pages/admin/pet-users.jsx` — 用户宠物数据查看
- `web/src/pages/admin/pet-grant.jsx` — 宠物/物品发放
- `web/src/pages/admin/pet-market.jsx` — 市场监控
- `web/src/pages/admin/pet-stats.jsx` — 统计面板

### 侧边栏
- 新增子菜单：市场
- 管理后台新增：宠物数据、发放、市场监控、统计

### Phase 5 交付物
- [x] 一口价 + 竞拍交易
- [x] 市场浏览/搜索/筛选
- [x] 竞价机制 + 到期自动成交
- [x] 交易手续费
- [x] 价格历史走势图
- [x] 管理员查看用户宠物
- [x] 管理员发放宠物/物品
- [x] 市场监控
- [x] 统计面板

---

## 技术要点

### 后端注意事项

1. **数据库兼容**：所有模型必须兼容 SQLite / MySQL / PostgreSQL，JSON 字段用 TEXT 存储
2. **JSON 包**：使用 `common/json.go` 封装，不直接引用 `encoding/json`
3. **状态计算**：宠物状态采用惰性计算（读取时根据时间差计算），避免定时任务频繁写库
4. **扭蛋保底**：保底计数器必须原子操作，防止并发导致多次保底
5. **交易安全**：挂单/购买/竞价需要事务保护，防止超卖和竞态条件
6. **quota 扣减**：所有涉及 quota 消耗的操作需要先扣款再执行，失败时回滚

### 前端注意事项

1. **CSS/SVG 宠物精灵**：每种宠物 × 3 阶段 × 多个动作状态（idle、happy、sad、sleep、eat），用 CSS animation + SVG 实现
2. **性能**：宠物园页面可能有 20 只宠物同时渲染动画，需要注意性能（考虑 viewport 可见性检测）
3. **乐观更新**：喂养、玩耍等高频操作使用乐观 UI 更新
4. **轮询**：派遣任务倒计时使用前端计时器，不轮询后端；页面可见性切换时重新同步

### 工作量估算

| Phase | 核心内容 | 预计页面数 | 预计 API 数 |
|-------|----------|-----------|------------|
| Phase 1 | 基础框架 + 领养 | 3 用户 + 2 管理 | ~15 |
| Phase 2 | 养成 + 签到 | 1 新 + 2 改造 | ~8 |
| Phase 3 | 扭蛋 + 融合 | 2 用户 + 1 管理 | ~10 |
| Phase 4 | 派遣 + 社交 | 2 新 + 3 改造 | ~12 |
| Phase 5 | 交易所 + 管理 | 1 用户 + 4 管理 | ~15 |
| **合计** | | **~20 页面** | **~60 API** |

---

## 未来扩展（不在当前计划内）

- 装扮系统（多槽位：帽子、装饰、背景、边框）
- 宠物对战（PvP / PvE）
- 限时活动卡池
- 宠物图鉴（收集进度）
- 成就系统
- 宠物技能系统
