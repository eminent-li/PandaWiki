import { ITreeItem } from '@/api';
import { type DragTreeHandle } from '@/components/Drag/DragTree';
import { postApiV1NodeRestudy } from '@/request/Node';
import {
  ConstsNodeRagInfoStatus,
  DomainNodeListItemResp,
} from '@/request/types';
import { useAppSelector } from '@/store';
import { collapseAllFolders, convertToTree } from '@/utils/drag';
import { message } from '@ctzhian/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import DocListModals from './DocListModals';
import DocPageListContent from './DocPageListContent';
import type { DocPageListContainerProps } from './types';
import { useDocTreeMenu } from './useDocTreeMenu';
import {
  collectOpenFolderIds,
  findItemInTree,
  removeDeep,
  reopenFolders,
} from './utils';

const CSV_HEADERS = [
  '导航',
  '路径',
  '文件名称',
  '状态',
  '内容类型',
  '创建时间',
  '更新时间',
];

const escapeCsvValue = (value: string) => {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
};

const formatNodeStatus = (status?: number) => {
  if (status === 2) return '已发布';
  if (status === 1) return '草稿';
  return '';
};

const buildNodePathMap = (nodes: DomainNodeListItemResp[]) => {
  const nodeMap = new Map(
    nodes.map(node => [node.id ?? '', node] as const).filter(([id]) => !!id),
  );

  const cache = new Map<string, string>();

  const getPath = (node?: DomainNodeListItemResp): string => {
    if (!node?.id) return '';
    const cached = cache.get(node.id);
    if (cached !== undefined) return cached;

    const names: string[] = [];
    let current: DomainNodeListItemResp | undefined = node;
    const visited = new Set<string>();
    while (current?.id && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.name) {
        names.unshift(current.name);
      }
      current = current.parent_id
        ? nodeMap.get(current.parent_id)
        : undefined;
    }

    const path = names.join('/');
    cache.set(node.id, path);
    return path;
  };

  return getPath;
};

const getParentPath = (
  nodes: DomainNodeListItemResp[],
  getPath: (node?: DomainNodeListItemResp) => string,
  node: DomainNodeListItemResp,
) => {
  if (!node.parent_id) {
    return '';
  }

  return getPath(nodes.find(item => item.id === node.parent_id));
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = ['\uFEFF' + CSV_HEADERS.join(','), ...rows.map(row => row.join(','))].join(
    '\n',
  );
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

const DocPageListContainer = ({
  groups,
  nav_id,
  search,
  refresh,
  wikiUrl,
  loading = false,
  onPublishOpen,
  onRagOpen,
  registerTreeDragHandlers,
}: DocPageListContainerProps) => {
  const { kb_id } = useAppSelector(state => state.config);
  const dragTreeRef = useRef<DragTreeHandle>(null);

  const [supportSelect, setBatchOpen] = useState(false);
  const [list, setList] = useState<DomainNodeListItemResp[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [data, setData] = useState<ITreeItem[]>([]);
  const [opraData, setOpraData] = useState<DomainNodeListItemResp[]>([]);
  const [statusOpen, setStatusOpen] = useState<'delete' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [moreSummaryOpen, setMoreSummaryOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [isBatch, setIsBatch] = useState(false);

  const getOperationData = useCallback(
    (item: ITreeItem): DomainNodeListItemResp[] => {
      const fromList = list.filter(it => it.id === item.id);
      if (fromList.length > 0) return fromList;
      const fromTree = findItemInTree(data, item.id);
      return fromTree ? [fromTree] : [];
    },
    [list, data],
  );

  const handleUrl = useCallback(
    (item: ITreeItem, k: import('@/request/types').ConstsCrawlerSource) => {
      setKey(k);
      setUrlOpen(true);
      setOpraData(getOperationData(item));
    },
    [getOperationData],
  );

  const handleDelete = useCallback(
    (item: ITreeItem) => {
      setDeleteOpen(true);
      setOpraData(getOperationData(item));
    },
    [getOperationData],
  );

  const handlePublish = useCallback(
    (item: ITreeItem) => onPublishOpen([item.id]),
    [onPublishOpen],
  );

  const handleRestudy = useCallback(
    (item: ITreeItem) => {
      const ragStatus = item.rag_status;
      const needModal =
        ragStatus &&
        [
          ConstsNodeRagInfoStatus.NodeRagStatusFailed,
          ConstsNodeRagInfoStatus.NodeRagStatusPending,
        ].includes(ragStatus);
      if (needModal) {
        onRagOpen([item.id]);
      } else {
        postApiV1NodeRestudy({
          kb_id,
          node_ids: [item.id],
        }).then(() => {
          message.success('正在学习');
          refresh();
        });
      }
    },
    [kb_id, refresh, onRagOpen],
  );

  const handleProperties = useCallback(
    (item: ITreeItem) => {
      setPropertiesOpen(true);
      setOpraData(getOperationData(item));
      setIsBatch(false);
    },
    [getOperationData],
  );

  const handleFrontDoc = useCallback(
    (id: string) => {
      const currentNode = list.find(item => item.id === id);
      if (currentNode?.status !== 2 && !currentNode?.publisher_id) {
        message.warning('当前文档未发布，无法查看前台文档');
        return;
      }
      window.open(`${wikiUrl}/node/${id}`, '_blank');
    },
    [list, wikiUrl],
  );

  const menu = useDocTreeMenu({
    handleUrl,
    handleDelete,
    handlePublish,
    handleRestudy,
    handleProperties,
    handleFrontDoc,
  });

  const updateLocalData = useCallback((newData: ITreeItem[]) => {
    setData([...newData]);
  }, []);

  useEffect(() => {
    if (groups.length === 0) {
      setList([]);
      setData([]);
      setSelected([]);
      setOpraData([]);
      setBatchOpen(false);
      return;
    }
    const curGroup = groups.find(g => g.nav_id === nav_id) || groups[0];
    const nodeList = curGroup?.list || [];
    setList(nodeList);
    const openIds = collectOpenFolderIds(data);
    const collapsedAll = collapseAllFolders(convertToTree(nodeList), true);
    const next = openIds.size
      ? reopenFolders(collapsedAll, openIds)
      : collapsedAll;
    setData(next);
    // 切换目录时清空全选数据
    setSelected([]);
    setOpraData([]);
    setBatchOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav_id, groups]);

  const createLocal = useCallback(
    (node: {
      id: string;
      name: string;
      type: 1 | 2;
      emoji?: string;
      content_type?: string;
    }) => {
      setData(prev => [
        ...prev,
        {
          id: node.id,
          name: node.name,
          level: 0,
          order: prev.length ? (prev[prev.length - 1].order ?? 0) + 1 : 0,
          emoji: node.emoji,
          content_type: node.content_type,
          parentId: undefined,
          children: node.type === 1 ? [] : undefined,
          type: node.type,
          status: 1,
        } as ITreeItem,
      ]);
    },
    [],
  );

  const scrollTo = useCallback((id: string) => {
    setTimeout(() => dragTreeRef.current?.scrollToItem(id), 120);
  }, []);

  const setOpraDataFromSelected = useCallback(() => {
    setOpraData(list.filter(item => selected.includes(item.id!)));
  }, [list, selected]);

  const handleExportManifest = useCallback(() => {
    const rows = groups.flatMap(group => {
      const getPath = buildNodePathMap(group.list ?? []);
      return (group.list ?? [])
        .filter(node => node.type === 2)
        .map(node => [
          escapeCsvValue(group.nav_name ?? ''),
          escapeCsvValue(getParentPath(group.list ?? [], getPath, node)),
          escapeCsvValue(node.name ?? ''),
          escapeCsvValue(formatNodeStatus(node.status)),
          escapeCsvValue(node.content_type ?? ''),
          escapeCsvValue(node.created_at ?? ''),
          escapeCsvValue(node.updated_at ?? ''),
        ]);
    });

    if (rows.length === 0) {
      message.warning('当前知识库暂无可导出的文件');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCsv(`kb-file-manifest-${timestamp}.csv`, rows);
  }, [groups]);

  const exportDisabled = !groups.some(group => (group.list?.length ?? 0) > 0);

  return (
    <>
      <DocPageListContent
        data={data}
        list={list}
        search={search}
        loading={loading}
        selected={selected}
        supportSelect={supportSelect}
        menu={menu}
        updateLocalData={updateLocalData}
        onSelectChange={setSelected}
        onBatchOpen={() => setBatchOpen(true)}
        onMoreSummaryOpen={() => {
          setMoreSummaryOpen(true);
          setOpraDataFromSelected();
        }}
        onMoveOpen={() => {
          setMoveOpen(true);
          setOpraDataFromSelected();
        }}
        onDeleteOpen={() => {
          setDeleteOpen(true);
          setOpraDataFromSelected();
        }}
        onPropertiesOpen={() => {
          setPropertiesOpen(true);
          setIsBatch(true);
          setOpraDataFromSelected();
        }}
        onBatchClose={() => {
          setSelected([]);
          setBatchOpen(false);
        }}
        setOpraData={setOpraData}
        dragTreeRef={dragTreeRef}
        refresh={refresh}
        onExportManifest={handleExportManifest}
        exportDisabled={exportDisabled}
        createLocal={createLocal}
        scrollTo={scrollTo}
        registerTreeDragHandlers={registerTreeDragHandlers}
      />
      <DocListModals
        kb_id={kb_id}
        deleteOpen={deleteOpen}
        opraData={opraData}
        data={data}
        list={list}
        dragTreeRef={dragTreeRef}
        importKey={key}
        urlOpen={urlOpen}
        summaryOpen={summaryOpen}
        moreSummaryOpen={moreSummaryOpen}
        statusOpen={statusOpen}
        moveOpen={moveOpen}
        propertiesOpen={propertiesOpen}
        isBatch={isBatch}
        refresh={refresh}
        setData={setData}
        onCloseDelete={() => {
          setDeleteOpen(false);
          setOpraData([]);
          setSelected([]);
          setBatchOpen(false);
        }}
        onCancelAddDoc={() => {
          setUrlOpen(false);
          setOpraData([]);
        }}
        onCloseSummary={() => {
          setSummaryOpen(false);
          setOpraData([]);
        }}
        onCloseMoreSummary={() => {
          setMoreSummaryOpen(false);
          setOpraData([]);
        }}
        onCloseStatus={() => {
          setStatusOpen(null);
          setOpraData([]);
        }}
        onCloseMove={() => {
          setMoveOpen(false);
          setOpraData([]);
        }}
        onCloseProperties={() => {
          setPropertiesOpen(false);
          setOpraData([]);
        }}
        onOkProperties={() => {
          refresh();
          setPropertiesOpen(false);
          setOpraData([]);
        }}
        removeDeep={removeDeep}
      />
    </>
  );
};

export default DocPageListContainer;
