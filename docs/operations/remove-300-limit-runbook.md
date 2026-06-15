# PandaWiki 去除 300 限制复用手册

## 1. 适用场景

适用于以下目标：

- 基于自己的 PandaWiki fork 去掉开源版单知识库 300 节点限制。
- 将修改后的版本推送到自己的 GitHub fork。
- 在已经通过官方脚本部署的主机上，替换官方 `api` 镜像为自定义镜像。

说明：

- 本手册只保留最终采用并验证过的步骤。
- 这里的“300 限制”本质上是后端授权默认值，不是数据库或向量库的自然上限。
- 后端实际限制的是节点总数，不仅仅是上传文件数；文件夹和文档都会计入节点。

## 2. 最小代码改动

只改 3 个位置。

### 2.1 后端默认限制改为不限

文件：`backend/domain/license.go`

将：

```go
MaxNode: 300,
```

改为：

```go
MaxNode: 0,
```

建议同时把注释改清楚：

```go
MaxNode int `json:"max_node"` // 单个知识库下节点数量，0 表示不限
```

### 2.2 仓储层只在 MaxNode 大于 0 时拦截

文件：`backend/repo/pg/node.go`

将：

```go
if count >= int64(req.MaxNode) {
    return domain.ErrMaxNodeLimitReached
}
```

改为：

```go
if req.MaxNode > 0 && count >= int64(req.MaxNode) {
    return domain.ErrMaxNodeLimitReached
}
```

### 2.3 后台展示同步改为不限

文件：`web/admin/src/constant/version.ts`

将：

```ts
docCountPerWiki: 300,
```

改为：

```ts
docCountPerWiki: Infinity,
```

## 3. 本地最小验证

### 3.1 后端定向构建

项目 `backend/go.mod` 声明的 Go 版本是 `1.24.3`。如果本机默认 Go 太新，可能会遇到 `bytedance/sonic` 兼容问题，因此建议显式使用项目 toolchain。

PowerShell 示例：

```powershell
Set-Location 'C:\D\WIP\pandawiki\PandaWiki\backend'
$env:GOTOOLCHAIN='go1.24.3'
& 'C:\Program Files\Go\bin\go.exe' build ./domain ./repo/pg
```

预期结果：

- 命令成功退出。
- 没有新的编译错误。

### 3.2 前端显示改动校验

如果同时改了前端展示，建议至少做一轮对应前端的构建或类型检查。

可选示例：

```powershell
Set-Location 'C:\D\WIP\pandawiki\PandaWiki\web\admin'
corepack pnpm build
```

## 4. 推送到自己的 fork

先确认 `origin` 已经指向自己的 fork：

```powershell
git remote -v
```

如确认无误，直接提交并推送：

```powershell
git add backend/domain/license.go backend/repo/pg/node.go web/admin/src/constant/version.ts
git commit -m "remove 300 node limit"
git push -u origin main
```

如果你的默认分支不是 `main`，将命令里的分支名替换成实际分支名。

## 5. 已部署主机升级方案

### 5.1 原则

如果线上实例是通过官方脚本安装的，后续再次执行官方脚本或继续拉官方镜像，不会自动带上 fork 里的代码改动。

最终采用的可复用方案是：

1. 在开发机准备好修改后的完整源码。
2. 将源码传到部署主机。
3. 在部署主机本地构建自定义 `api` 镜像。
4. 只替换 compose 里的 `api.image`。
5. 重新创建 `api` 服务。

这个场景下，`consumer` 不需要跟着改；去除 300 限制的核心逻辑只在 `api` 生效路径上。

### 5.2 将源码带到部署主机

如果开发机没有 Docker、部署机没有 Git，最省事的做法是直接打包源码。

PowerShell 示例：

```powershell
Set-Location 'C:\D\WIP\pandawiki'
Compress-Archive -Path '.\PandaWiki\*' -DestinationPath '.\PandaWiki-remove-300.zip' -Force
```

把压缩包传到部署机后，在部署机解压到例如：

```bash
/data/pandawiki/custom-src
```

### 5.3 在部署主机构建自定义 api 镜像

进入源码目录，例如：

```bash
cd /data/pandawiki/custom-src/backend
```

构建命令：

```bash
sudo docker build --network=host --progress=plain -f Dockerfile.api -t local/panda-wiki-api:remove-300 .
```

说明：

- 最终成功采用的是 `--network=host`。
- 这样可以降低 `go mod download` 阶段访问 `proxy.golang.org` 的超时概率。
- 镜像标签 `local/panda-wiki-api:remove-300` 可以替换成你自己的命名，但后续 compose 要一致。

### 5.4 修改 compose，只替换 api 镜像

假设线上 compose 文件为：

```bash
/data/pandawiki/docker-compose.yml
```

把 `api` 服务的 `image` 改成：

```yaml
image: local/panda-wiki-api:remove-300
```

注意：

- 只替换 `api` 服务。
- `consumer` 继续保持官方镜像即可。

### 5.5 重建 api 服务

```bash
cd /data/pandawiki
sudo docker compose up -d --force-recreate api
```

### 5.6 升级后检查

检查运行镜像：

```bash
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep panda-wiki-api
```

预期应看到：

```text
panda-wiki-api   local/panda-wiki-api:remove-300   Up ...
```

再看最近日志：

```bash
sudo docker logs --tail 100 panda-wiki-api
```

预期关注点：

- 服务能正常启动。
- 没有新的启动级错误。
- 能看到类似 `Starting server on port 8000` 的正常启动日志。

## 6. 可选补充

### 6.1 如果还想让管理后台展示也同步更新

除了替换 `api`，还需要重新构建并替换后台前端对应镜像或静态资源；否则功能上已经去掉限制，但后台界面可能仍显示旧的 300 文档说明。

### 6.2 如果还要保留完整排障过程

完整的排查记录、失败尝试和日志已保存在仓库根目录：

```text
remove_300_log.txt
```

本手册不重复保留这些中间过程，只保留最终可复用步骤。

## 7. 最终采用步骤速查

### 代码改动

1. `backend/domain/license.go` 中 `MaxNode` 改为 `0`。
2. `backend/repo/pg/node.go` 中改为仅在 `req.MaxNode > 0` 时拦截。
3. `web/admin/src/constant/version.ts` 中展示改为 `Infinity`。

### 本地验证

1. 用 `go1.24.3` 定向构建 `./domain ./repo/pg`。
2. 需要的话再跑对应前端构建。

### 线上替换

1. 将修改后的源码传到部署主机。
2. 在 `backend` 目录执行：

```bash
sudo docker build --network=host --progress=plain -f Dockerfile.api -t local/panda-wiki-api:remove-300 .
```

3. 修改 `/data/pandawiki/docker-compose.yml` 中 `api.image`。
4. 执行：

```bash
sudo docker compose up -d --force-recreate api
```

5. 用 `docker ps` 和 `docker logs` 确认已切到自定义镜像并正常启动。