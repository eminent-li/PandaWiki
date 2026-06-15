# PandaWiki Fork 变更汇总与复现说明（截至 7170fbc9）

## 1. 适用范围

- 上游原仓库：`https://github.com/chaitin/PandaWiki.git`
- 本次汇总所依据的 fork：`https://github.com/eminent-li/PandaWiki.git`
- 截止提交：`7170fbc9e0112e166868948cc0c9981a51eee1b7`
- fork 自定义修改的基线提交：`c1981c51b6211c19c3162d6ef2ee32304b1f096d`

说明：

- `c1981c51` 是 `7170fbc9` 与上游 `chaitin/PandaWiki main` 的 merge-base，可视为复现这些自定义修改的起点。
- 本文只覆盖 `c1981c51..7170fbc9` 之间的 fork 自定义提交。
- 不包含 `7170fbc9` 之后的 Docker 相关尝试、回滚和修复提交。

## 2. 总体变更概览

本段 fork 自定义修改共 20 个非 merge 提交，整体差异规模如下：

- 影响文件：67 个
- 新增行数：3931
- 删除行数：691

主要改动面：

1. 去除开源版节点数量限制。
2. 后台文档导入页增强：导入状态展示、文件清单导出、重复导入检查。
3. Qdrant 运行问题排查与文档补充，后端 RAG 重试链路修正。
4. `web/app` 首页改为内嵌问答面板，并逐步切换到 share 聊天接口。
5. 分享问答链路和后端聊天后处理加固。
6. 支持多模态问答图片上传。
7. 为首页问答、文档页、编辑器和挂件补齐中英双语文案与本地化处理。
8. 一系列本地化收尾修复，处理 JSX 缺口、重复内容、类型与占位符问题。

## 3. 按主题汇总

### 3.1 Backend / 业务逻辑

- 放宽开源版节点数量限制，涉及许可证和节点查询逻辑。
- 调整 RAG 消费链路，修复 Qdrant 重试处理。
- 优化分享问答链路的后处理逻辑，补充排查脚本。
- 为问答链路补充图片上传能力，更新应用配置和 LLM 相关逻辑，并新增测试。
- 为问答增加双语化上下文与状态映射支持。

关键文件：

- `backend/domain/license.go`
- `backend/repo/pg/node.go`
- `backend/handler/mq/rag.go`
- `backend/usecase/app.go`
- `backend/usecase/chat.go`
- `backend/usecase/llm.go`
- `backend/usecase/llm_test.go`

### 3.2 Admin 后台

- 文档导入页增加更明确的状态底色、状态徽标和动作区逻辑。
- 增加知识库文件清单导出能力。
- 增加重复导入检测相关交互。
- 同步调整版本号展示。

关键文件：

- `web/admin/src/pages/document/component/AddDocByType/ListRender/Action.tsx`
- `web/admin/src/pages/document/component/AddDocByType/ListRender/Item.tsx`
- `web/admin/src/pages/document/component/AddDocByType/components/StatusBackground.tsx`
- `web/admin/src/pages/document/component/AddDocByType/components/StatusBadge.tsx`
- `web/admin/src/pages/document/component/AddDocByType/index.tsx`
- `web/admin/src/pages/document/layout/DocPageList/DocPageListContainer.tsx`
- `web/admin/src/pages/document/layout/DocPageList/DocPageListContent.tsx`
- `web/admin/src/constant/version.ts`

### 3.3 Web App / 首页问答与挂件

- 首页从原有入口改成内嵌问答工作区，同时保留文档页弹层能力。
- 首页问答切换为走 share 聊天接口。
- 逐步优化首页问答工作区的布局、外观和交互。
- 加强 share 聊天结果后处理，避免异常输出污染界面。
- 支持多模态图片上传。
- 为首页问答和挂件补齐中英双语文案。

关键文件：

- `web/app/src/views/home/HomeInlineQaPanel.tsx`
- `web/app/src/views/home/index.tsx`
- `web/app/src/components/QaModal/AiQaContent.tsx`
- `web/app/src/views/widget/AiQaContent.tsx`
- `web/app/src/views/widget/index.tsx`
- `web/app/src/provider/index.tsx`
- `web/app/src/utils/fetch.ts`
- `web/app/src/locales/qa.ts`

### 3.4 Web App / 文档页与编辑器本地化

- 为登录页、错误页、文档页、目录、评论区、反馈、编辑器工具条和目录补齐双语处理。
- 修复本地化过程中引入的 JSX 语法缺口与重复内容。
- 修复评论区、编辑器目录、占位符初始化和局部类型定义问题。

关键文件：

- `web/app/src/views/node/components/CommentSection.tsx`
- `web/app/src/views/editor/edit/Toc.tsx`
- `web/app/src/components/commentInput/index.tsx`
- `web/app/src/app/not-found.tsx`
- `web/app/src/app/global-error.tsx`
- `web/app/src/views/editor/edit/Wrap.tsx`
- `web/app/src/views/node/DocContent.tsx`

### 3.5 文档与运维材料

- README 增补 Qdrant 相关说明。
- 新增 Qdrant `too many open files` 问题排查文档和 compose override 示例。
- 新增分享聊天日志检查脚本。
- 保留一次 300 相关日志样本，辅助排查分享问答链路。

关键文件：

- `README.md`
- `docs/operations/2026-06-04-qdrant-too-many-open-files.md`
- `docs/operations/docker-compose.qdrant-ulimits.override.yml.example`
- `docs/operations/qdrant-ulimit-compose-snippet.md`
- `scripts/check_share_chat_logs.sh`
- `remove_300_log.txt`

## 4. 提交时间线

以下时间线只列出 `c1981c51..7170fbc9` 范围内的 fork 自定义提交，按提交顺序排列。

| 顺序 | 提交 | 日期 | 说明 | 关键文件 |
| --- | --- | --- | --- | --- |
| 1 | `e3aca052` | 2026-06-01 | 去除开源版节点数量限制 | `backend/domain/license.go`, `backend/repo/pg/node.go`, `web/admin/src/constant/version.ts` |
| 2 | `a5cff0cf` | 2026-06-02 | 增加 KB 文件清单导出和重复导入检查 | `web/admin/src/pages/document/component/AddDocByType/*`, `web/admin/src/pages/document/layout/DocPageList/*` |
| 3 | `0d6c8fee` | 2026-06-04 | 修复 Qdrant 部署说明与 RAG 重试处理 | `backend/handler/mq/rag.go`, `README.md`, `docs/operations/*qdrant*` |
| 4 | `bc6bd39b` | 2026-06-04 | 首页改为内嵌问答并保留文档页弹层 | `web/app/src/views/home/*`, `web/app/src/provider/index.tsx`, `web/app/src/components/header/index.tsx` |
| 5 | `6bde4a3d` | 2026-06-05 | 首页内嵌问答切换到 share 聊天接口 | `web/app/src/views/home/HomeInlineQaPanel.tsx` |
| 6 | `c9c32d2f` | 2026-06-08 | 优化内嵌问答对话流 | `backend/domain/chat.go`, `backend/usecase/chat.go`, `backend/usecase/llm.go`, `web/app/src/components/QaModal/AiQaContent.tsx`, `web/app/src/views/home/HomeInlineQaPanel.tsx` |
| 7 | `4b70d284` | 2026-06-08 | 加固 share chat 后处理 | `backend/usecase/chat.go`, `scripts/check_share_chat_logs.sh` |
| 8 | `3c5a9419` | 2026-06-09 | 扩展首页问答工作区布局 | `web/app/src/components/QaModal/AiQaContent.tsx`, `web/app/src/views/home/HomeInlineQaPanel.tsx` |
| 9 | `bce67741` | 2026-06-09 | 微调首页问答界面样式 | `web/app/src/views/home/HomeInlineQaPanel.tsx` |
| 10 | `6a067f1e` | 2026-06-09 | 移除首页问答发光效果 | `web/app/src/views/home/HomeInlineQaPanel.tsx` |
| 11 | `5ccff268` | 2026-06-10 | 支持多模态问答图片上传 | `backend/usecase/app.go`, `backend/usecase/chat.go`, `backend/usecase/llm.go`, `backend/usecase/llm_test.go`, `web/app/src/components/QaModal/AiQaContent.tsx` |
| 12 | `5b926bae` | 2026-06-10 | 增加双语问答流和文档/编辑器本地化 | `web/app/src/locales/qa.ts`, `web/app/src/views/node/*`, `web/app/src/views/editor/*`, `web/app/src/components/*` |
| 13 | `bf29919a` | 2026-06-10 | 修复本地化 UI 的构建解析错误 | `web/app/src/views/home/HomeInlineQaPanel.tsx`, `web/app/src/views/node/components/CommentSection.tsx` |
| 14 | `5a9d33c6` | 2026-06-10 | 修复本地化组件源码损坏问题 | `web/app/src/views/home/HomeInlineQaPanel.tsx`, `web/app/src/views/node/components/CommentSection.tsx` |
| 15 | `c6aaf3a8` | 2026-06-10 | 补齐首页和评论视图剩余 JSX 缺口 | `web/app/src/views/home/HomeInlineQaPanel.tsx`, `web/app/src/views/node/components/CommentSection.tsx` |
| 16 | `2b49b053` | 2026-06-10 | 移除评论区重复内容 | `web/app/src/views/node/components/CommentSection.tsx` |
| 17 | `b2b90db3` | 2026-06-10 | 使用本地 answer status map 类型 | `web/app/src/components/QaModal/AiQaContent.tsx` |
| 18 | `e57b6d66` | 2026-06-10 | 修复本地化占位符初始化 | `web/app/src/components/commentInput/index.tsx` |
| 19 | `5f18d921` | 2026-06-10 | 补齐编辑器目录本地化 import | `web/app/src/views/editor/edit/Toc.tsx` |
| 20 | `7170fbc9` | 2026-06-10 | 本地化剩余英文挂件标签 | `web/app/src/components/QaModal/AiQaContent.tsx`, `web/app/src/locales/qa.ts`, `web/app/src/views/widget/*` |

## 5. 从原始 GitHub 项目复现这些修改

### 5.1 推荐方式：从上游基线按顺序 cherry-pick

```bash
git clone https://github.com/<your-account>/PandaWiki.git
cd PandaWiki

git remote add upstream https://github.com/chaitin/PandaWiki.git
git remote add eminent-li https://github.com/eminent-li/PandaWiki.git

git fetch upstream
git fetch eminent-li

git switch -c reproduce-7170fbc9 c1981c51b6211c19c3162d6ef2ee32304b1f096d

git cherry-pick \
  e3aca052 \
  a5cff0cf \
  0d6c8fee \
  bc6bd39b \
  6bde4a3d \
  c9c32d2f \
  4b70d284 \
  3c5a9419 \
  bce67741 \
  6a067f1e \
  5ccff268 \
  5b926bae \
  bf29919a \
  5a9d33c6 \
  c6aaf3a8 \
  2b49b053 \
  b2b90db3 \
  e57b6d66 \
  5f18d921 \
  7170fbc9
```

说明：

- 之所以从 `c1981c51` 起步，是因为它已验证为 `7170fbc9` 与上游 `main` 的共同祖先。
- 如果你先把自己 fork 的 `main` 快进到了更晚的上游版本，再 cherry-pick 这些提交，冲突概率会明显上升。
- 如果出现冲突，优先检查 `web/app/src/views/home/HomeInlineQaPanel.tsx`、`web/app/src/components/QaModal/AiQaContent.tsx`、`web/app/src/views/node/components/CommentSection.tsx` 这几个文件，因为它们是集中改动区。

### 5.2 备选方式：直接基于 fork 里的目标提交开分支

如果你不需要逐个理解改动，只需要拿到与本文一致的最终代码状态，可以直接：

```bash
git clone https://github.com/<your-account>/PandaWiki.git
cd PandaWiki

git remote add eminent-li https://github.com/eminent-li/PandaWiki.git
git fetch eminent-li

git switch -c reproduce-7170fbc9 eminent-li/fix/docker-chain
git reset --hard 7170fbc9e0112e166868948cc0c9981a51eee1b7
```

此方式能得到相同代码内容，但不如逐个 `cherry-pick` 透明。

## 6. 复现后校验

完成复现后，建议至少执行以下检查：

```bash
git log --oneline c1981c51..HEAD
git diff --stat c1981c51 HEAD
```

预期结果：

- `git log` 应该能看到 20 个 fork 自定义提交或其等价 cherry-pick 结果。
- `git diff --stat` 应接近 `67 files changed, 3931 insertions(+), 691 deletions(-)`。

如果需要进一步验证运行态，建议继续执行项目原有的构建和测试流程，尤其是：

- `cd backend && go test ./...`
- `cd web && pnpm install`
- `cd web/app && pnpm lint`
- `cd web/admin && pnpm build`

## 7. 受影响文件清单

完整受影响文件如下：

```text
README.md
backend/domain/app.go
backend/domain/chat.go
backend/domain/license.go
backend/handler/mq/rag.go
backend/repo/pg/node.go
backend/usecase/app.go
backend/usecase/chat.go
backend/usecase/llm.go
backend/usecase/llm_test.go
docs/operations/2026-06-04-qdrant-too-many-open-files.md
docs/operations/docker-compose.qdrant-ulimits.override.yml.example
docs/operations/qdrant-ulimit-compose-snippet.md
remove_300_log.txt
scripts/check_share_chat_logs.sh
web/admin/src/constant/version.ts
web/admin/src/pages/document/component/AddDocByType/ListRender/Action.tsx
web/admin/src/pages/document/component/AddDocByType/ListRender/Item.tsx
web/admin/src/pages/document/component/AddDocByType/components/StatusBackground.tsx
web/admin/src/pages/document/component/AddDocByType/components/StatusBadge.tsx
web/admin/src/pages/document/component/AddDocByType/index.tsx
web/admin/src/pages/document/layout/DocPageList/DocPageListContainer.tsx
web/admin/src/pages/document/layout/DocPageList/DocPageListContent.tsx
web/app/src/app/(pages)/(doc)/home/page.tsx
web/app/src/app/(pages)/not-found.tsx
web/app/src/app/global-error.tsx
web/app/src/app/layout.tsx
web/app/src/app/not-found.tsx
web/app/src/assets/type/index.ts
web/app/src/components/QaModal/AiQaContent.tsx
web/app/src/components/QaModal/SearchDocContent.tsx
web/app/src/components/QaModal/index.tsx
web/app/src/components/commentInput/index.tsx
web/app/src/components/docFab/index.tsx
web/app/src/components/docSkeleton/index.tsx
web/app/src/components/emptyDocPlaceholder/index.tsx
web/app/src/components/error/index.tsx
web/app/src/components/feedback/index.tsx
web/app/src/components/header/index.tsx
web/app/src/components/markdown2/index.tsx
web/app/src/locales/qa.ts
web/app/src/provider/index.tsx
web/app/src/request/types.ts
web/app/src/utils/fetch.ts
web/app/src/views/auth/login.tsx
web/app/src/views/editor/edit/AIGenerate.tsx
web/app/src/views/editor/edit/ConfirmModal.tsx
web/app/src/views/editor/edit/Header.tsx
web/app/src/views/editor/edit/Summary.tsx
web/app/src/views/editor/edit/Toc.tsx
web/app/src/views/editor/edit/Wrap.tsx
web/app/src/views/editor/index.tsx
web/app/src/views/feedback/index.tsx
web/app/src/views/h5Chat/index.tsx
web/app/src/views/home/HomeInlineQaPanel.tsx
web/app/src/views/home/index.tsx
web/app/src/views/node/Catalog.tsx
web/app/src/views/node/CatalogH5.tsx
web/app/src/views/node/DocContent.tsx
web/app/src/views/node/NoPermission.tsx
web/app/src/views/node/components/AdjacentDocNav.tsx
web/app/src/views/node/components/CommentSection.tsx
web/app/src/views/node/components/DocMetaInfo.tsx
web/app/src/views/node/folderList.tsx
web/app/src/views/node/index.tsx
web/app/src/views/widget/AiQaContent.tsx
web/app/src/views/widget/index.tsx
```
