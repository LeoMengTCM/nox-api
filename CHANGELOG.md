# Changelog

All notable changes to Nox API will be documented in this file.

## [Unreleased]

### Added
- **Community system** — Full-featured social community at `/console/community` with follow, post, like, comment, bookmark, quote repost, and notification capabilities:
  - **Follow system** — Follow/unfollow users, following/followers feed
  - **Posts & Feed** — Create posts, square (public) feed, following feed, bookmarks tab
  - **User profiles** — `/console/user/:id` with avatar, bio, post count, followers/following stats, and post timeline
  - **Like & Comment** — Like/unlike posts with optimistic UI, threaded comments with delete
  - **Bookmark** — Save/unsave posts, dedicated bookmarks tab
  - **Quote Repost** — Repost with optional comment (up to 500 chars), embedded original post display, chain repost protection (always references original source), self-repost blocked
  - **Notification system** — Bell icon with unread badge (30-second polling, pauses when tab hidden), dropdown preview of 10 recent notifications, full notification page at `/console/notifications` with paginated list and read/unread distinction, "Mark all as read", smart deduplication (like/follow deduplicated, comment/repost always created), self-triggered actions don't generate notifications
- **Community admin settings** — Enable/disable the community feature and configure max post length in the "运营设置" (Operation Settings) tab.
- **Daily check-in system** — New `/console/checkin` page where users can check in daily to receive random quota rewards. Features a calendar grid showing check-in history with hover tooltips for awarded amounts, stats cards (total check-ins, total quota earned, monthly count), month navigation for viewing past records, and animated check-in button with success effects. Accessible from the sidebar under "个人中心".
- **Check-in admin settings** — Administrators can enable/disable the check-in feature and configure min/max reward quota in the "运营设置" (Operation Settings) tab.

### Changed
- **Homepage CTA button** — Added a prominent "开始使用" (Get Started) button in the hero section, linking to the console for quick access.

### Changed
- **Homepage quote animation** — The inspirational quote now uses a looping typewriter effect (type → hold → erase → pause → repeat) with EB Garamond font for a more elegant look.
- **Homepage hero spacing** — Increased spacing between hero elements to reduce visual crowding.
- **Homepage bio copy** — Simplified the personal bio text to be more natural and concise.

### Fixed
- **Homepage admin avatar** — Fixed avatar not loading on the homepage by correcting the filename pattern from `user_1.{ext}` to `1.{ext}` to match the actual avatar storage convention.
- **Embedded repost avatar oversized** — Fixed avatar in embedded original post rendering at natural size due to missing `xs` variant in the avatar component. Added `xs` (20×20px) size variant.
- **User profile infinite request loop** — Fixed profile and posts APIs being called in an infinite loop on the user profile page. Removed unstable `t` (i18next) reference from `useCallback` dependencies.
- **Community page infinite request loop** — Same `useCallback` + `t` fix applied to the community page's feed loading functions.
- **Notifications page infinite request loop** — Same fix applied to the notifications page.

### Added
- **Ranking leaderboard** — New `/console/ranking` page with two fun rankings: "屯屯鼠排名" (Hoarder Ranking, highest available balance) and "AI大王排名" (AI King Ranking, highest usage). Features gold/silver/bronze medals for top 3, current-user highlighting, and avatar display. Accessible from the sidebar under "个人中心".
- **Avatar in user management** — Admin user management table now shows user avatars next to usernames.
- **Avatar upload during registration** — Registration form now includes an avatar picker. After registration, users are auto-logged in with avatar upload, then redirected directly to the console.
- **Avatar system** — Users can upload avatars (up to 5MB, jpg/png/gif/webp) via personal settings. Avatars are displayed in the top bar and user profile. New users are prompted to upload an avatar after login.
- **Per-channel system prompt** — Channels now support injecting a system prompt into all requests. Supports prepend mode (added before existing system prompt) and override mode (replaces existing system prompt). Configured via the channel edit dialog.
- **Model selector component** — Replaced the old comma-separated textarea with a rich model selector featuring provider-based categorization (OpenAI, Anthropic, Google, Meta, etc.), search/filter, checkbox selection, select-all per category, and manual input.
- **Channel constants module** — Centralized channel type definitions, model provider categories, and utility functions in `web/src/constants/channel.constants.js`.
- Apple Touch Icon for Safari/iOS home screen bookmarks.
- ICO favicon fallback for Safari compatibility.

### Fixed
- **Token copy copies masked key** — Copy button on token management now auto-fetches the full key from the API before copying, instead of copying the masked `****` version. The fetched key is cached for subsequent operations.
- **Avatar prompt not triggering** — Fixed avatar upload prompt not appearing for users without avatars after login. Root causes: unstable object reference in `useEffect` dependency (replaced with primitive values), and `sessionStorage` flag not cleared on logout.
- **Usage logs missing channel column** — Admin users now see a "渠道" (Channel) column in the usage logs table, showing the channel ID with a tooltip for channel name on hover.
- **Turnstile verification on login/register** — Login and register pages now load system status from the API on mount, fixing the issue where enabling Turnstile in settings would make login impossible because the frontend didn't know Turnstile was enabled.
- **User group edit 404** — Editing a user's group now calls the correct API endpoint (`PUT /api/user/` instead of `PUT /api/user/manage`).
- **Safari favicon** — Safari tabs now display the correct Nox API logo instead of a stale cached icon. Added proper `.ico` and Apple Touch Icon support.
- **Channel dialog JSX structure** — Fixed mismatched dialog footer tags that prevented frontend builds.

### Changed
- Channel edit dialog widened to `max-w-3xl` with scrollable content and organized into three sections: basic info, model configuration, and advanced settings.
- Channel type selector now shows all 57 supported channel types from the centralized constants.
- Login response now includes `avatar_url` field across all login methods (password, OAuth, Passkey, 2FA).
- `GetSelf` API response now includes `avatar_url`.
