<div align="center">

![Nox API](/web/public/favicon.svg)

# Nox API

**統一 AI 閘道，一個端點，所有模型。**

透過單一 OpenAI 相容 API 將請求路由到 40+ AI 供應商。
內建計費、限流、認證和現代化管理面板。

<p>
  <a href="./README.zh_CN.md">简体中文</a> ·
  <strong>繁體中文</strong> ·
  <a href="./README.md">English</a> ·
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

## 為什麼選擇 Nox API

- **一個 API，全部供應商** — OpenAI、Claude、Gemini、AWS Bedrock、Azure、DeepSeek、Mistral、Cohere、Ollama 等 30+ 供應商，統一 `/v1/chat/completions` 端點。
- **即插即用** — 任何支援 OpenAI 協定的客戶端都能直接對接，無需改動 SDK。
- **智慧路由** — 加權負載均衡、自動故障轉移、使用者級模型限流。
- **按量計費** — Token 級別精確計量，支援所有主流供應商的快取計費。
- **多格式中繼** — 原生支援 OpenAI Chat/Responses、Claude Messages、Gemini 格式，以及自動格式互轉。
- **企業級認證** — JWT、OAuth（GitHub、Discord、OIDC）、Telegram、WebAuthn/Passkeys、2FA。
- **現代化面板** — React + Radix UI + Tailwind，資料視覺化、渠道管理、使用者管理。

---

## 快速開始

```bash
docker run -d --name nox-api --restart always \
  -p 3000:3000 -v ./data:/data \
  drleomeng/nox-api:latest
```

開啟 `http://localhost:3000`，預設管理員帳號：`root` / `123456`

### Docker Compose

```bash
git clone https://github.com/LeoMengTCM/nox-api.git
cd nox-api
# 編輯 docker-compose.yml
docker compose up -d
```

---

## 支援的供應商

| 供應商 | 類型 | 供應商 | 類型 |
|--------|------|--------|------|
| OpenAI | Chat、Responses、Realtime、圖像、音訊、Embeddings | Anthropic Claude | Chat (Messages)，原生格式 |
| Google Gemini | Chat，原生格式 | AWS Bedrock | Claude 等 |
| Azure OpenAI | 完整 OpenAI 相容 | Google Vertex AI | Gemini、Claude |
| DeepSeek | Chat | Mistral | Chat |
| Cohere | Chat、Rerank | xAI (Grok) | Chat |
| Ollama | 本地模型 | Cloudflare Workers AI | Chat |
| 百度文心 | Chat | 阿里通義千問 | Chat、圖像 |
| 智譜 (GLM) | Chat | 騰訊混元 | Chat |
| 訊飛星火 | Chat | Moonshot (Kimi) | Chat |
| MiniMax | Chat、TTS | 火山引擎 (豆包) | Chat、TTS |
| SiliconFlow | Chat | Perplexity | Chat |
| Jina | Rerank、Embeddings | Dify | ChatFlow |
| OpenRouter | 多模型 | Replicate | 推理 |
| Coze | Bot API | Midjourney Proxy | 圖像生成 |
| Suno API | 音樂 | 即夢 | 圖像生成 |

---

## 核心特性

### 路由與可靠性
- 渠道加權隨機與優先級路由
- 失敗自動重試，可設定重試次數
- 渠道親和性 — 按使用者/令牌固定路由
- 使用者級和模型級限流

### 計費與配額
- Token 級別按量計費
- 快取感知計費（prompt cache、context caching）
- 線上儲值（Stripe、易支付）
- 訂閱方案與配額管理
- 兌換碼

### 格式轉換
- **OpenAI Chat ↔ Claude Messages** — 雙向
- **OpenAI Chat → Gemini** — 自動
- **Gemini → OpenAI Chat** — 文字支援
- **OpenAI Chat ↔ Responses** — 開發中
- 推理強度後綴（`-high`、`-medium`、`-low`）適用於 o3、GPT-5、Gemini、Claude 思考模型

### 認證與安全
- JWT 令牌，支援權限範圍控制
- OAuth：GitHub、Discord、LinuxDO、Telegram、OIDC
- WebAuthn / Passkeys
- 雙因素認證 (TOTP)
- 基於 IP 和模型的限流

### 管理面板
- 即時使用統計與圖表
- 渠道健康監控
- 使用者與令牌管理
- 模型定價設定
- 多語言介面（中、英、法、日、越、俄）

---

## 部署

### 環境需求

| 元件 | 需求 |
|------|------|
| 資料庫 | SQLite（預設）、MySQL >= 5.7.8 或 PostgreSQL >= 9.6 |
| 執行環境 | 推薦 Docker，或從原始碼建置（Go 1.22+） |
| 快取 | Redis（正式環境推薦）或記憶體快取 |

### 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `SQL_DSN` | 資料庫連線字串（空 = SQLite） | — |
| `REDIS_CONN_STRING` | Redis 連線字串 | — |
| `SESSION_SECRET` | 工作階段金鑰（多節點部署必須） | — |
| `CRYPTO_SECRET` | 加密金鑰（使用 Redis 時必須） | — |
| `STREAMING_TIMEOUT` | 串流逾時（秒） | `300` |

完整列表：[環境變數文件](https://docs.noxapi.dev/zh/docs/installation/config-maintenance/environment-variables)

---

## 文件

| | |
|---|---|
| 安裝部署 | [docs.noxapi.dev/zh/docs/installation](https://docs.noxapi.dev/zh/docs/installation) |
| API 參考 | [docs.noxapi.dev/zh/docs/api](https://docs.noxapi.dev/zh/docs/api) |
| 環境變數 | [docs.noxapi.dev/zh/docs/installation/config-maintenance/environment-variables](https://docs.noxapi.dev/zh/docs/installation/config-maintenance/environment-variables) |
| 常見問題 | [docs.noxapi.dev/zh/docs/support/faq](https://docs.noxapi.dev/zh/docs/support/faq) |

---

## 致謝

Nox API 基於 [Calcium-Ion](https://github.com/Calcium-Ion) 的 [New API](https://github.com/Calcium-Ion/new-api) 建置。感謝他們在 AI API 閘道生態上的開創性工作。

---

## 參與貢獻

歡迎提交 Bug 報告、功能建議和 Pull Request：[GitHub Issues](https://github.com/LeoMengTCM/nox-api/issues)

---

## 授權條款

[GNU Affero General Public License v3.0 (AGPLv3)](./LICENSE)

商業授權諮詢：[leomengtcm@gmail.com](mailto:leomengtcm@gmail.com)

---

<div align="center">

如果 Nox API 對你有幫助，歡迎給個 Star。

[![Star History Chart](https://api.star-history.com/svg?repos=LeoMengTCM/nox-api&type=Date)](https://star-history.com/#LeoMengTCM/nox-api&Date)

</div>
