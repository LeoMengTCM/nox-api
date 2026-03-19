# 开发者发布指南 — 从代码修改到 GitHub + Docker Hub 发布

本文档面向开发者，详细记录了每次版本发布的完整操作流程。

---

## 一、发布前检查

### 1.1 确认代码编译通过

```bash
cd "/Volumes/Leo/new projects/nox-api"

# Go 后端编译
go build ./...

# 前端编译
cd web && bun run build && cd ..
```

两个都无报错才能继续。

### 1.2 确认本地 Docker 环境

```bash
# 确认 Docker 运行中
docker info

# 确认 buildx 可用
docker buildx ls
# 应看到 desktop-linux 或 default builder，支持 linux/amd64 + linux/arm64

# 确认已登录 Docker Hub
docker login
# 用户名: drleomeng
```

---

## 二、更新版本信息

### 2.1 更新 VERSION 文件

```bash
# 查看当前版本
cat VERSION
# 输出例如: v0.1.9

# 更新到新版本
echo "v0.1.10" > VERSION
```

### 2.2 更新 CHANGELOG.md

在文件顶部（`# Changelog` 之后）添加新版本记录：

```markdown
## [0.1.10] - 2026-03-19

### New Features
- 新增了 XXX 功能

### Fixes
- 修复了 YYY 问题

### Improvements
- 优化了 ZZZ
```

日期格式：`YYYY-MM-DD`，版本号不带 `v` 前缀。

---

## 三、提交并推送到 GitHub

### 3.1 查看改动

```bash
cd "/Volumes/Leo/new projects/nox-api"

# 查看所有改动的文件
git status

# 查看具体改动内容
git diff
```

### 3.2 暂存文件

**重要：逐个添加文件，不要用 `git add .`**

```bash
# 示例：添加本次改动的所有文件
git add VERSION CHANGELOG.md \
  model/bank.go service/bank.go controller/bank.go \
  web/src/pages/casino/bank.jsx \
  model/main.go main.go router/api-router.go
```

### 3.3 提交

```bash
git commit -m "feat: v0.1.10 — 简要描述改动内容"
```

Commit message 格式约定：
- `feat:` — 新功能
- `fix:` — 修复 bug
- `chore:` — 版本号、配置等维护性改动
- `refactor:` — 重构

### 3.4 推送

```bash
git push origin main
```

**如果推送被拒绝（远程有新提交）：**
```bash
git pull origin main --rebase
git push origin main
```

---

## 四、构建并推送 Docker 镜像

### 4.1 一条命令完成构建+推送

```bash
cd "/Volumes/Leo/new projects/nox-api"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t drleomeng/nox-api:latest \
  -t drleomeng/nox-api:v0.1.10 \
  --push .
```

**参数详解：**

| 参数 | 说明 |
|------|------|
| `--platform linux/amd64,linux/arm64` | 同时构建 x86_64 和 ARM64 两个架构 |
| `-t drleomeng/nox-api:latest` | 打标签为 latest（服务器 `docker pull` 默认拉这个） |
| `-t drleomeng/nox-api:v0.1.10` | 打标签为具体版本号（方便回滚） |
| `--push` | 构建完成后自动推送到 Docker Hub |
| `.` | 使用当前目录的 `Dockerfile` |

### 4.2 构建过程说明

构建分三个阶段（参考 `Dockerfile`）：

1. **Stage 1 (builder)**: 用 `oven/bun` 镜像编译前端 (`bun run build`)
2. **Stage 2 (builder2)**: 用 `golang:alpine` 镜像编译 Go 后端 (`go build`)
3. **Stage 3 (runtime)**: 用 `debian:bookworm-slim` 作为最终运行镜像

首次构建约 **5-8 分钟**，后续有缓存约 **1-3 分钟**。

### 4.3 构建成功的输出

看到以下内容表示成功：

```
#48 pushing manifest for docker.io/drleomeng/nox-api:latest@sha256:xxx done
#48 pushing manifest for docker.io/drleomeng/nox-api:v0.1.10@sha256:xxx done
#48 DONE 18.0s
```

---

## 五、常见错误处理

### 5.1 Docker push 失败 (EOF / timeout)

**症状：** 构建成功但推送时报 `EOF` 或 `failed to do request`

**原因：** Docker Hub (registry-1.docker.io) 网络连接不稳定

**解决：** 直接重新运行同一条命令。因为有构建缓存，重试时只需要推送（几秒钟）：

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t drleomeng/nox-api:latest \
  -t drleomeng/nox-api:v0.1.10 \
  --push .
```

### 5.2 Buildx cache 损坏 (digest mismatch)

**症状：** `failed to compute cache key: unexpected commit digest sha256:xxx`

**解决：** 清理 buildx 缓存后重试：

```bash
docker buildx prune -f
docker buildx build --platform linux/amd64,linux/arm64 \
  -t drleomeng/nox-api:latest -t drleomeng/nox-api:v0.1.10 --push .
```

### 5.3 ARM64 base image 下载失败

**症状：** `short read: expected xxx bytes but got yyy: unexpected EOF`

**原因：** ARM64 的 base image 下载被中断

**解决：** 重试即可，Docker 会自动续传。

### 5.4 Go 编译失败

**症状：** `go build` 报错

**解决：** 先在本地修复编译错误再提交。Docker 构建环境和本地一致（都是 Go alpine）。

---

## 六、验证发布

### 6.1 验证 GitHub

```bash
# 查看最近提交
git log --oneline -5
# 确认最新 commit 已推送

# 在浏览器打开确认
# https://github.com/LeoMengTCM/nox-api/commits/main
```

### 6.2 验证 Docker Hub

```bash
# 检查镜像信息
docker manifest inspect drleomeng/nox-api:v0.1.10

# 或在浏览器查看
# https://hub.docker.com/r/drleomeng/nox-api/tags
```

### 6.3 服务器更新

在生产服务器上执行：

```bash
# Docker Compose 方式
cd /opt/nox-api
docker compose pull
docker compose up -d

# 纯 Docker 方式
docker pull drleomeng/nox-api:latest
docker stop nox-api && docker rm nox-api
docker run -d --name nox-api --restart always \
  -p 3000:3000 -v /opt/nox-api/data:/data \
  drleomeng/nox-api:latest

# 查看启动日志确认版本号
docker logs nox-api 2>&1 | head -20
```

---

## 七、完整操作速查

以下是一次完整发布的所有命令（假设版本从 v0.1.9 升到 v0.1.10）：

```bash
cd "/Volumes/Leo/new projects/nox-api"

# 1. 编译验证
go build ./...
cd web && bun run build && cd ..

# 2. 更新版本
echo "v0.1.10" > VERSION
# 手动编辑 CHANGELOG.md 添加版本记录

# 3. 提交代码
git add VERSION CHANGELOG.md <其他改动文件...>
git commit -m "feat: v0.1.10 — 简要描述"

# 4. 推送 GitHub
git push origin main

# 5. 构建+推送 Docker
docker buildx build --platform linux/amd64,linux/arm64 \
  -t drleomeng/nox-api:latest -t drleomeng/nox-api:v0.1.10 --push .

# 6. 如果 push 失败，重试同一条命令即可
```
