'use client';

import { useStore } from '@/provider';
import {
  alpha,
  Box,
  Button,
  Divider,
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
import { getQaMessages } from '@/locales/qa';

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

interface ConversationHistoryItem {
  id: string;
  subject: string;
  updatedAt: string;
}

const MAX_HISTORY_ITEMS = 8;

const HomeInlineQaPanel = () => {
  const {
    kbDetail,
    language = 'zh-CN',
    mobile,
    homeInlineQaOpen,
    homeInlineQaMode,
    homeInlineQaRequestKey,
    homeInlineQaConversationId,
    triggerHomeInlineQa,
    expandHomeInlineQa,
    setLanguage,
    setHomeInlineQaConversationId,
  } = useStore();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const aiQaInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hasAskInUrl = !!searchParams.get('ask');
  const incomingConversationId = searchParams.get('cid');
  const activeConversationId =
    homeInlineQaConversationId || incomingConversationId || '';
  const hasActiveConversation = !!activeConversationId;
  const visible = !!(homeInlineQaOpen || hasAskInUrl || hasActiveConversation);
  const [searchMode, setSearchMode] = useState<'chat' | 'search'>(
    homeInlineQaMode || 'chat',
  );
  const [historyItems, setHistoryItems] = useState<ConversationHistoryItem[]>(
    [],
  );
  const t = getQaMessages(language);

  const historyStorageKey = useMemo(() => {
    return `panda-wiki-home-conversation-history:${kbDetail?.base_url || kbDetail?.name || 'default'}`;
  }, [kbDetail?.base_url, kbDetail?.name]);

  const placeholder = useMemo(() => {
    if (language === 'en-US') {
      return t.askPlaceholder;
    }
    return (
      kbDetail?.settings?.web_app_custom_style?.header_search_placeholder ||
      t.searchPlaceholder
    );
  }, [kbDetail, language, t.askPlaceholder, t.searchPlaceholder]);

  const hotSearch = useMemo(() => {
    const bannerConfig = kbDetail?.settings?.web_app_landing_configs?.find(
      item => item.type === 'banner',
    );
    return bannerConfig?.banner_config?.hot_search || [];
  }, [kbDetail]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(historyStorageKey);
      if (!stored) {
        setHistoryItems([]);
        return;
      }
      const parsed = JSON.parse(stored) as ConversationHistoryItem[];
      setHistoryItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHistoryItems([]);
    }
  }, [historyStorageKey]);

  const upsertHistoryItem = (conversationId: string, subject: string) => {
    const normalizedSubject = subject.trim();
    if (!conversationId || !normalizedSubject) {
      return;
    }
    const existingIndex = historyItems.findIndex(
      item => item.id === conversationId,
    );
    if (existingIndex >= 0) {
      return;
    }

    const nextItems = [
      {
        id: conversationId,
        subject: normalizedSubject,
        updatedAt: new Date().toISOString(),
      },
      ...historyItems,
    ].slice(0, MAX_HISTORY_ITEMS);

    setHistoryItems(nextItems);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(historyStorageKey, JSON.stringify(nextItems));
    }
  };

  const openHistoryConversation = (conversationId: string) => {
    setHomeInlineQaConversationId?.(conversationId);
    triggerHomeInlineQa?.('chat', { reset: false });
  };

  const handleNewConversation = () => {
    setHomeInlineQaConversationId?.('');
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('ask');
    window.history.replaceState(
      null,
      '',
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );
    triggerHomeInlineQa?.('chat');
  };

  useEffect(() => {
    if (!incomingConversationId || homeInlineQaConversationId) {
      return;
    }

    setHomeInlineQaConversationId?.(incomingConversationId);

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('cid');
    window.history.replaceState(
      null,
      '',
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    );
  }, [
    homeInlineQaConversationId,
    incomingConversationId,
    setHomeInlineQaConversationId,
  ]);

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

  if (!visible) {
    return null;
  }

  if (!homeInlineQaOpen && hasActiveConversation) {
    return (
      <Box
        ref={panelRef}
        sx={{
          width: '100%',
          px: { xs: 2, md: 4 },
          pb: { xs: 4, md: 6 },
        }}
      >
        <Stack
          sx={theme => ({
            maxWidth: 1200,
            mx: 'auto',
            borderRadius: '18px',
            px: { xs: 2, md: 3 },
            py: { xs: 1.5, md: 2 },
            backgroundColor: alpha(theme.palette.background.paper, 0.86),
            border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
            boxShadow: `0 14px 36px ${alpha(theme.palette.common.black, 0.08)}`,
            backdropFilter: 'blur(8px)',
          })}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={1.5}
        >
          <Typography color='text.secondary' sx={{ fontSize: 14 }}>
            {t.collapsedHint}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
            {historyItems.slice(0, 3).map(item => (
              <Button
                key={item.id}
                variant='text'
                color='inherit'
                onClick={() => openHistoryConversation(item.id)}
                sx={{
                  maxWidth: 220,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.subject}
              </Button>
            ))}
            <Button
              variant='outlined'
              onClick={() => expandHomeInlineQa?.()}
              sx={{
                borderRadius: '999px',
                px: 2,
                whiteSpace: 'nowrap',
              }}
            >
              {t.reopenQaPanel}
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      ref={panelRef}
      sx={theme => ({
        width: '100%',
        px: { xs: 1.5, md: 3 },
        py: { xs: 1.5, md: 2.5 },
        position: 'relative',
        overflow: 'hidden',
      })}
    >
      <Box
        sx={theme => ({
          '@media (prefers-reduced-motion: no-preference)': {
            animation:
              'home-inline-qa-fade-in 420ms cubic-bezier(0.22, 1, 0.36, 1)',
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
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 'calc(100vh - 16px)', md: 'calc(100vh - 24px)' },
          height: { xs: 'calc(100vh - 16px)', md: 'calc(100vh - 24px)' },
          position: 'relative',
          background: 'transparent',
        })}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' },
            gap: { xs: 2, md: 2.5 },
            position: 'relative',
            zIndex: 1,
            flex: 1,
            minHeight: 0,
            p: { xs: 1.5, md: 2.5 },
          }}
        >
          <Stack
            sx={theme => ({
              border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}`,
              backgroundColor: alpha(theme.palette.background.default, 0.24),
              backdropFilter: 'blur(14px)',
              borderRadius: { xs: '18px', md: '20px' },
              px: { xs: 1.5, md: 2 },
              pt: { xs: 1.5, md: 2 },
              pb: { xs: 1.5, md: 2 },
              minWidth: 0,
              minHeight: 0,
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
            })}
          >
            <Stack gap={2}>
              <Button
                variant='contained'
                onClick={handleNewConversation}
                sx={{
                  textTransform: 'none',
                  borderRadius: '14px',
                  justifyContent: 'flex-start',
                  px: 2,
                  py: 1.1,
                  fontWeight: 600,
                  boxShadow: 'none',
                }}
              >
                {t.newChat}
              </Button>
              <Stack gap={1}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ px: 0.5, fontWeight: 500 }}
                >
                  {t.history}
                </Typography>
                {historyItems.length === 0 && (
                  <Box
                    sx={{
                      px: 1,
                      py: 1.5,
                      borderRadius: '14px',
                      color: 'text.disabled',
                      bgcolor: theme =>
                        alpha(theme.palette.background.default, 0.46),
                      border: theme =>
                        `1px dashed ${alpha(theme.palette.text.primary, 0.08)}`,
                    }}
                  >
                    <Typography variant='body2' sx={{ fontSize: 13 }}>
                      {t.noHistory}
                    </Typography>
                  </Box>
                )}
                <Stack
                  gap={0.75}
                  sx={{
                    minHeight: 0,
                    overflowY: 'auto',
                    flex: 1,
                    pr: 0.5,
                  }}
                >
                  {historyItems.map(item => (
                    <Button
                      key={item.id}
                      variant='text'
                      color='inherit'
                      onClick={() => openHistoryConversation(item.id)}
                      sx={theme => ({
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        flexDirection: 'column',
                        gap: 0.25,
                        textTransform: 'none',
                        px: 1.25,
                        py: 1.1,
                        borderRadius: '12px',
                        border: `1px solid ${
                          activeConversationId === item.id
                            ? alpha(theme.palette.primary.main, 0.26)
                            : 'transparent'
                        }`,
                        bgcolor:
                          activeConversationId === item.id
                            ? alpha(theme.palette.primary.main, 0.1)
                            : 'transparent',
                        color: 'text.primary',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.background.paper, 0.3),
                          borderColor: alpha(theme.palette.text.primary, 0.08),
                        },
                      })}
                    >
                      <Typography
                        component='span'
                        sx={{
                          width: '100%',
                          textAlign: 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 13,
                          fontWeight:
                            activeConversationId === item.id ? 600 : 500,
                        }}
                      >
                        {item.subject}
                      </Typography>
                      <Typography
                        component='span'
                        color='text.secondary'
                        sx={{ fontSize: 11 }}
                      >
                        {new Date(item.updatedAt).toLocaleString(language, {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Button>
                  ))}
                </Stack>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  gap={1.5}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Button
                    variant={language === 'zh-CN' ? 'contained' : 'outlined'}
                    onClick={() => setLanguage?.('zh-CN')}
                    sx={{
                      borderRadius: '999px',
                      px: 2,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      textTransform: 'none',
                    }}
                  >
                    {t.chinese}
                  </Button>
                  <Button
                    variant={language === 'en-US' ? 'contained' : 'outlined'}
                    onClick={() => setLanguage?.('en-US')}
                    sx={{
                      borderRadius: '999px',
                      px: 2,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      textTransform: 'none',
                    }}
                  >
                    {t.english}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
          <Stack
            sx={{
              minWidth: 0,
              minHeight: 0,
              px: { xs: 1, md: 1.5 },
              pt: { xs: 0, md: 0.5 },
              pb: { xs: 1, md: 1.5 },
              display: 'flex',
              flexDirection: 'column',
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
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent='flex-start'
              gap={1.5}
              sx={{ pb: 2 }}
            >
              <StyledTabs
                value={searchMode}
                onChange={(_, value) => {
                  setSearchMode(value as 'chat' | 'search');
                }}
                variant='scrollable'
                scrollButtons={false}
                sx={{
                  width: 'fit-content',
                  bgcolor: theme => alpha(theme.palette.background.paper, 0.72),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <StyledTab
                  label={
                    <Stack direction='row' gap={0.5} alignItems='center'>
                      <IconZhinengwenda sx={{ fontSize: 16 }} />
                      {!mobile && <span>{t.smartQa}</span>}
                    </Stack>
                  }
                  value='chat'
                />
                <StyledTab
                  label={
                    <Stack direction='row' gap={0.5} alignItems='center'>
                      <IconJinsousuo sx={{ fontSize: 16 }} />
                      {!mobile && <span>{t.searchDocs}</span>}
                    </Stack>
                  }
                  value='search'
                />
              </StyledTabs>
            </Stack>

            <Divider
              sx={{
                borderColor: theme => alpha(theme.palette.text.primary, 0.08),
                mb: 2,
              }}
            />

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: searchMode === 'chat' ? 'flex' : 'none',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <AiQaContent
                key={`home-chat-${homeInlineQaRequestKey}`}
                hotSearch={hotSearch}
                placeholder={placeholder}
                inputRef={aiQaInputRef}
                onConversationResolved={upsertHistoryItem}
                activeConversationId={homeInlineQaConversationId}
                onConversationIdChange={setHomeInlineQaConversationId}
                persistConversationInUrl={false}
                layoutMode='workspace'
              />
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: searchMode === 'search' ? 'flex' : 'none',
                flexDirection: 'column',
                minWidth: 0,
                borderRadius: '18px',
                backgroundColor: theme =>
                  alpha(theme.palette.background.default, 0.22),
                px: { xs: 1.5, md: 3 },
                py: { xs: 1.5, md: 2.5 },
              }}
            >
              <SearchDocContent
                key={`home-search-${homeInlineQaRequestKey}`}
                inputRef={inputRef}
                placeholder={placeholder}
              />
            </Box>

            {!kbDetail?.settings?.conversation_setting
              ?.copyright_hide_enabled && (
              <Box
                sx={{
                  pt: 2,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Typography variant='caption' color='text.disabled'>
                  {kbDetail?.settings?.conversation_setting?.copyright_info ||
                    t.supportBy}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};

export default HomeInlineQaPanel;
