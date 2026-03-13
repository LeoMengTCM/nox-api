# Changelog

All notable changes to Nox API will be documented in this file.

## [Unreleased]

### Added
- **Avatar system** — Users can upload avatars (up to 5MB, jpg/png/gif/webp) via personal settings. Avatars are displayed in the top bar and user profile. New users are prompted to upload an avatar after login.
- **Per-channel system prompt** — Channels now support injecting a system prompt into all requests. Supports prepend mode (added before existing system prompt) and override mode (replaces existing system prompt). Configured via the channel edit dialog.
- **Model selector component** — Replaced the old comma-separated textarea with a rich model selector featuring provider-based categorization (OpenAI, Anthropic, Google, Meta, etc.), search/filter, checkbox selection, select-all per category, and manual input.
- **Channel constants module** — Centralized channel type definitions, model provider categories, and utility functions in `web/src/constants/channel.constants.js`.
- Apple Touch Icon for Safari/iOS home screen bookmarks.
- ICO favicon fallback for Safari compatibility.

### Fixed
- **User group edit 404** — Editing a user's group now calls the correct API endpoint (`PUT /api/user/` instead of `PUT /api/user/manage`).
- **Safari favicon** — Safari tabs now display the correct Nox API logo instead of a stale cached icon. Added proper `.ico` and Apple Touch Icon support.
- **Channel dialog JSX structure** — Fixed mismatched dialog footer tags that prevented frontend builds.

### Changed
- Channel edit dialog widened to `max-w-3xl` with scrollable content and organized into three sections: basic info, model configuration, and advanced settings.
- Channel type selector now shows all 57 supported channel types from the centralized constants.
- Login response now includes `avatar_url` field across all login methods (password, OAuth, Passkey, 2FA).
- `GetSelf` API response now includes `avatar_url`.
