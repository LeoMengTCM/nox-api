# Changelog

All notable changes to Nox API will be documented in this file.

## [0.1.19] - 2026-03-26

### Improvements

#### Small Stability Pass
- **New channels take effect immediately**: Refresh channel cache right after batch channel creation, so newly added channels no longer wait for the next sync cycle before they can be used.
- **Quota dashboard flush is lighter under load**: Swap the in-memory usage map under lock and flush outside the critical section, while removing an extra pre-read query before upsert. This reduces lock hold time and unnecessary database work.
- **Session cookie now follows request scheme**: Session cookies will use `Secure` automatically on HTTPS or common reverse-proxy HTTPS headers, and can still be overridden with `SESSION_COOKIE_SECURE` when needed.
- **Frontend eslint no longer scans build output**: Ignore `web/dist` so lint output focuses on source files instead of generated assets.

### Fixes

#### Contract Alignment
- **Token key contract aligned across code and tests**: Keep the existing `sk-` prefixed token behavior unchanged, while updating backend tests and frontend helper notes to match the actual API contract.

## [0.1.18] - 2026-03-24

### Features

#### Wallet Page Redesign
- **Subscription plans on wallet page**: The wallet management page now fetches and displays subscription plans from `/api/subscription/plans`. Previously, admin-configured plans had no user-facing purchase UI — users could only redeem codes.
- **Balance-pay purchasing**: Plans are purchased by deducting from user's existing wallet balance (price_amount * QuotaPerUnit), not via external payment gateways. Confirmation dialog shows cost, quota, and duration before purchase. New API endpoint `POST /api/subscription/balance/pay`.
- **Anthropic-inspired editorial layout**: Complete visual redesign following a restrained, editorial aesthetic — large lightweight typography for balance display (56–72px `font-light`), generous whitespace (`space-y-20`), thin `border-t` section dividers instead of card wrappers, and `dl/dt/dd` definition lists for plan details.
- **Plan cards with smart featuring**: Clean minimal cards with 40px light-weight pricing, left-right aligned detail rows (quota, duration, reset period, group upgrade, purchase limit). Middle plan auto-highlighted as "推荐" with accent border and filled CTA button; others use outline style.
- **Two-column utilities**: Redeem code and affiliate sections consolidated into a responsive two-column grid, removing redundant card wrappers and icon decorations.

## [0.1.17] - 2026-03-24

### Features

#### Announcements Admin UI
- **New visual announcements editor**: Added a full management UI for console announcements in Settings > Dashboard. Previously, the `console_setting.announcements` backend existed but had no frontend editor — announcements were always empty.
- **Accordion card list**: Each announcement displays as a collapsible card showing content preview, date, and type badge. Click to expand for editing.
- **Rich editing**: Content field supports HTML and Markdown with live preview toggle. Date picker with datetime-local input (auto-converts to/from RFC3339). Type selector with 5 options (default/ongoing/success/warning/error) shown as colored dots.
- **Enable/disable switch**: `console_setting.announcements_enabled` toggle to hide the announcements panel from the dashboard without deleting content.
- **Separated save buttons**: Announcements save independently from other dashboard settings (Notice, FAQ, etc.) to avoid accidental overwrites.
- **Clarified Notice label**: Renamed "公告内容" to "首页弹窗公告" to distinguish it from the console announcements timeline.

#### Gringotts Heist Improvements
- **Dynamic entry fees**: Heist fees are now calculated as a percentage of vault balance instead of fixed amounts. Each heist type has a configurable `fee_pct` (sneak 0.1%, dragon 0.5%, imperio 2%), with a minimum floor of 1000 quota.
- **Vault injection system**: Admins can inject or withdraw funds from the Gringotts vault. New `gringotts_vault_injections` table tracks all admin operations with amount, remark, and timestamp. Vault balance formula updated to include injected funds.
- **Configurable heist parameters**: All heist settings (fee percentage, cooldown, base success rate, reward range) moved from hardcoded constants to `casino_setting` with 15 new configurable fields. Settings hot-reload without restart.
- **Heist enable/disable**: New `heist_enabled` toggle in casino settings to independently control heist availability.

## [0.1.16] - 2026-03-23

### Bug Fixes

#### HTML Content Rendering
- **Full HTML documents broken in notices/announcements**: Fixed all HTML rendering paths — content with `<!DOCTYPE html>` or `<html>` tags was being passed through `marked.parse()` (Markdown parser), which mangled structural tags (`<head>`, `<style>`, `<body>`). Browsers then stripped these invalid nested tags, causing styles and layout to display as plain text.
- **New `HtmlRenderer` component**: Smart content renderer that auto-detects three content types:
  - **Full HTML document** (`<!DOCTYPE` / `<html>`): rendered in sandboxed `<iframe srcDoc>` with auto-height, preserving all styles and animations in isolation.
  - **HTML fragment** (starts with tags like `<div>`, `<p>`): rendered directly via `dangerouslySetInnerHTML`, skipping Markdown parsing.
  - **Markdown**: parsed with `marked` as before.
- **Affected pages**: Home notice dialog, home page custom content, dashboard announcements, admin settings preview, about page, user agreement, privacy policy — all now use `HtmlRenderer`.

## [0.1.15] - 2026-03-23

### Bug Fixes

#### Critical — Crash Fixes
- **Dify nil pointer panic**: Fixed `relay/channel/dify/relay-dify.go` — `*DifyFile` pointer was declared but never allocated, causing a nil pointer dereference on any request containing a remote image URL. Now properly initializes with `&DifyFile{}`.
- **AWS Nova empty content panic**: Fixed `relay/channel/aws/relay-aws.go` — `Content[0].Text` accessed without bounds check. Nova responses with empty content (refusals, tool-use-only) would crash. Added `len(Content) > 0` guard.

#### High — Billing & Stream Fixes
- **WebSocket/Realtime double-billing**: Fixed `service/quota.go` — `PreWssConsumeQuota` was independently deducting via `PostConsumeQuota` while `BillingSession` had already pre-deducted, and `PostWssConsumeQuota` never called `SettleBilling`. Users were charged twice for realtime sessions. Now `PreWssConsumeQuota` only checks quota sufficiency, and `PostWssConsumeQuota` calls `SettleBilling` for unified settlement.
- **AWS stream incomplete termination**: Fixed `relay/channel/aws/relay-aws.go` — unknown event types caused immediate error return, leaving the SSE stream without a `[DONE]` sentinel and clients hanging. Now logs warnings and continues the event loop.

#### Medium — Logic & Security Fixes
- **Memory rate limiter `_check` key bug**: Fixed `middleware/model-rate-limit.go` — the `_check` key counted all attempts (including failures) instead of only successful requests, making the success-based rate limit ineffective. Added `InMemoryRateLimiter.Check()` method for read-only limit checking.
- **AWS Nova model name mismatch**: Fixed `relay/channel/aws/adaptor.go` — `isNovaModel()` checked client-facing model name instead of `info.UpstreamModelName`, causing Nova requests to be misrouted as Claude when using channel alias mappings.
- **OpenAI think-to-content ignored error**: Fixed `relay/channel/openai/relay-openai.go` — `</think>` closing tag write error was silently discarded. Now properly checks and propagates the error.
- **Xunfei WebSocket goroutine leak**: Fixed `relay/channel/xunfei/relay-xunfei.go` — unbuffered channels caused producer goroutine to block forever when consumer returned early. Changed to buffered channels (10/1).
- **Task quota recalculation ignoring completion ratio**: Fixed `service/task_billing.go` — `RecalculateTaskQuotaByTokens` used flat `totalTokens * modelRatio`, ignoring that output tokens cost more. Now applies weighted average with completion ratio.
- **Audio quota UsePrice truncation**: Fixed `service/quota.go` — `calculateAudioQuota` UsePrice path used `IntPart()` (truncation) while ratio path used `Round(0)`. Now both paths round consistently.

#### Low — Resource & Observability Fixes
- **Gemini image handler body leak**: Fixed `relay/channel/gemini/relay-gemini.go` — `resp.Body.Close()` was called directly instead of via `defer service.CloseResponseBodyGracefully`, risking TCP connection leaks on panic.
- **Structured logging**: Replaced all `fmt.Println` calls in `relay/channel/aws/relay-aws.go`, `relay/channel/xunfei/relay-xunfei.go`, `middleware/rate-limit.go`, and `middleware/model-rate-limit.go` with `common.SysLog` for proper structured logging.
- **Removed stale `log` import**: Cleaned up unused `log` package import from `service/quota.go`.

## [0.1.14] - 2026-03-23

### Improvements

#### Token Management Page Redesign
- **Card-based layout**: Replaced DataTable with card list — each token is a distinct card with name, key, status badge, and metadata.
- **Stats header**: 3 summary cards at the top (total tokens, enabled count, used quota).
- **DropdownMenu actions**: Edit/enable-disable/delete collapsed into a `⋯` menu per card, reducing visual clutter.
- **Key display**: Fixed-width truncated key inside card, hover tooltip shows full key when revealed — no layout shift.
- **Async copy (ClipboardItem)**: Clicking copy on a hidden key uses `ClipboardItem` with a deferred Promise to preserve user gesture across the API call. Works without revealing the key first.
- **Reveal/hide**: Eye icon toggles full key visibility inline.
- **Empty state**: Shows `EmptyState` component with create button when no tokens exist.
- **Search icon**: Search input now has a `Search` icon prefix.
- **Created key dialog**: Green checkmark icon, accent-colored copy button.

#### Sidebar Reorganization
- Moved **Check-in**, **Community**, and **Ranking** from Hogwarts Portal back into the AI Console sidebar under the "Account" section.

#### Enriched Leaderboard (2 → 4 dimensions)
- Added **Request King** and **Top Inviter** rankings.

### Bug Fixes
- **Bank pool concurrency**: Added `sync.Mutex` to protect all bank pool read-check-modify sequences (borrow, repay, interest, inject, fixed withdraw) against concurrent overdraft.
- **Loan repay optimistic lock**: `UpdateLoanRepaymentOptimistic` uses `WHERE interest_accrued = ?` to prevent stale-read race with the hourly interest task; returns error if data changed, wallet auto-rolls back.
- **Loan CreateLoan rollback**: Removed dead no-op pool rollback on `CreateLoan` DB failure; added proper rollback with CRITICAL error logging when wallet credit or pool persist fails.
- **Critical error logging**: All money-path `_ = model.*` calls now log errors via `logger.LogError` instead of silently discarding.
- **Safe type assertions**: Controller bare `.(int)` / `.(int64)` assertions replaced with `v, ok :=` form to prevent panics.
- **Token toggle status**: Fixed wrong PUT params — now uses `?status_only=true` with correct body.
- **Clipboard copy**: Synchronous `execCommand` first, `ClipboardItem` for deferred async copy.
- **Loan available_credit**: Clamped to 0 when negative.
- **Bank transaction colors**: Withdraw transactions consistently red.

## [0.1.13] - 2026-03-20

### New Features

#### Gringotts Credit Loan (古灵阁信用贷款)
- **Credit loan system**: Users can borrow against a configurable credit limit, with loans tracked per-user and per-term.
- **5 loan terms**: 1/3/7/14/30 days with decreasing annual rates (default 36.5%/24%/18%/15%/12%).
- **Hourly interest accrual**: Loan interest accumulates every hour via the existing bank interest task. Interest continues accruing even after overdue.
- **Flexible repayment**: Partial or full repayment at any time. Payments apply to interest first, then principal.
- **Overdue handling**: No penalty fees — overdue loans are simply marked and displayed on the "deadbeat leaderboard" (老赖排行榜, top 20 by outstanding debt).
- **Per-user credit limits**: Admin can set custom credit limits for individual users; others use the global default ($5).
- **Fund flow**: Loans drawn from bank pool → user wallet; repayments return to bank pool.
- **Red-themed UI**: Loan section in bank page with red/dark-red styling, distinct from deposit green/amber. Borrow dialog with term selector, repay dialog with "pay all" shortcut.
- **Admin panel**: Loan stats (outstanding, interest earned, overdue count), 9 loan settings, user credit management input.
- **New transaction types**: `loan_borrow`, `loan_repay`, `loan_interest`.
- **DB**: 2 new tables (`gringotts_loans`, `gringotts_loan_credits`), reuses `gringotts_bank_transactions`.
- **API**: 4 user endpoints + 1 admin endpoint.

### Improvements

#### Token Default Unlimited Quota
- New tokens now default to **unlimited quota** instead of 0, so users don't need to manually toggle the setting.

## [0.1.12] - 2026-03-19

### Improvements

#### Sidebar Split — AI Console + Hogwarts Portal
- **Console sidebar simplified**: Stripped to 3 clean sections — 工作台 (dashboard, tokens, logs, playground), 账户 (wallet, settings), 管理员 (channels, models, deployment, subscriptions, redemptions, users, system settings). All HP-themed gamification items removed.
- **Hogwarts Portal**: New dedicated layout (`/console/hogwarts`) with its own gold-themed sidebar for all gamification features — daily (check-in, community, ranking, titles), economy (casino, bank), magical creatures (pets, shop, inventory, gacha, fusion, adventure, arena, market), and admin tools.
- **Top bar entry**: Castle icon "霍格沃茨" button in the top bar with gold highlight when active, visible to logged-in users.
- **"返回控制台" breadcrumb**: All Hogwarts pages show a back-to-console link at the top of the content area.
- **Portal landing page**: Card-based overview at `/console/hogwarts` with all HP features organized by category (daily, economy, magical creatures, admin).
- **Route migration**: All HP routes moved from `/console/*` to `/console/hogwarts/*` (casino, pet, checkin, community, ranking, titles, and all related admin pages). ~15 page files updated.
- **Sidebar modules config**: Added `hogwarts` section to `DEFAULT_ADMIN_CONFIG` with all HP module keys. Removed deprecated `chat` section; `playground` moved to `console` section.
- **Hogwarts CSS variables**: 8 new CSS variables for the HP theme (gold/burgundy palette).

**New files**: `hogwarts-layout.jsx`, `hogwarts-sidebar.jsx`, `pages/hogwarts/portal.jsx`
**Modified files**: `sidebar.jsx`, `top-bar.jsx`, `console-layout.jsx`, `App.jsx`, `use-sidebar-modules.js`, `globals.css`, `en.json`, ~15 page files

## [0.1.11] - 2026-03-19

### Improvements

#### Bank Dollar-Based API
- All bank API endpoints now accept and return amounts in **US dollars** (float64) instead of raw quota integers. Internal storage remains quota-based for consistency with the wallet system.
- Controller layer performs automatic `dollar ↔ quota` conversion at the API boundary using `QuotaPerUnit` (500,000 quota = $1).
- Frontend no longer needs `formatQuota()` division — amounts from the API are displayed directly as dollars.
- Admin pool inject/withdraw also accepts dollar amounts.

#### Premium Demand Deposit (高息活期)
- New high-yield demand account type with configurable annual rate (default 6%, vs standard 2%).
- Each user can hold one standard demand account and one premium demand account simultaneously.
- Premium accounts have separate min deposit ($1 default), max balance ($10 default), and interest rate settings.
- Hourly interest task applies the correct rate based on account type (`demand_interest` vs `premium_interest`).
- New amber-themed UI card on the bank page with dedicated deposit/withdraw dialogs.
- Admin panel: 3 new settings (`premium_demand_rate`, `min_premium_deposit`, `max_premium_balance`) + premium stats in dashboard.
- New transaction types: `premium_deposit`, `premium_withdraw`, `premium_interest`.

#### Database Migration
- `gringotts_bank_accounts` table: added `account_type` column (0=standard, 1=premium) with composite unique index `(user_id, account_type)`. Old `idx_bank_user` index auto-dropped during migration.

## [0.1.10] - 2026-03-19

### Fixes
- **Bank DB migration**: Fixed bank tables (`gringotts_bank_accounts`, `gringotts_fixed_deposits`, `gringotts_bank_transactions`) not being created on startup. Tables were only in `migrateDBFast()` (unused) but missing from `migrateDB()` (the actual migration path).
- **Bank sidebar menu**: Moved Gringotts Bank from a casino sub-page to its own standalone sidebar menu entry with a dedicated Landmark icon, making it independent from the casino.

## [0.1.9] - 2026-03-19

### New Features

#### Gringotts Bank (古灵阁银行)
- **Demand deposits**: Users can deposit quota into a demand account and earn hourly interest (default 2% annual rate).
- **Fixed deposits**: 3 term options (7/30/90 days) with higher interest rates (5%/8%/12% annual). Early withdrawal incurs a configurable penalty on earned interest.
- **Independent fund pool**: Admin-managed capital pool from which all interest payments are deducted. Pool depletion pauses interest payouts.
- **Hourly interest task**: Background job calculates and distributes demand interest every hour; automatically processes matured fixed deposits.
- **Admin panel**: New "Bank Management" tab in Casino admin with pool injection/withdrawal, rate configuration, deposit limits, and aggregate statistics (total deposits, interest paid, account count).
- **Transaction history**: Full audit trail of all bank operations (deposits, withdrawals, interest, admin actions).
- **Casino lobby integration**: Bank card added to the casino lobby page.
- **Log sub-category**: Bank operations display "银行" badge in the log page.

**New files**: `model/bank.go`, `service/bank.go`, `service/bank_interest_task.go`, `controller/bank.go`, `setting/operation_setting/bank_setting.go`, `web/src/pages/casino/bank.jsx`
**New tables**: `gringotts_bank_accounts`, `gringotts_fixed_deposits`, `gringotts_bank_transactions`
**New API endpoints**: 8 (6 user + 2 admin)

## [0.1.8] - 2026-03-18

### Improvements

#### Rate Limit Error Clarity
- All rate limit 429 responses now return proper JSON error bodies with `"Nox API rate limit exceeded"` message, making it easy to distinguish Nox API rate limits from upstream provider rate limits.
- Default `RetryTimes` increased from 0 to 3 — upstream 429/5xx errors now automatically retry with other available channels instead of failing immediately.

#### Model Fetching Enhancement
- `FetchModels` now supports 5 response formats: standard OpenAI `{data:[{id}]}`, `{data:[{name}]}`, `{models:[{id}]}`, flat object arrays `[{id}]`, and plain string arrays `["model"]`.
- Added 15-second HTTP timeout for model fetching requests.
- Error responses now include upstream response body (up to 500 chars) for easier debugging.
- Unified parsing logic between new-channel and edit-channel model fetching endpoints.

#### Log Page Improvements
- Added "Error" and "Refund" log type filters (previously only Topup/Consume/Manage/System were shown).
- New "Content" column in the log table shows log details directly without opening the detail dialog.
- System logs now display sub-category badges based on content keywords: Check-in, Casino, Gringotts, Arena, Achievement, Security, Registration Reward, Channel.

## [0.1.7] - 2026-03-18

### New Features

#### Gringotts Heist (古灵阁打劫)
- **Vault system**: Gringotts vault accumulates all casino house profits (total player losses minus wins minus stolen). Displayed on casino lobby and dedicated Gringotts page.
- **3 heist types**: Invisibility Cloak sneak ($0.10, 4h cooldown, 60% base rate), Dragon ride ($0.50, 12h, 35%), Imperio curse ($2.00, 24h, 15%). Each rewards 0.1–5% of vault balance on success.
- **Dynamic success modifiers**: +5% with SSR pet, +3% with casino win streak ≥5, -5% if someone succeeded in past 24h.
- **Failure penalties**: Entrance fee forfeited + 50% chance of extra 50% penalty + 5% chance of 6h casino ban.
- **Success broadcast**: Successful heists appear in the big-win marquee across the casino.

#### Title System (称号系统)
- **16 preset titles** across 5 categories: casino (6), heist (2), pet (4), arena (3), social (1). Rarities from N to SSR with unique colors.
- **Auto-grant**: Titles automatically awarded when conditions are met — first bet, win streaks, profit milestones, heist successes, pet collection, arena victories, follower counts.
- **Equip/unequip**: Users can display one active title. Shown via `active_title_id` on the user model.
- **Collection page**: New `/console/titles` page showing all titles with owned/unowned state, category filtering, and equip controls.

#### Pet Arena (宠物对战擂台)
- **5-round battle engine**: HP = (Defense×2 + Attack)×10. Speed determines turn order. Damage reduced by defense, with 10% minimum. Crit rate up to 30% (1.5x), dodge rate up to 20%.
- **Element counter system**: courage > ambition > wisdom > loyalty > courage, +15% damage bonus.
- **Elo rating**: Initial 1000 points, dynamic gains/losses based on rating differential. Floor at 0.
- **Defend/attack**: One defender pet per user. Up to 5 attacks per day (configurable). Rewards for both attacker wins ($0.10 + 30 EXP) and defender wins ($0.04 + 20 EXP). Double rewards when challenging 200+ higher-rated opponents.
- **Win streak bonuses**: Every 5 consecutive defense wins grants an extra $0.20.
- **30-day seasons**: Top 1 gets $10 + "Arena Champion" title. Top 2-3: $4, Top 4-10: $2, Top 11-50: $1. Rating soft-reset between seasons.
- **Admin controls**: Create/end seasons and manually settle rewards.

### Improvements

#### Leaderboard Extensions
- **Casino**: 4 new ranking types — Biggest Loser (散财童子), Heist Profit (打劫大盗), Today's Hottest (今日热门), Win Streak King (连胜之王).
- **Pet**: 2 new ranking dimensions — Total Power (总战力榜), SSR Collection (SSR收藏榜).
- **Win streak tracking**: `max_win_streak` field added to `casino_daily_stats` for persistent streak records.

#### Pet System
- **Power stat**: New computed `power` field on all pets (attack + defense + speed + luck), recalculated on every stat recomputation. Used for arena matchmaking and power rankings.

### Database Changes
- 6 new tables: `gringotts_heist_records`, `titles`, `user_titles`, `pet_arena_seasons`, `pet_arena_defenders`, `pet_arena_battles`
- `users`: added `active_title_id` (int, default 0)
- `user_pets`: added `power` (int, default 0)
- `casino_daily_stats`: added `max_win_streak` (int, default 0)
- Auto-seeds: 16 default titles + first arena season on migration

---

## [0.1.6] - 2026-03-17

### Bug Fixes

- **Weak pet dead end**: Removed frontend `isWeak` guard that incorrectly disabled Play and Clean buttons when pet was weak — the backend already allows these operations in weak state, so the previous UI created an unrecoverable dead-end. (`web/src/pages/pet/detail.jsx`)
- **Inventory item use 404**: Fixed URL mismatch — frontend called `/use-item` (hyphen) but the backend route was `/use_item` (underscore). (`web/src/pages/pet/inventory.jsx`)
- **Magic shop missing items**: `SeedPetData()` returned early when species already existed, skipping the items migration entirely. Extracted `seedPetItemsIfNeeded()` to run unconditionally on startup, ensuring v0.1.5 shop items appear on existing databases. (`model/pet.go`)
- **User profile React #310 crash**: `useMemo(sortedPets)` was called after early returns (`if (loading)` / `if (!profile)`), violating the Rules of Hooks. Moved it before all early returns. (`web/src/pages/user-profile.jsx`)

### Improvements

- **Feed dialog redesign**: Replaced the opaque "one-click feed" button with per-item quantity selectors. Each food and potion now shows `[-] N [+] [Feed xN]` controls so users know exactly what and how much will be fed. Potions are also included in the feed dialog. (`web/src/pages/pet/detail.jsx`)
- **Market dollar pricing**: The Hog's Head consignment and auction bid forms now accept dollar amounts directly (with `$` prefix), converting to internal quota on submission. Users no longer need to mentally convert token values. (`web/src/pages/pet/market.jsx`)

---

## [0.1.3] - 2026-03-15

### New Features

- **XP passive growth**: Pets now gain XP automatically over time (default 5 XP/hour, max 24h accumulation). Lazy-calculated on each query — no cron needed. Configurable via admin `PassiveXpPerHour` setting. (`service/pet.go`, `model/pet.go`, `setting/operation_setting/pet_setting.go`)
- **Rarity transcendence**: Two max-star (5★) same-species pets can fuse to upgrade rarity tier — N→R, R→SR, SR→SSR. Star resets to 0, level preserved (higher of two), stats recomputed with rarity multiplier (1.3x–1.4x). New "Transcend" tab in fusion page with purple-gold theme and batch support. (`POST /api/pet/transcend`, `service/pet_gacha.go`, `web/src/pages/pet/fusion.jsx`)

### Improvements

- **Adventure dispatch sorted by success rate**: Pet selection list now sorted highest success rate first, making it easier to pick the best candidate. (`web/src/pages/pet/adventure.jsx`)
- **Pet list sorted by rarity**: My Fantastic Beasts and user profile pages now sort SSR → SR → R → N, then by star desc, then level desc. (`web/src/pages/pet/index.jsx`, `web/src/pages/user-profile.jsx`)
- **Batch buttons more prominent**: One-click fusion and batch hatch buttons upgraded with gradient backgrounds, pulse animation, and shadow for better visibility. (`web/src/pages/pet/fusion.jsx`, `web/src/pages/pet/index.jsx`)
- **Star-up stat scaling increased**: Changed from flat +10%/star to progressive scaling — 1★ +15%, 2★ +35%, 3★ +60%, 4★ +100%, 5★ +150% (2.5x base). Growth feels much more rewarding now. (`service/pet.go`)

### Bug Fixes

- **Shop still showing old items**: Added upgrade migration that detects legacy items (普通饲料, etc.) and replaces them with HP-themed items on startup. Idempotent — safe to run multiple times. (`model/pet.go`)

---

## [0.1.2] - 2026-03-15

### Harry Potter Theming

This release transforms the pet system into a fully immersive Wizarding World experience.

- **"Pet Paradise" → "Fantastic Beasts"** (神奇动物): Renamed across all UI — sidebar, page titles, descriptions, admin panels. "My Pets" → "My Fantastic Beasts", "Adventurer/Trainer" → "Wizard/Witch".
- **Wizard/Witch title selector**: Gear icon in the pet pages header lets users choose "Wizard" or "Witch" as their title, persisted in localStorage, dynamically applied everywhere via `useWizardTitle` hook.
- **Market → "The Hog's Head"** (猪头酒吧): Full rebrand — "list" → "consign", "buyer/seller" → "buyer wizard/consigning wizard", subtitle: "The most secretive trading spot in Hogsmeade".
- **Adventure missions redesigned**: 5 HP-themed missions — Forbidden Forest Patrol, Hogsmeade Expedition, Chamber of Secrets, Gringotts Vaults, Newt's Suitcase (seed data, new installs only).
- **Food & potions expanded**: 10 HP-themed items replacing the original 6 (seed data, new installs only):
  - Food: Pumpkin Juice, Bertie Bott's Beans, Chocolate Frog, Butterbeer, Treacle Tart
  - Potions: Shrinking Solution, Scouring Solution, Pepperup Potion, Skele-Gro, Felix Felicis

### New Features

- **Batch hatch**: "Hatch All" button on the creatures list page detects all ready-to-hatch eggs, shows a confirmation plan, then executes sequentially with a progress overlay.

### Bug Fixes

- **Adventure dispatch shows result immediately**: `GetDispatchHistory` was missing the lazy-completion call (`CheckAndCompleteDispatches`), so in-progress dispatches with default `success=false` appeared as "failed". Now correctly shows "In Progress" badge until the mission timer expires.

---

## [0.1.1] - 2026-03-15

### New Features

- **One-click fusion** — Auto-select optimal fusion materials with a single tap. Picks same-species pets by lowest star rating, excluding primary/dispatched/listed pets. Users can manually exclude specific pets and restore them. (`web/src/pages/pet/fusion.jsx`)
- **Sidebar collapsible sections** — Each sidebar group can now be collapsed/expanded by clicking its header. Defaults to collapsed, with smooth 200ms height transition animation. Collapse state persisted in localStorage. (`web/src/components/layout/sidebar.jsx`)

### Bug Fixes

- **Notification badge never clears** — Opening the notification dropdown now calls the mark-all-read API and refreshes the unread count to zero, so the red badge disappears after reading. (`web/src/components/social/notification-bell.jsx`)
- **SSR gacha result invisible** — Fixed a CSS animation override where `.gacha-ssr-border`'s `animation` property clobbered the `gacha-grid-pop` opacity transition, keeping SSR cards permanently at `opacity: 0`. Now uses comma-separated composite animation. (`web/src/components/pet/gacha-animation.jsx`)
- **Channel model group list truncated** — ScrollArea Viewport now inherits the parent's `max-height` constraint via `max-h-[inherit]`, enabling proper scrolling when the model list overflows. (`web/src/components/ui/scroll-area.jsx`)
- **Channel edit forces key re-entry** — Backend now returns a masked key (e.g. `sk****abcd`) on GET and preserves the original key when the update payload sends an empty string. Frontend shows the masked key as a hint and skips key validation in edit mode. (`controller/channel.go`, `model/channel.go`, `web/src/pages/channel.jsx`)

### i18n

- Added translations for "一键融合", "没有可用的融合素材", "没有可一键融合的宠物", "已排除", "工作台" across all 7 locales (zh-CN, zh-TW, en, ja, fr, ru, vi).

---

## [0.1.0] - 2026-03-13

First major milestone release. Nox API now ships with a complete pet companion system, a community platform, daily check-in rewards, and dozens of quality-of-life improvements.

### Pet Companion System (New)

A full-featured virtual pet system themed around Harry Potter's Fantastic Beasts, with 33 magical creatures across 5 rarity tiers, deep gameplay mechanics, and a player-driven economy.

#### Adoption & Growth
- **Starter adoption** — Choose from 4 starter creatures (Niffler, Bowtruckle, Demiguise, Puffskein) with an egg hatching countdown timer.
- **3-stage evolution** — Egg → Baby → Adult, with configurable level thresholds (default Lv.10 / Lv.30) and auto-evolution on level-up.
- **Status system** — Hunger, mood, and cleanliness decay over time; feed, play, and clean interactions to maintain pet health. Weak state when stats drop too low.
- **EXP & leveling** — Earn EXP from feeding (+15), playing (+10), cleaning (+5), and adventure missions. Configurable max level cap (default 100).
- **Item shop & inventory** — Buy food and potions with user quota. Use items from inventory or pet detail page.

#### Gacha & Collection
- **Gacha system** — Single and 10-pull draws from configurable pools with animated egg-crack reveal.
- **Pity system** — SR guaranteed at 10 pulls, SSR guaranteed at 80 pulls. 10-pull guarantees at least one R+.
- **33 species** — 4 rarities: N (10), R (10), SR (8), SSR (5). Each with unique stats, elements, and visual keys.
- **Pet fusion** — Fuse same-species pets to increase star rating (max 5 stars), boosting stats.

#### Adventure & Missions
- **5 adventure missions** — Forest Exploration to Dragon's Nest, with difficulty 1-5, level requirements, and duration-based dispatching.
- **Success rate calculation** — Weighted by pet attack/defense/speed/luck against mission requirements.
- **Reward collection** — Quota rewards, item drops, and EXP on successful missions.

#### Pet Marketplace
- **Fixed-price listings** — List pets for sale at a set quota price.
- **Auction system** — Time-limited auctions with minimum bid increments (5%) and automatic completion.
- **5% marketplace fee** — Applied to all transactions.
- **Price history** — Track price trends by species with Recharts visualization.
- **Browse & filter** — Filter by species, rarity, star rating, price range, and listing type.

#### Social & Rankings
- **Public pet profiles** — View other users' pet collections.
- **3 leaderboards** — Max level, unique species count, and total stars. Top 20 with badges.
- **Pet activity log** — Track hatching, evolution, star-up, SSR pulls, and mission completions.

#### Admin Tools
- **Species CRUD** — Create, edit, delete pet species with base stats and visual configuration.
- **Item CRUD** — Manage food and potion items with effects and pricing.
- **Gacha pool management** — Configure pools with rarity rates, pity settings, cost, and time windows.
- **Mission management** — Create and configure adventure missions with rewards.
- **User pet management** — Search user pets, grant pets/items to users.
- **System statistics** — Overview dashboard with rarity distribution pie chart and aggregate stats.
- **Pet settings** — 18+ configurable parameters (decay rates, EXP values, cooldowns, fusion costs, market fees, max level, evolution levels, hatch duration) in a dedicated admin tab.

#### Frontend
- **SVG pixel sprite system** — 33 creatures × 3 stages = 99 sprite variants, data-driven with 8 body type templates and idle animations.
- **Gacha animation** — Egg drop → shake → crack → reveal sequence, with SSR flash effects and 10-pull grid.
- **Evolution animation** — Full-screen flash effect on stage transition.
- **Interaction effects** — Particle effects for feed, play, and clean actions.
- **Sidebar reorganization** — Pet features grouped under "Pet Paradise" with dedicated sub-menu items.

### Community System (New)
- **Follow system** — Follow/unfollow users, following/followers feed.
- **Posts & Feed** — Create posts, public square feed, following feed, bookmarks tab.
- **User profiles** — Dedicated profile pages with avatar, bio, post count, followers/following stats, and post timeline.
- **Like & Comment** — Like/unlike posts with optimistic UI, threaded comments with delete.
- **Bookmark** — Save/unsave posts, dedicated bookmarks tab.
- **Quote Repost** — Repost with optional comment, embedded original post display, chain repost protection.
- **Notification system** — Bell icon with unread badge (30s polling), dropdown preview, full notification page with pagination, "Mark all as read", smart deduplication.
- **Admin settings** — Enable/disable community feature and configure max post length.

### Daily Check-in System (New)
- Check in daily to receive random quota rewards.
- Calendar grid showing check-in history with hover tooltips for awarded amounts.
- Stats cards: total check-ins, total quota earned, monthly count.
- Month navigation for viewing past records.
- Admin settings for enable/disable and min/max reward quota.

### Other Features
- **Ranking leaderboard** — "Hoarder Ranking" (highest balance) and "AI King Ranking" (highest usage) with medals.
- **Avatar system** — Upload avatars (up to 5MB), display in top bar and profile. Avatar upload during registration with auto-login.
- **Per-channel system prompt** — Prepend or override system prompts per channel.
- **Model selector component** — Rich provider-based categorization with search, checkbox selection, and manual input.
- **Homepage redesign** — Personal branding, CTA button, looping typewriter quote animation.

### Security & Performance Fixes
- **Market race conditions** — BuyListing, PlaceBid, and CancelListing now use atomic transactions with optimistic locking to prevent double-purchase, bid corruption, and inconsistent cancellation states.
- **Gacha/Fusion race conditions** — Quota deduction moved inside database transactions with `WHERE quota >= ?` atomic check, eliminating TOCTOU vulnerabilities on concurrent pulls.
- **UseItem atomicity** — Item consumption and pet stat update now wrapped in a single transaction to prevent item loss on partial failure.
- **N+1 query elimination** — Batch-fetched species/pets/usernames in `enrichListings`, `GetMyTransactions`, `GetGachaHistory`, `ComputePetSummary`, and `GetPetRanking` (up to 60× fewer DB round-trips).
- **Auction completion throttle** — `CompleteExpiredAuctions` now runs at most once per 30 seconds instead of on every market page load.
- **Max level cap** — Added configurable max level (default 100) to prevent infinite leveling exploits.
- **Timezone consistency** — All daily limit checks (clean count, dispatch count) now use UTC consistently.

### Bug Fixes
- Fixed pet detail page always showing rarity as "N" regardless of actual rarity.
- Fixed gacha page always showing max pets as 20 regardless of admin setting.
- Fixed EXP progress bar using total accumulated EXP instead of current-level progress fraction.
- Fixed hatch countdown timer not restarting after data reload due to wrong useEffect dependency.
- Fixed play button allowing double-click during the 500ms gap before cooldown refresh.
- Fixed multi-pool gacha page showing active pool's cost for all pools.
- Fixed fusion button allowing re-click during the 2.2s success animation.
- Fixed market listing dialog not filtering out primary pets.
- Fixed market bid validation not checking against current highest bid.
- Fixed market price trend using pet ID as fallback instead of species ID.
- Fixed market browse API called on non-browse tab switches.
- Fixed inventory food items missing "Use" button (only potions had it).
- Fixed RarityBadge returning null for unknown rarity values instead of showing a fallback.
- Fixed EvolvePet error message hardcoding "level 30" instead of using configured value.
- Fixed AdminGrantPet using hardcoded evolution level thresholds instead of settings.
- Fixed AddExp silently discarding errors in feed/play/clean handlers.
- Fixed seed data: "两头蛇" renamed to "三头蛇" to match Harry Potter lore (Runespoor).
- Fixed gacha pool seed data including starter species and disabled species.
- Fixed untranslated stat labels (attack/defense/speed/luck) in admin species page.
- Fixed inconsistent i18n keys for status labels (standardized to 饱食度/心情/洁净度).
- Fixed adventure page rebuilding petMap/missionMap on every render (added useMemo).
- Fixed Safari favicon cache issues.
- Fixed checkin page infinite request loop.
- Fixed login/register Turnstile verification not detecting enabled state.
- Fixed token copy copying masked key instead of full key.
- Fixed user profile infinite request loop.

### Changed
- Rate limit increased from 180 to 600 requests per 180 seconds.
- Channel edit dialog widened with scrollable content and organized sections.
- Login response now includes `avatar_url` across all login methods.
