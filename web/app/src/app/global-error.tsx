'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';
import ErrorPng from '@/assets/images/500.png';
import Footer from '@/components/footer';
import { getQaMessages, QaLanguage } from '@/locales/qa';
import { lightTheme } from '@/theme';
import { Box, Stack } from '@mui/material';
import { ThemeProvider } from '@ctzhian/ui';
import Image from 'next/image';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [language, setLanguage] = useState<QaLanguage>('zh-CN');

  useEffect(() => {
    // 只在生产环境下上报错误到 Sentry
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error);
    }
  }, [error]);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem('PANDA_WIKI_LANGUAGE');
    if (storedLanguage === 'en-US' || storedLanguage === 'zh-CN') {
      setLanguage(storedLanguage);
    }
  }, []);

  const t = getQaMessages(language);

  return (
    <html lang='en'>
      <body>
        <ThemeProvider theme={lightTheme}>
          <Box
            sx={{
              position: 'relative',
              pt: 28,
              height: '100vh',
            }}
          >
            <Stack
              sx={{
                maxWidth: 1200,
                overflow: 'auto',
                pb: 6,
                mx: 'auto',
              }}
              justifyContent='center'
              alignItems='center'
            >
              <Image
                src={ErrorPng}
                unoptimized
                alt='404'
                width={380}
                height={200}
              />
              <Stack
                gap={3}
                alignItems='center'
                sx={{ color: 'text.tertiary', fontSize: 14, mt: 3 }}
              >
                {t.pageError} {error.digest}
              </Stack>
            </Stack>

            <Box
              sx={{
                height: 40,
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
              }}
            >
              <Footer showBrand={false} />
            </Box>
          </Box>
        </ThemeProvider>
      </body>
    </html>
  );
}
