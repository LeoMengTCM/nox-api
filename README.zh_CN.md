<div align="center">

![Nox API](/web/public/favicon.svg)

# Nox API

**统一 AI 网关，一个端点，所有模型。**

通过单一 OpenAI 兼容 API 将请求路由到 40+ AI 供应商。
内置计费、限流、认证和现代化管理面板。

<p>
  <strong>简体中文</strong> ·
  <a href="./README.zh_TW.md">繁體中文</a> ·
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

## 为什么选择 Nox API

- **一个 API，全部供应商** — OpenAI、Claude、Gemini、AWS Bedrock、Azure、DeepSeek、Mistral、Cohere、Ollama 等 30+ 供应商，统一 `/v1/chat/completions` 端点。
- **即插即用** — 任何支持 OpenAI 协议的客户端都能直接对接，无需改动 SDK。
- **智能路由** — 加权负载均衡、自动故障转移、用户级模型限流。
- **按量计费** — Token 级别精确计量，支持所有主流供应商的缓存计费。
- **多格式中继** — 原生支持 OpenAI Chat/Responses、Claude Messages、Gemini 格式，以及自动格式互转。
- **企业级认证** — JWT、OAuth（GitHub、Discord、OIDC）、Telegram、WebAuthn/Passkeys、2FA。
- **现代化面板** — React + Radix UI + Tailwind，数据可视化、渠道管理、用户管理。

---

## 快速开始

```bash
docker run -d --name nox-api --restart always \
  -p 3000:3000 -v ./data:/data \
  drleomeng/nox-api:latest
```

打开 `http://localhost:3000`，默认管理员账号：`root` / `123456`

### Docker Compose

```bash
git clone https://github.com/LeoMengTCM/nox-api.git
cd nox-api
# 编辑 docker-compose.yml
docker compose up -d
```

---

## 支持的供应商

| 供应商 | 类型 | 供应商 | 类型 |
|--------|------|--------|------|
| OpenAI | Chat、Responses、Realtime、图像、音频、Embeddings | Anthropic Claude | Chat (Messages)，原生格式 |
| Google Gemini | Chat，原生格式 | AWS Bedrock | Claude 等 |
| Azure OpenAI | 完整 OpenAI 兼容 | Google Vertex AI | Gemini、Claude |
| DeepSeek | Chat | Mistral | Chat |
| Cohere | Chat、Rerank | xAI (Grok) | Chat |
| Ollama | 本地模型 | Cloudflare Workers AI | Chat |
| 百度文心 | Chat | 阿里通义千问 | Chat、图像 |
| 智谱 (GLM) | Chat | 腾讯混元 | Chat |
| 讯飞星火 | Chat | Moonshot (Kimi) | Chat |
| MiniMax | Chat、TTS | 火山引擎 (豆包) | Chat、TTS |
| SiliconFlow | Chat | Perplexity | Chat |
| Jina | Rerank、Embeddings | Dify | ChatFlow |
| OpenRouter | 多模型 | Replicate | 推理 |
| Coze | Bot API | Midjourney Proxy | 图像生成 |
| Suno API | 音乐 | 即梦 | 图像生成 |

---

## 核心特性

### 路由与可靠性
- 渠道加权随机与优先级路由
- 失败自动重试，可配置重试次数
- 渠道亲和性 — 按用户/令牌固定路由
- 用户级和模型级限流

### 计费与配额
- Token 级别按量计费
- 缓存感知计费（prompt cache、context caching）
- 在线充值（Stripe、易支付）
- 订阅方案与配额管理
- 兑换码

### 格式转换
- **OpenAI Chat ↔ Claude Messages** — 双向
- **OpenAI Chat → Gemini** — 自动
- **Gemini → OpenAI Chat** — 文本支持
- **OpenAI Chat ↔ Responses** — 开发中
- 推理强度后缀（`-high`、`-medium`、`-low`）适用于 o3、GPT-5、Gemini、Claude 思考模型

### 认证与安全
- JWT 令牌，支持权限范围控制
- OAuth：GitHub、Discord、LinuxDO、Telegram、OIDC
- WebAuthn / Passkeys
- 双因素认证 (TOTP)
- 基于 IP 和模型的限流

### 管理面板
- 实时使用统计与图表
- 渠道健康监控
- 用户与令牌管理
- 模型定价配置
- 多语言界面（中、英、法、日、越、俄）

---

## 部署

### 环境要求

| 组件 | 要求 |
|------|------|
| 数据库 | SQLite（默认）、MySQL >= 5.7.8 或 PostgreSQL >= 9.6 |
| 运行环境 | 推荐 Docker，或从源码构建（Go 1.22+） |
| 缓存 | Redis（生产环境推荐）或内存缓存 |

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SQL_DSN` | 数据库连接字符串（空 = SQLite） | — |
| `REDIS_CONN_STRING` | Redis 连接字符串 | — |
| `SESSION_SECRET` | 会话密钥（多节点部署必须） | — |
| `CRYPTO_SECRET` | 加密密钥（使用 Redis 时必须） | — |
| `STREAMING_TIMEOUT` | 流式超时（秒） | `300` |

完整列表：[环境变量文档](https://docs.noxapi.dev/zh/docs/installation/config-maintenance/environment-variables)

---

## 文档

| | |
|---|---|
| 安装部署 | [docs.noxapi.dev/zh/docs/installation](https://docs.noxapi.dev/zh/docs/installation) |
| API 参考 | [docs.noxapi.dev/zh/docs/api](https://docs.noxapi.dev/zh/docs/api) |
| 环境变量 | [docs.noxapi.dev/zh/docs/installation/config-maintenance/environment-variables](https://docs.noxapi.dev/zh/docs/installation/config-maintenance/environment-variables) |
| 常见问题 | [docs.noxapi.dev/zh/docs/support/faq](https://docs.noxapi.dev/zh/docs/support/faq) |

---

## 致谢

Nox API 基于 [Calcium-Ion](https://github.com/Calcium-Ion) 的 [New API](https://github.com/Calcium-Ion/new-api) 构建。感谢他们在 AI API 网关生态上的开创性工作。

---

## 参与贡献

欢迎提交 Bug 报告、功能建议和 Pull Request：[GitHub Issues](https://github.com/LeoMengTCM/nox-api/issues)

---

## 许可证

[GNU Affero General Public License v3.0 (AGPLv3)](./LICENSE)

商业授权咨询：[leomengtcm@gmail.com](mailto:leomengtcm@gmail.com)

---

<div align="center">

如果 Nox API 对你有帮助，欢迎给个 Star。

[![Star History Chart](https://api.star-history.com/svg?repos=LeoMengTCM/nox-api&type=Date)](https://star-history.com/#LeoMengTCM/nox-api&Date)

</div>
