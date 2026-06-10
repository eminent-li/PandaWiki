'use client';

import noDocImage from '@/assets/images/no-doc.png';
import { getQaMessages } from '@/locales/qa';
import { useStore } from '@/provider';
import { Box, Stack } from '@mui/material';
import Image from 'next/image';

interface EmptyDocPlaceholderProps {
  mobile?: boolean;
}

const EmptyDocPlaceholder = ({ mobile = false }: EmptyDocPlaceholderProps) => {
  const { language = 'zh-CN' } = useStore();
  const t = getQaMessages(language);

  return (
    <Stack
      justifyContent='center'
      alignItems='center'
      gap={2}
      sx={{
        flex: 1,
        pt: '50px',
        pb: 10,
        px: mobile ? 5 : 0,
      }}
    >
      <Image
        src={noDocImage}
        alt={t.noDocumentsAlt}
        width={mobile ? 280 : 380}
      />
      <Box sx={{ fontSize: 14, color: 'text.tertiary' }}>
        {t.noDocumentsMessage}
      </Box>
    </Stack>
  );
};

export default EmptyDocPlaceholder;
