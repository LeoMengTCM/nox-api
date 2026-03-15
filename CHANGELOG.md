# Changelog

All notable changes to Nox API will be documented in this file.

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
