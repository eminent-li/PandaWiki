# 2026-06-04 Qdrant `Too many open files` 故障记录

## 概要

- 故障时间：2026-06-04
- 影响范围：知识库问答检索、文档学习入库、文档重新学习
- 直接现象：
  - 问答统一返回“抱歉，我当前的知识不足以回答这个问题。”
  - 新上传文档学习失败
  - 已有文档重新学习失败

## 现场现象

线上容器状态显示 `panda-wiki-qdrant` 持续重启：

```text
panda-wiki-qdrant ... Restarting (134) ...
```

同时：

- `panda-wiki-api` 正常运行
- `panda-wiki-consumer` 正常运行
- `panda-wiki-raglite` 正常运行
- 大模型排序、对话接口可正常返回结果

这说明故障不在大模型接口本身，而在 RAG 检索和向量存储链路。

## 根因定位

`qdrant` 日志中的关键报错：

```text
called `Result::unwrap()` on an `Err` value: Os { code: 24, kind: Uncategorized, message: "Too many open files" }
```

结论：

- `qdrant` 容器未显式配置 `nofile` 上限
- 容器内可用文件描述符不足，导致 `qdrant` 在恢复 collection 并启动 HTTP/gRPC worker 后 panic
- `qdrant` 崩溃后，`raglite` 无法连接其 gRPC 端口 `6334`
- 文档索引任务重试后失败，最终由 consumer 将节点状态写为 `FAILED`
- 问答检索因为无法从向量库返回结果，最终退化为提示词中定义的“知识不足”响应

## 证据

### 1. Qdrant 容器未配置 `ulimit`

```bash
docker inspect panda-wiki-qdrant --format '{{json .HostConfig.Ulimits}}'
```

输出：

```text
null
```

### 2. 宿主机允许更高的文件句柄上限

```bash
cat /proc/sys/fs/nr_open
```

输出：

```text
1048576
```

### 3. 当前 shell 默认 `ulimit -n` 偏低

```bash
ulimit -n
```

输出：

```text
10240
```

### 4. RAGLite 历史失败日志

```text
rpc error: code = Unavailable desc = connection error: desc = "transport: Error while dialing: dial tcp 169.254.15.14:6334: connect: no route to host"
```

该地址对应 `panda-wiki-qdrant` 的 gRPC 服务地址，说明故障期间 `raglite` 无法连通 `qdrant`。

## 线上修复

在 [docker-compose.yml](c:\D\WIP\pandawiki\PandaWiki\docker-compose.yml) 的 `qdrant` 服务下增加：

```yaml
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

重建 `qdrant` 容器：

```bash
docker compose up -d --force-recreate qdrant
```

## 修复验证

### 1. Qdrant 容器恢复稳定

修复后 `qdrant` 日志不再出现：

- `Too many open files`
- `Aborted (core dumped)`
- 持续重启

### 2. 容器内 `ulimit -n` 生效

```bash
docker exec panda-wiki-qdrant sh -c 'ulimit -n'
```

输出：

```text
1048576
```

### 3. 业务恢复

- 知识库问答恢复正常
- 文档上传后可正常学习入库
- 失败文档可重新学习成功

## 代码侧补充修复

除线上运维修复外，代码侧已同步修复一个会放大同类故障的问题：

- 文件：[backend/handler/mq/rag.go](c:\D\WIP\pandawiki\PandaWiki\backend\handler\mq\rag.go)
- 修复内容：向量任务 consumer 在调用 RAG 失败时，不再吞掉错误并返回 `nil`
- 目的：避免 JetStream 将失败消息误判为已成功处理并直接 ack，导致任务静默丢失、无法重试

该修复不能替代基础设施恢复，但可以降低未来同类异常的影响范围。

## 后续建议

1. 保持 `qdrant` 容器的 `nofile` 显式配置，不依赖默认值。
2. 增加对 `qdrant` 容器状态的监控，重点关注持续重启与 gRPC `6334` 不可达。
3. 对 `raglite` 的 `CollectionExists`、`dial tcp ...:6334` 等错误增加告警。
4. 统一 API 与 consumer 的部署版本，避免跨版本运行带来的兼容风险。
5. 对故障期间失败的文档执行一次批量重新学习，确保向量数据补齐。
6. 将 `qdrant` 的 `nofile` 配置固化到安装模板或 compose 生成逻辑中，可参考 [docs/operations/qdrant-ulimit-compose-snippet.md](c:\D\WIP\pandawiki\PandaWiki\docs\operations\qdrant-ulimit-compose-snippet.md)。
