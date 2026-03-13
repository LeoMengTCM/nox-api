# Nox API 部署指南

## 目录

- [1. 环境准备](#1-环境准备)
- [2. 部署方式](#2-部署方式)
  - [方式 A：Docker Compose（推荐）](#方式-a-docker-compose推荐)
  - [方式 B：纯 Docker 命令（轻量）](#方式-b-纯-docker-命令轻量)
- [3. 修改端口](#3-修改端口)
- [4. 使用 Nginx Proxy Manager 反代](#4-使用-nginx-proxy-manager-反代)
- [5. 使用 HTTPS（SSL 证书）](#5-使用-httpsssl-证书)
- [6. 常用运维命令](#6-常用运维命令)
- [7. 生产环境安全清单](#7-生产环境安全清单)

---

## 1. 环境准备

### VPS 最低配置

| 项目 | 要求 |
|------|------|
| CPU | 1 核 |
| 内存 | 1 GB（推荐 2 GB） |
| 磁盘 | 10 GB+ |
| 系统 | Ubuntu 20.04+ / Debian 11+ / CentOS 8+（任何支持 Docker 的 Linux） |

### 安装 Docker

```bash
# 一键安装 Docker（官方脚本）
curl -fsSL https://get.docker.com | sh

# 启动并设为开机自启
systemctl enable docker && systemctl start docker

# 验证
docker --version
docker compose version
```

> 如果 `docker compose version` 报错，说明是旧版 Docker，需要另外安装 docker-compose：
> ```bash
> apt install docker-compose-plugin
> ```

---

## 2. 部署方式

### 方式 A：Docker Compose（推荐）

适合生产环境，自带 PostgreSQL + Redis。

```bash
# 1. 创建目录
mkdir -p /opt/nox-api && cd /opt/nox-api

# 2. 下载 docker-compose.yml
curl -o docker-compose.yml https://raw.githubusercontent.com/LeoMengTCM/nox-api/main/docker-compose.yml

# 3. 【重要】修改密码
nano docker-compose.yml
```

**必须修改的内容**（打开 docker-compose.yml 后）：

```yaml
# 第 29 行 - 数据库密码，把 123456 改成你的强密码
- SQL_DSN=postgresql://root:你的强密码@postgres:5432/nox-api

# 第 67 行 - PostgreSQL 密码，要和上面一致
POSTGRES_PASSWORD: 你的强密码
```

**建议取消注释的内容**：

```yaml
# 第 36 行 - 如果未来要多机部署，现在就设好
- SESSION_SECRET=一个随机字符串
```

修改完成后启动：

```bash
# 4. 启动
docker compose up -d

# 5. 查看日志，确认启动成功
docker compose logs -f nox-api
```

看到类似 `Nox API started` 的日志就表示成功了。按 `Ctrl+C` 退出日志。

访问 `http://你的VPS-IP:3000`，默认管理员账号：

| 用户名 | 密码 |
|--------|------|
| `root` | `123456` |

**登录后立即修改密码！**

---

### 方式 B：纯 Docker 命令（轻量）

适合个人使用、测试环境，使用内置 SQLite，无需额外数据库。

```bash
docker run -d --name nox-api --restart always \
  -p 3000:3000 \
  -v /opt/nox-api/data:/data \
  drleomeng/nox-api:latest
```

数据存储在 `/opt/nox-api/data`，SQLite 数据库文件也在里面。

> 如果后续需要 Redis 缓存（推荐）：
> ```bash
> # 先启动 Redis
> docker run -d --name redis --restart always redis:latest
>
> # 获取 Redis 容器 IP
> docker inspect redis | grep IPAddress
>
> # 启动 Nox API 并连接 Redis
> docker run -d --name nox-api --restart always \
>   -p 3000:3000 \
>   -e REDIS_CONN_STRING="redis://172.17.0.x:6379" \
>   -v /opt/nox-api/data:/data \
>   drleomeng/nox-api:latest
> ```

---

## 3. 修改端口

### Docker Compose 方式

编辑 `docker-compose.yml`，修改 ports 映射的**左侧**数字（宿主机端口）：

```yaml
ports:
  - "8080:3000"   # 改成 8080 或任意你想要的端口
```

然后重启：

```bash
docker compose down && docker compose up -d
```

### 纯 Docker 命令方式

```bash
# 停掉旧容器
docker stop nox-api && docker rm nox-api

# 用新端口启动
docker run -d --name nox-api --restart always \
  -p 8080:3000 \
  -v /opt/nox-api/data:/data \
  drleomeng/nox-api:latest
```

> 注意：冒号右边的 `3000` 是容器内部端口，**不要改**。只改左边的宿主机端口。

---

## 4. 使用 Nginx Proxy Manager 反代

### 4.1 如果还没安装 Nginx Proxy Manager

```bash
mkdir -p /opt/npm && cd /opt/npm

cat > docker-compose.yml << 'EOF'
version: '3'
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: always
    ports:
      - "80:80"
      - "443:443"
      - "81:81"       # NPM 管理面板
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
EOF

docker compose up -d
```

NPM 管理面板地址：`http://你的VPS-IP:81`

默认登录：

| 邮箱 | 密码 |
|------|------|
| `admin@example.com` | `changeme` |

首次登录会要求修改。

### 4.2 配置反向代理

1. 登录 NPM 管理面板（`:81`）
2. 点击 **Proxy Hosts** → **Add Proxy Host**
3. 填写：

| 字段 | 值 |
|------|-----|
| **Domain Names** | `api.你的域名.com`（你要绑定的域名） |
| **Scheme** | `http` |
| **Forward Hostname / IP** | 见下方说明 |
| **Forward Port** | `3000` |
| **Block Common Exploits** | 勾选 |
| **Websockets Support** | 勾选（Realtime API 需要） |

**Forward Hostname / IP 怎么填：**

- 如果 Nox API 和 NPM **在同一台机器上**：
  ```bash
  # 获取 Nox API 容器的 IP
  docker inspect nox-api | grep IPAddress
  # 通常是 172.17.0.x，填这个 IP
  ```

  或者更简单的方式 —— 让它们共享网络：
  ```bash
  # 把 NPM 加入 nox-api 的网络
  docker network connect nox-api-network nginx-proxy-manager
  ```
  然后 Forward Hostname 直接填 `nox-api`（容器名）。

- 如果 Nox API 和 NPM **在不同机器上**：填 Nox API 所在机器的内网 IP。

4. 点击 **Save**

### 4.3 验证

访问 `http://api.你的域名.com`，应该能看到 Nox API 的界面。

---

## 5. 使用 HTTPS（SSL 证书）

在 NPM 中配置好反向代理后：

1. 点击刚创建的 Proxy Host 右侧的三个点 → **Edit**
2. 切换到 **SSL** 标签页
3. 选择 **Request a new SSL Certificate**
4. 勾选：
   - **Force SSL** ✅
   - **HTTP/2 Support** ✅
   - **HSTS Enabled** ✅（可选）
   - **I Agree to the Let's Encrypt Terms** ✅
5. 填入你的邮箱
6. 点击 **Save**

NPM 会自动申请 Let's Encrypt 免费证书并自动续期。

完成后访问 `https://api.你的域名.com` 即可。

---

## 6. 常用运维命令

```bash
# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f nox-api

# 查看最近 100 行日志
docker compose logs --tail 100 nox-api

# 更新到最新版本
docker compose pull
docker compose up -d

# 重启服务
docker compose restart nox-api

# 停止所有服务
docker compose down

# 停止并删除数据（⚠️ 危险操作）
docker compose down -v

# 查看磁盘占用
docker system df

# 清理无用镜像
docker image prune -f
```

### 备份数据

```bash
# Docker Compose 方式（PostgreSQL）
docker exec postgres pg_dump -U root nox-api > backup_$(date +%Y%m%d).sql

# 纯 Docker 方式（SQLite）
cp /opt/nox-api/data/nox-api.db backup_$(date +%Y%m%d).db
```

### 恢复数据

```bash
# PostgreSQL
cat backup_20260313.sql | docker exec -i postgres psql -U root nox-api

# SQLite
cp backup_20260313.db /opt/nox-api/data/nox-api.db
docker restart nox-api
```

---

## 7. 生产环境安全清单

- [ ] 修改默认管理员密码（`root` / `123456`）
- [ ] 修改数据库密码（docker-compose.yml 中的 `123456`）
- [ ] 设置 `SESSION_SECRET` 环境变量
- [ ] 设置 `CRYPTO_SECRET` 环境变量（使用 Redis 时必须）
- [ ] 配置 HTTPS（通过 NPM 或其他方式）
- [ ] 防火墙只开放 80/443 端口，关闭 3000 端口的外网访问
- [ ] 定期备份数据库

### 防火墙配置（UFW）

```bash
# 只允许 HTTP/HTTPS 和 SSH
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 81/tcp       # NPM 管理面板（配置完成后建议关闭或限制 IP）
ufw enable

# 不要开放 3000 端口给外网，让 NPM 反代即可
```

### 生成随机密钥

```bash
# SESSION_SECRET
openssl rand -hex 32

# CRYPTO_SECRET
openssl rand -hex 16
```

将生成的值填入 docker-compose.yml 的对应环境变量中。
