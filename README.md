<div align="center">

![Nox API](/web/public/favicon.svg)

# Nox API

**Unified AI gateway. One endpoint, every model.**

Route requests to 40+ AI providers through a single OpenAI-compatible API.
Built-in billing, rate limiting, auth, and a modern admin dashboard.

<p>
  <a href="./README.zh_CN.md">简体中文</a> ·
  <a href="./README.zh_TW.md">繁體中文</a> ·
  <strong>English</strong> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.ja.md">日本語</a>
</p>

<p>
  <a href="https://raw.githubusercontent.com/LeoMengTCM/nox-api/main/LICENSE">
    <img src="https://img.shields.io/github/license/LeoMengTCM/nox-api?color=brightgreen" alt="license">
  </a>
  <a href="https://github.com/LeoMengTCM/nox-api/releases/latest">
    <img src="https://img.shields.io/github/v/release/LeoMengTCM/nox-api?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://hub.docker.com/r/drleomeng/nox-api">
    <img src="https://img.shields.io/badge/docker-dockerHub-blue" alt="docker">
  </a>
  <a href="https://goreportcard.com/report/github.com/LeoMengTCM/nox-api">
    <img src="https://goreportcard.com/badge/github.com/LeoMengTCM/nox-api" alt="GoReportCard">
  </a>
</p>

</div>

---

## Why Nox API

- **One API, every provider** — OpenAI, Claude, Gemini, AWS Bedrock, Azure, DeepSeek, Mistral, Cohere, Ollama, and 30+ more behind a single `/v1/chat/completions` endpoint.
- **Drop-in compatible** — Anything that speaks OpenAI can talk to Nox API. No SDK changes needed.
- **Smart routing** — Weighted load balancing, automatic failover, per-user model rate limiting.
- **Pay-as-you-go billing** — Token-level metering with cache-aware billing for all major providers.
- **Multi-format relay** — Native support for OpenAI Chat/Responses, Claude Messages, Gemini, and automatic format conversion between them.
- **Enterprise-ready auth** — JWT, OAuth (GitHub, Discord, OIDC), Telegram, WebAuthn/Passkeys, 2FA.
- **Modern dashboard** — React + Radix UI + Tailwind. Data visualization, channel management, user admin.

---

## Quick Start

```bash
docker run -d --name nox-api --restart always \
  -p 3000:3000 -v ./data:/data \
  drleomeng/nox-api:latest
```

Open `http://localhost:3000` — default admin credentials: `root` / `123456`

### Docker Compose

```bash
git clone https://github.com/LeoMengTCM/nox-api.git
cd nox-api
# edit docker-compose.yml to your liking
docker compose up -d
```

---

## Supported Providers

| Provider | Type | Provider | Type |
|----------|------|----------|------|
| OpenAI | Chat, Responses, Realtime, Images, Audio, Embeddings | Anthropic Claude | Chat (Messages), native format |
| Google Gemini | Chat, native format | AWS Bedrock | Claude, etc. |
| Azure OpenAI | Full OpenAI compat | Google Vertex AI | Gemini, Claude |
| DeepSeek | Chat | Mistral | Chat |
| Cohere | Chat, Rerank | xAI (Grok) | Chat |
| Ollama | Local models | Cloudflare Workers AI | Chat |
| Baidu (Wenxin) | Chat | Alibaba (Qwen) | Chat, Images |
| Zhipu (GLM) | Chat | Tencent Hunyuan | Chat |
| iFlytek (Spark) | Chat | Moonshot (Kimi) | Chat |
| MiniMax | Chat, TTS | Volcengine (Doubao) | Chat, TTS |
| SiliconFlow | Chat | Perplexity | Chat |
| Jina | Rerank, Embeddings | Dify | ChatFlow |
| OpenRouter | Multi-model | Replicate | Inference |
| Coze | Bot API | Midjourney Proxy | Image generation |
| Suno API | Music | Jimeng | Image generation |

---

## Key Features

### Routing & Reliability
- Channel weighted random & priority routing
- Automatic retry on failure with configurable retry count
- Channel affinity — sticky routing per user/token
- Per-user and per-model rate limiting

### Billing & Quotas
- Token-level pay-per-use billing
- Cache-aware billing (prompt cache, context caching)
- Online top-up (Stripe, EPay)
- Subscription plans with quota management
- Redemption codes

### Format Conversion
- **OpenAI Chat ↔ Claude Messages** — bidirectional
- **OpenAI Chat → Gemini** — automatic
- **Gemini → OpenAI Chat** — text support
- **OpenAI Chat ↔ Responses** — in progress
- Reasoning effort suffixes (`-high`, `-medium`, `-low`) for o3, GPT-5, Gemini, Claude thinking models

### Channel Management
- Per-channel system prompt injection (prepend or override mode)
- Model selector with provider-based categorization (OpenAI, Anthropic, Google, etc.)
- Upstream model fetching with search, filter, and individual selection
- 57 channel types supported

### Auth & Security
- JWT tokens with scoped permissions
- OAuth: GitHub, Discord, LinuxDO, Telegram, OIDC
- WebAuthn / Passkeys
- Two-factor authentication (TOTP)
- User avatar system with upload and display
- IP-based and model-based rate limiting

### Admin Dashboard
- Real-time usage statistics and charts
- Channel health monitoring
- User and token management
- Model pricing configuration
- Multi-language UI (zh, en, fr, ja, vi, ru)

---

## Deployment

### Requirements

| Component | Requirement |
|-----------|-------------|
| Database | SQLite (default), MySQL >= 5.7.8, or PostgreSQL >= 9.6 |
| Runtime | Docker recommended, or build from source (Go 1.22+) |
| Cache | Redis (recommended for production), or in-memory |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SQL_DSN` | Database connection string (empty = SQLite) | — |
| `REDIS_CONN_STRING` | Redis connection string | — |
| `SESSION_SECRET` | Session secret (required for multi-node) | — |
| `CRYPTO_SECRET` | Encryption key (required with Redis) | — |
| `STREAMING_TIMEOUT` | Stream timeout in seconds | `300` |

Full list: [Environment Variables](https://docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables)

---

## Documentation

| | |
|---|---|
| Installation | [docs.noxapi.dev/en/docs/installation](https://docs.noxapi.dev/en/docs/installation) |
| API Reference | [docs.noxapi.dev/en/docs/api](https://docs.noxapi.dev/en/docs/api) |
| Environment Variables | [docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables](https://docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables) |
| FAQ | [docs.noxapi.dev/en/docs/support/faq](https://docs.noxapi.dev/en/docs/support/faq) |

---

## Acknowledgements

Nox API is built upon the foundation of [New API](https://github.com/Calcium-Ion/new-api) by [Calcium-Ion](https://github.com/Calcium-Ion). We are grateful for their pioneering work on the AI API gateway ecosystem.

---

## Contributing

Bug reports, feature requests, and pull requests are welcome at [GitHub Issues](https://github.com/LeoMengTCM/nox-api/issues).

---

## License

[GNU Affero General Public License v3.0 (AGPLv3)](./LICENSE)

For commercial licensing inquiries: [leomengtcm@gmail.com](mailto:leomengtcm@gmail.com)

---

<div align="center">

If Nox API is useful to you, consider giving it a star.

[![Star History Chart](https://api.star-history.com/svg?repos=LeoMengTCM/nox-api&type=Date)](https://star-history.com/#LeoMengTCM/nox-api&Date)

</div>
