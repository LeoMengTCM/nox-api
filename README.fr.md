<div align="center">

![Nox API](/web/public/favicon.svg)

# Nox API

**Passerelle IA unifiee. Un seul point de terminaison, tous les modeles.**

Acheminez vos requetes vers plus de 40 fournisseurs d'IA via une API unique compatible OpenAI.
Facturation, limitation de debit, authentification et tableau de bord d'administration modernes integres.

<p>
  <a href="./README.zh_CN.md">简体中文</a> ·
  <a href="./README.zh_TW.md">繁體中文</a> ·
  <a href="./README.md">English</a> ·
  <strong>Français</strong> ·
  <a href="./README.ja.md">日本語</a>
</p>

<p>
  <a href="https://raw.githubusercontent.com/LeoMengTCM/nox-api/main/LICENSE">
    <img src="https://img.shields.io/github/license/LeoMengTCM/nox-api?color=brightgreen" alt="licence">
  </a>
  <a href="https://github.com/LeoMengTCM/nox-api/releases/latest">
    <img src="https://img.shields.io/github/v/release/LeoMengTCM/nox-api?color=brightgreen&include_prereleases" alt="version">
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

## Pourquoi Nox API

- **Une seule API, tous les fournisseurs** -- OpenAI, Claude, Gemini, AWS Bedrock, Azure, DeepSeek, Mistral, Cohere, Ollama et plus de 30 autres, derriere un unique point de terminaison `/v1/chat/completions`.
- **Compatible sans modification** -- Tout ce qui communique avec OpenAI peut dialoguer avec Nox API. Aucune modification de SDK requise.
- **Routage intelligent** -- Equilibrage de charge pondere, basculement automatique, limitation de debit par utilisateur et par modele.
- **Facturation a l'utilisation** -- Comptage au niveau des jetons avec facturation tenant compte du cache pour tous les principaux fournisseurs.
- **Relais multi-format** -- Prise en charge native d'OpenAI Chat/Responses, Claude Messages, Gemini, et conversion automatique entre ces formats.
- **Authentification professionnelle** -- JWT, OAuth (GitHub, Discord, OIDC), Telegram, WebAuthn/Passkeys, 2FA.
- **Tableau de bord moderne** -- React + Radix UI + Tailwind. Visualisation des donnees, gestion des canaux, administration des utilisateurs.

---

## Demarrage rapide

```bash
docker run -d --name nox-api --restart always \
  -p 3000:3000 -v ./data:/data \
  drleomeng/nox-api:latest
```

Ouvrez `http://localhost:3000` -- identifiants administrateur par defaut : `root` / `123456`

### Docker Compose

```bash
git clone https://github.com/LeoMengTCM/nox-api.git
cd nox-api
# modifiez docker-compose.yml selon vos besoins
docker compose up -d
```

---

## Fournisseurs pris en charge

| Fournisseur | Type | Fournisseur | Type |
|-------------|------|-------------|------|
| OpenAI | Chat, Responses, Realtime, Images, Audio, Embeddings | Anthropic Claude | Chat (Messages), format natif |
| Google Gemini | Chat, format natif | AWS Bedrock | Claude, etc. |
| Azure OpenAI | Compatibilite OpenAI complete | Google Vertex AI | Gemini, Claude |
| DeepSeek | Chat | Mistral | Chat |
| Cohere | Chat, Rerank | xAI (Grok) | Chat |
| Ollama | Modeles locaux | Cloudflare Workers AI | Chat |
| Baidu (Wenxin) | Chat | Alibaba (Qwen) | Chat, Images |
| Zhipu (GLM) | Chat | Tencent Hunyuan | Chat |
| iFlytek (Spark) | Chat | Moonshot (Kimi) | Chat |
| MiniMax | Chat, TTS | Volcengine (Doubao) | Chat, TTS |
| SiliconFlow | Chat | Perplexity | Chat |
| Jina | Rerank, Embeddings | Dify | ChatFlow |
| OpenRouter | Multi-modeles | Replicate | Inference |
| Coze | Bot API | Midjourney Proxy | Generation d'images |
| Suno API | Musique | Jimeng | Generation d'images |

---

## Fonctionnalites cles

### Routage et fiabilite
- Routage par priorite et selection aleatoire ponderee des canaux
- Nouvelle tentative automatique en cas d'echec avec nombre de tentatives configurable
- Affinite de canal -- routage persistant par utilisateur/jeton
- Limitation de debit par utilisateur et par modele

### Facturation et quotas
- Facturation a l'utilisation au niveau des jetons
- Facturation tenant compte du cache (cache de prompt, mise en cache du contexte)
- Recharge en ligne (Stripe, EPay)
- Plans d'abonnement avec gestion des quotas
- Codes de remboursement

### Conversion de format
- **OpenAI Chat <-> Claude Messages** -- bidirectionnelle
- **OpenAI Chat -> Gemini** -- automatique
- **Gemini -> OpenAI Chat** -- prise en charge du texte
- **OpenAI Chat <-> Responses** -- en cours de developpement
- Suffixes d'effort de raisonnement (`-high`, `-medium`, `-low`) pour o3, GPT-5, Gemini, modeles de reflexion Claude

### Authentification et securite
- Jetons JWT avec permissions a portee limitee
- OAuth : GitHub, Discord, LinuxDO, Telegram, OIDC
- WebAuthn / Passkeys
- Authentification a deux facteurs (TOTP)
- Limitation de debit basee sur l'IP et sur le modele

### Tableau de bord d'administration
- Statistiques d'utilisation en temps reel et graphiques
- Surveillance de l'etat des canaux
- Gestion des utilisateurs et des jetons
- Configuration de la tarification des modeles
- Interface multilingue (zh, en, fr, ja, vi, ru)

---

## Deploiement

### Prerequis

| Composant | Prerequis |
|-----------|-----------|
| Base de donnees | SQLite (par defaut), MySQL >= 5.7.8, ou PostgreSQL >= 9.6 |
| Environnement d'execution | Docker recommande, ou compilation depuis les sources (Go 1.22+) |
| Cache | Redis (recommande en production), ou en memoire |

### Variables d'environnement

| Variable | Description | Valeur par defaut |
|----------|-------------|-------------------|
| `SQL_DSN` | Chaine de connexion a la base de donnees (vide = SQLite) | -- |
| `REDIS_CONN_STRING` | Chaine de connexion Redis | -- |
| `SESSION_SECRET` | Secret de session (requis en multi-noeud) | -- |
| `CRYPTO_SECRET` | Cle de chiffrement (requise avec Redis) | -- |
| `STREAMING_TIMEOUT` | Delai d'expiration du streaming en secondes | `300` |

Liste complete : [Variables d'environnement](https://docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables)

---

## Documentation

| | |
|---|---|
| Installation | [docs.noxapi.dev/en/docs/installation](https://docs.noxapi.dev/en/docs/installation) |
| Reference API | [docs.noxapi.dev/en/docs/api](https://docs.noxapi.dev/en/docs/api) |
| Variables d'environnement | [docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables](https://docs.noxapi.dev/en/docs/installation/config-maintenance/environment-variables) |
| FAQ | [docs.noxapi.dev/en/docs/support/faq](https://docs.noxapi.dev/en/docs/support/faq) |

---

## Remerciements

Nox API est construit sur les fondations de [New API](https://github.com/Calcium-Ion/new-api) par [Calcium-Ion](https://github.com/Calcium-Ion). Nous sommes reconnaissants pour leur travail pionnier dans l'ecosysteme des passerelles API d'IA.

---

## Contribuer

Les rapports de bogues, demandes de fonctionnalites et pull requests sont les bienvenus sur [GitHub Issues](https://github.com/LeoMengTCM/nox-api/issues).

---

## Licence

[GNU Affero General Public License v3.0 (AGPLv3)](./LICENSE)

Pour toute demande de licence commerciale : [leomengtcm@gmail.com](mailto:leomengtcm@gmail.com)

---

<div align="center">

Si Nox API vous est utile, pensez a lui attribuer une etoile.

[![Star History Chart](https://api.star-history.com/svg?repos=LeoMengTCM/nox-api&type=Date)](https://star-history.com/#LeoMengTCM/nox-api&Date)

</div>
