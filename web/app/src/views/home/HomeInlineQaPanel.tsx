'use client';

import { useStore } from '@/provider';
import {
  alpha,
  Box,
  Button,
  Chip,
  Stack,
  styled,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { IconJinsousuo, IconZhinengwenda } from '@panda-wiki/icons';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import AiQaContent from '@/components/QaModal/AiQaContent';
import SearchDocContent from '@/components/QaModal/SearchDocContent';

const StyledTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 'auto',
  position: 'relative',
  borderRadius: '10px',
  padding: theme.spacing(0.5),
  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
  '& .MuiTabs-indicator': {
    height: '100%',
    borderRadius: '8px',
    backgroundColor: theme.palette.primary.main,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 0,
  },
  '& .MuiTabs-flexContainer': {
    gap: theme.spacing(0.5),
    position: 'relative',
    zIndex: 1,
  },
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: 'auto',
  padding: theme.spacing(0.75, 2),
  borderRadius: '6px',
  backgroundColor: 'transparent',
  fontSize: 12,
  fontWeight: 400,
  textTransform: 'none',
  transition: 'color 0.3s ease-in-out',
  position: 'relative',
  zIndex: 1,
  lineHeight: 1,
  '&:hover': {
    color: theme.palette.text.primary,
  },
  '&.Mui-selected': {
    color: theme.palette.primary.contrastText,
    fontWeight: 500,
  },
}));

const HomeInlineQaPanel = () => {
  const {
    kbDetail,
    mobile,
    homeInlineQaOpen,
    homeInlineQaMode,
    homeInlineQaRequestKey,
    closeHomeInlineQa,
  } = useStore();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const aiQaInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hasUrlConversation = !!(
    searchParams.get('ask') || searchParams.get('cid')
  );
  const visible = !!(homeInlineQaOpen || hasUrlConversation);
  const [searchMode, setSearchMode] = useState<'chat' | 'search'>(
    homeInlineQaMode || 'chat',
  );

  const placeholder = useMemo(() => {
    return (
      kbDetail?.settings?.web_app_custom_style?.header_search_placeholder ||
      '搜索...'
    );
  }, [kbDetail]);

  const hotSearch = useMemo(() => {
    const bannerConfig = kbDetail?.settings?.web_app_landing_configs?.find(
      item => item.type === 'banner',
    );
    return bannerConfig?.banner_config?.hot_search || [];
  }, [kbDetail]);

  useEffect(() => {
    if (homeInlineQaMode) {
      setSearchMode(homeInlineQaMode);
    }
  }, [homeInlineQaMode, homeInlineQaRequestKey]);

  useEffect(() => {
    if (!visible) return;
    const panelTop = panelRef.current?.getBoundingClientRect().top;
    if (panelTop === undefined) return;

    const topOffset = window.innerWidth < 900 ? 88 : 108;
    const targetTop = window.scrollY + panelTop - topOffset;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: 'smooth',
    });
  }, [visible, homeInlineQaRequestKey]);

  useEffect(() => {
    if (!visible) return;
    setTimeout(() => {
      if (searchMode === 'chat') {
        aiQaInputRef.current?.querySelector('textarea')?.focus();
      } else {
        inputRef.current?.querySelector('input')?.focus();
      }
    }, 100);
  }, [visible, searchMode, homeInlineQaRequestKey]);

  const handleClose = () => {
    closeHomeInlineQa?.();
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('ask');
    currentUrl.searchParams.delete('cid');
    window.history.replaceState(
      null,
      '',
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Box
      ref={panelRef}
      sx={theme => ({
        width: '100%',
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 7 },
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '10% auto auto 8%',
          width: { xs: 180, md: 260 },
          height: { xs: 180, md: 260 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          right: '6%',
          bottom: '2%',
          width: { xs: 220, md: 320 },
          height: { xs: 220, md: 320 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.12)} 0%, transparent 68%)`,
          pointerEvents: 'none',
        },
      })}
    >
      <Box
        sx={theme => ({
          '@media (prefers-reduced-motion: no-preference)': {
            animation: 'home-inline-qa-fade-in 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          },
          '@keyframes home-inline-qa-fade-in': {
            '0%': {
              opacity: 0,
              transform: 'translateY(32px) scale(0.985)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0) scale(1)',
            },
          },
          maxWidth: 1200,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 600, md: 720 },
          position: 'relative',
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          backdropFilter: 'blur(10px)',
          borderRadius: { xs: '22px', md: '28px' },
          boxShadow: `0 28px 80px ${alpha(theme.palette.common.black, 0.1)}`,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 35%, transparent 65%, ${alpha(theme.palette.secondary.main, 0.06)} 100%)`,
            pointerEvents: 'none',
          },
        })}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent='space-between'
          gap={2}
          sx={{
            px: { xs: 2, md: 4 },
            pt: { xs: 2.5, md: 4 },
            pb: { xs: 2, md: 2.5 },
            position: 'relative',
            zIndex: 1,
            '@media (prefers-reduced-motion: no-preference)': {
              animation:
                'home-inline-qa-rise-in 520ms cubic-bezier(0.22, 1, 0.36, 1)',
            },
            '@keyframes home-inline-qa-rise-in': {
              '0%': {
                opacity: 0,
                transform: 'translateY(18px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <Stack gap={1}>
            <Chip
              label='AI Assistant'
              color='primary'
              size='small'
              sx={{
                width: 'fit-content',
                borderRadius: '999px',
                px: 0.5,
                fontWeight: 600,
              }}
            />
            <Typography
              variant='h5'
              sx={{
                fontSize: { xs: 24, md: 34 },
                lineHeight: 1.15,
                fontWeight: 700,
                maxWidth: 560,
              }}
            >
              在首页直接发起问答与文档检索
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ maxWidth: 620, fontSize: { xs: 14, md: 15 } }}
            >
              顶部搜索和 Banner 搜索都会落在这里，连续追问、查看答案和切换文档检索都留在当前页面完成。
            </Typography>
          </Stack>
          <StyledTabs
            value={searchMode}
            onChange={(_, value) => {
              setSearchMode(value as 'chat' | 'search');
            }}
            variant='scrollable'
            scrollButtons={false}
            sx={{
              bgcolor: theme => alpha(theme.palette.background.paper, 0.72),
              backdropFilter: 'blur(10px)',
            }}
          >
            <StyledTab
              label={
                <Stack direction='row' gap={0.5} alignItems='center'>
                  <IconZhinengwenda sx={{ fontSize: 16 }} />
                  {!mobile && <span>智能问答</span>}
                </Stack>
              }
              value='chat'
            />
            <StyledTab
              label={
                <Stack direction='row' gap={0.5} alignItems='center'>
                  <IconJinsousuo sx={{ fontSize: 16 }} />
                  {!mobile && <span>仅搜索文档</span>}
                </Stack>
              }
              value='search'
            />
          </StyledTabs>
        </Stack>
        <Stack
          direction='row'
          justifyContent='flex-end'
          sx={{
            px: { xs: 2, md: 4 },
            pb: { xs: 1, md: 0 },
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Button
            variant='text'
            color='inherit'
            onClick={handleClose}
            sx={{
              borderRadius: '999px',
              color: 'text.secondary',
              px: 1.5,
              '&:hover': {
                bgcolor: theme => alpha(theme.palette.text.primary, 0.05),
              },
            }}
          >
            收起问答区
          </Button>
        </Stack>
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            pb: { xs: 2, md: 4 },
            flex: 1,
            display: searchMode === 'chat' ? 'flex' : 'none',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1,
            '@media (prefers-reduced-motion: no-preference)': {
              animation:
                'home-inline-qa-content-in 620ms cubic-bezier(0.22, 1, 0.36, 1)',
            },
            '@keyframes home-inline-qa-content-in': {
              '0%': {
                opacity: 0,
                transform: 'translateY(24px)',
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <AiQaContent
            key={`home-chat-${homeInlineQaRequestKey}`}
            hotSearch={hotSearch}
            placeholder={placeholder}
            inputRef={aiQaInputRef}
          />
        </Box>
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            pb: { xs: 2, md: 4 },
            flex: 1,
            display: searchMode === 'search' ? 'flex' : 'none',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1,
            '@media (prefers-reduced-motion: no-preference)': {
              animation:
                'home-inline-qa-content-in 620ms cubic-bezier(0.22, 1, 0.36, 1)',
            },
          }}
        >
          <SearchDocContent
            key={`home-search-${homeInlineQaRequestKey}`}
            inputRef={inputRef}
            placeholder={placeholder}
          />
        </Box>
        {!kbDetail?.settings?.conversation_setting?.copyright_hide_enabled && (
          <Box
            sx={{
              px: { xs: 2, md: 4 },
              pb: { xs: 2.5, md: 3.5 },
              display: 'flex',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Typography variant='caption' color='text.disabled'>
              {kbDetail?.settings?.conversation_setting?.copyright_info ||
                '本网站由 PandaWiki 提供技术支持'}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HomeInlineQaPanel;