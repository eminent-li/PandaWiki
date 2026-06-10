import { V1NodeDetailResp } from '@/request';
import { getQaMessages } from '@/locales/qa';
import { useStore } from '@/provider';
import { Button, CircularProgress, Stack, TextField } from '@mui/material';
import { Modal } from '@ctzhian/ui';
import { useEffect, useState } from 'react';
import { useWrapContext } from '..';
import { IconDJzhinengzhaiyao } from '@panda-wiki/icons';

interface SummaryProps {
  open: boolean;
  onClose: () => void;
  updateDetail: (detail: V1NodeDetailResp) => void;
}

const Summary = ({ open, onClose, updateDetail }: SummaryProps) => {
  const { language = 'zh-CN' } = useStore();
  const t = getQaMessages(language);
  const { nodeDetail } = useWrapContext();
  const [summary, setSummary] = useState(nodeDetail?.meta?.summary || '');
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(false);

  const handleClose = () => {
    setEdit(false);
    setSummary('');
    onClose();
  };

  const createSummary = () => {
    if (!nodeDetail) return;
    setLoading(true);
    // postApiV1NodeSummary({ kb_id, ids: [nodeDetail.id!] })
    //   .then(res => {
    //     // @ts-expect-error 类型错误
    //     setSummary(res.summary);
    //     setEdit(true);
    //   })
    //   .finally(() => {
    //     setLoading(false);
    //   });
  };

  useEffect(() => {
    if (open) {
      setSummary(nodeDetail?.meta?.summary || '');
    }
  }, [open, nodeDetail]);

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={t.smartSummary}
      okText={t.save}
      okButtonProps={{
        disabled: loading || !edit,
      }}
      onOk={() => {
        if (!nodeDetail) return;
        updateDetail({
          meta: {
            ...nodeDetail?.meta,
            summary,
          },
        });
        // putApiV1NodeDetail({ id: nodeDetail.id!, kb_id, summary }).then(() => {
        //   message.success('保存成功');
        // });
        handleClose();
      }}
    >
      <Stack gap={2}>
        <TextField
          autoFocus
          multiline
          disabled={loading}
          rows={10}
          fullWidth
          value={summary}
          onChange={e => {
            setSummary(e.target.value);
            setEdit(true);
          }}
          placeholder={t.enterSummary}
        />
        <Button
          fullWidth
          variant='outlined'
          onClick={createSummary}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={16} />
            ) : (
              <IconDJzhinengzhaiyao sx={{ fontSize: 16 }} />
            )
          }
        >
          {t.aiGenerateSummary}
        </Button>
      </Stack>
    </Modal>
  );
};

export default Summary;
