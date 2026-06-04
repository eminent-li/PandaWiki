# Qdrant `nofile` 标准 Compose 片段

## 目的

为 `qdrant` 服务显式配置文件描述符上限，避免在 collection 恢复、HTTP/gRPC worker 启动或索引压力较大时出现：

```text
Too many open files
```

该问题会进一步导致：

- 文档学习失败
- 文档重新学习失败
- 知识库问答统一退化为“知识不足”类响应

## 推荐配置

将以下配置添加到 `docker-compose.yml` 中的 `qdrant` 服务下：

```yaml
services:
  qdrant:
    image: chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-qdrant:v1.14.1
    container_name: panda-wiki-qdrant
    restart: always
    ulimits:
      nofile:
        soft: 1048576
        hard: 1048576
    volumes:
      - ./data/qdrant:/qdrant/storage
    environment:
      - QDRANT__SERVICE__API_KEY=${QDRANT_API_KEY}
```

如果已有 `qdrant` 服务定义，只需要补充下面这段：

```yaml
    ulimits:
      nofile:
        soft: 1048576
        hard: 1048576
```

## Override 写法

如果不希望直接修改主 compose 文件，可以新增 override 文件，例如：

```yaml
services:
  qdrant:
    ulimits:
      nofile:
        soft: 1048576
        hard: 1048576
```

随后使用：

```bash
docker compose -f docker-compose.yml -f docker-compose.qdrant-ulimits.override.yml up -d
```

仓库中已有示例文件可直接复用：

- [docs/operations/docker-compose.qdrant-ulimits.override.yml.example](c:\D\WIP\pandawiki\PandaWiki\docs\operations\docker-compose.qdrant-ulimits.override.yml.example)

## 发布侧要求

如果安装流程由外部 `manager.sh` 或其他模板自动生成 `docker-compose.yml`，则必须在生成模板中一并加入该配置。

仅修改运行中的服务器 compose 文件，只能修复单台机器，不能避免后续新部署再次触发同类问题。

## 修改后验证

重建 `qdrant` 服务：

```bash
docker compose up -d --force-recreate qdrant
```

验证：

```bash
docker exec panda-wiki-qdrant sh -c 'ulimit -n'
docker logs --tail=100 panda-wiki-qdrant
```

预期结果：

- `ulimit -n` 为 `1048576`
- 日志中不再出现 `Too many open files`
- 容器状态不再持续重启

## 关联记录

- [docs/operations/2026-06-04-qdrant-too-many-open-files.md](c:\D\WIP\pandawiki\PandaWiki\docs\operations\2026-06-04-qdrant-too-many-open-files.md)
