import React from 'react';
import { Stack } from '@mui/material';
import Image from 'next/image';

import { getQaMessages } from '@/locales/qa';
import NoPermissionImg from '@/assets/images/no-permission.png';
import { useStore } from '@/provider';

const NoPermission = ({ catalogShow }: { catalogShow: boolean }) => {
  const { catalogWidth, mobile, language = 'zh-CN' } = useStore();
  const t = getQaMessages(language);
  return (
    <Stack
      style={{
        marginLeft: catalogShow ? `${catalogWidth!}px` : '16px',
        width: `calc(100% - ${catalogShow ? catalogWidth! : 16}px - 0px)`,
        ...(mobile && {
          width: '100%',
          marginLeft: 0,
        }),
      }}
      sx={{
        height: 'calc(100vh - 220px)',
      }}
      justifyContent='center'
      alignItems='center'
    >
      <Image
        src={NoPermissionImg.src}
        alt='404'
        width={380}
        height={255}
        style={{
          ...(mobile && { width: 200, height: 130 }),
        }}
      />
      <Stack
        gap={3}
        alignItems='center'
        sx={{ color: 'text.tertiary', fontSize: 14, mt: 3 }}
      >
        {t.noPermission}
      </Stack>
    </Stack>
  );
};

export default NoPermission;
