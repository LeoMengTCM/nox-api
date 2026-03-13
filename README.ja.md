<div align="center">

![Nox API](/web/public/favicon.svg)

# Nox API

**統合AIゲートウェイ。ひとつのエンドポイントで、すべてのモデルへ。**

40以上のAIプロバイダーへのリクエストを、単一のOpenAI互換APIでルーティング。
課金、レート制限、認証、モダンな管理ダッシュボードを内蔵。

<p>
  <a href="./README.zh_CN.md">简体中文</a> ·
  <a href="./README.zh_TW.md">繁體中文</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.fr.md">Français</a> ·
  <strong>日本語</strong>
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

## Nox API を選ぶ理由

- **ひとつのAPIで、すべてのプロバイダーに対応** — OpenAI、Claude、Gemini、AWS Bedrock、Azure、DeepSeek、Mistral、Cohere、Ollama など30以上のプロバイダーを、単一の `/v1/chat/completions` エンドポイントで利用可能。
- **そのまま置き換え可能** — OpenAIプロトコルに対応するものなら、Nox APIとそのまま通信できます。SDKの変更は不要。
- **スマートルーティング** — 重み付けロードバランシング、自動フェイルオーバー、ユーザー/モデル単位のレート制限。
- **従量課金** — トークンレベルの使用量計測。主要プロバイダーすべてでキャッシュ対応の課金をサポート。
- **マルチフォーマットリレー** — OpenAI Chat/Responses、Claude Messages、Gemini のネイティブサポートと、フォーマット間の自動変換。
- **エンタープライズ対応の認証** — JWT、OAuth（GitHub、Discord、OIDC）、Telegram、WebAuthn/Passkeys、2FA。
- **モダンなダッシュボード** — React + Radix UI + Tailwind。データの可視化、チャネル管理、ユーザー管理。

---

## クイックスタート

```bash
docker run -d --name nox-api --restart always \
  -p 3000:3000 -v ./data:/data \
  drleomeng/nox-api:latest
```

`http://localhost:3000` を開いてください。デフォルトの管理者認証情報: `root` / `123456`

### Docker Compose

```bash
git clone https://github.com/LeoMengTCM/nox-api.git
cd nox-api
# docker-compose.yml をお好みに合わせて編集
docker compose up -d
```

---

## 対応プロバイダー

| プロバイダー | タイプ | プロバイダー | タイプ |
|----------|------|----------|------|
| OpenAI | Chat, Responses, Realtime, Images, Audio, Embeddings | Anthropic Claude | Chat (Messages), ネイティブフォーマット |
| Google Gemini | Chat, ネイティブフォーマット | AWS Bedrock | Claude 等 |
| Azure OpenAI | 完全なOpenAI互換 | Google Vertex AI | Gemini, Claude |
| DeepSeek | Chat | Mistral | Chat |
| Cohere | Chat, Rerank | xAI (Grok) | Chat |
| Ollama | ローカルモデル | Cloudflare Workers AI | Chat |
| Baidu (文心) | Chat | Alibaba (Qwen) | Chat, Images |
| Zhipu (GLM) | Chat | Tencent Hunyuan | Chat |
| iFlytek (Spark) | Chat | Moonshot (Kimi) | Chat |
| MiniMax | Chat, TTS | Volcengine (Doubao) | Chat, TTS |
| SiliconFlow | Chat | Perplexity | Chat |
| Jina | Rerank, Embeddings | Dify | ChatFlow |
| OpenRouter | マルチモデル | Replicate | Inference |
| Coze | Bot API | Midjourney Proxy | 画像生成 |
| Suno API | 音楽 | Jimeng | 画像生成 |

---

## 主な機能

### ルーティングと信頼性
- チャネルの重み付けランダム・優先度ルーティング
- 設定可能なリトライ回数による障害時の自動リトライ
- チャネルアフィニティ — ユーザー/トークン単位のスティッキールーティング
- ユーザー単位・モデル単位のレート制限

### 課金とクォータ
- トークンレベルの従量課金
- キャッシュ対応の課金（プロンプトキャッシュ、コンテキストキャッシュ）
- オンラインチャージ（Stripe、EPay）
- クォータ管理付きサブスクリプションプラン
- 引き換えコード

### フォーマット変換
- **OpenAI Chat <-> Claude Messages** — 双方向
- **OpenAI Chat -> Gemini** — 自動
- **Gemini -> OpenAI Chat** — テキスト対応
- **OpenAI Chat <-> Responses** — 開発中
- 推論強度サフィックス（`-high`、`-medium`、`-low`）: o3、GPT-5、Gemini、Claude 思考モデルに対応

### 認証とセキュリティ
- スコープ付き権限のJWTトークン
- OAuth: GitHub、Discord、LinuxDO、Telegram、OIDC
- WebAuthn / Passkeys
- 二要素認証（TOTP）
- IPベース・モデルベースのレート制限

### 管理ダッシュボード
- リアルタイムの使用統計とグラフ
- チャネルヘルスモニタリング
- ユーザーとトークンの管理
- モデル価格設定
- 多言語UI（zh、en、fr、ja、vi、ru）

---

## デプロイ

### 要件

| コンポーネント | 要件 |
|-----------|-------------|
| データベース | SQLite（デフォルト）、MySQL >= 5.7.8、または PostgreSQL >= 9.6 |
| ランタイム | Docker推奨、またはソースからビルド（Go 1.22+） |
| キャッシュ | Redis（本番環境推奨）、またはインメモリ |

### 環境変数

| 変数 | 説明 | デフォルト |
|----------|-------------|---------|
| `SQL_DSN` | データベース接続文字列（空 = SQLite） | — |
| `REDIS_CONN_STRING` | Redis接続文字列 | — |
| `SESSION_SECRET` | セッションシークレット（マルチノード構成時に必須） | — |
| `CRYPTO_SECRET` | 暗号化キー（Redis使用時に必須） | — |
| `STREAMING_TIMEOUT` | ストリームタイムアウト（秒） | `300` |

完全なリスト: [環境変数](https://docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables)

---

## ドキュメント

| | |
|---|---|
| インストール | [docs.noxapi.dev/en/docs/installation](https://docs.noxapi.dev/en/docs/installation) |
| APIリファレンス | [docs.noxapi.dev/en/docs/api](https://docs.noxapi.dev/en/docs/api) |
| 環境変数 | [docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables](https://docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables) |
| FAQ | [docs.noxapi.dev/en/docs/support/faq](https://docs.noxapi.dev/en/docs/support/faq) |

---

## 謝辞

Nox API は [Calcium-Ion](https://github.com/Calcium-Ion) 氏の [New API](https://github.com/Calcium-Ion/new-api) を基盤として構築されています。AI APIゲートウェイエコシステムにおける先駆的な取り組みに感謝いたします。

---

## コントリビュート

バグ報告、機能リクエスト、プルリクエストは [GitHub Issues](https://github.com/LeoMengTCM/nox-api/issues) で受け付けています。

---

## ライセンス

[GNU Affero General Public License v3.0 (AGPLv3)](./LICENSE)

商用ライセンスに関するお問い合わせ: [leomengtcm@gmail.com](mailto:leomengtcm@gmail.com)

---

<div align="center">

Nox API がお役に立ちましたら、スターをいただけると嬉しいです。

[![Star History Chart](https://api.star-history.com/svg?repos=LeoMengTCM/nox-api&type=Date)](https://star-history.com/#LeoMengTCM/nox-api&Date)

</div>
