'use client';
import aiLoading from '@/assets/images/ai-loading.gif';
import Logo from '@/assets/images/logo.png';
import { ChunkResultItem } from '@/assets/type';
import Feedback from '@/components/feedback';
import { IconCopy } from '@/components/icons';
import MarkDown2 from '@/components/markdown2';
import { useBasePath, useSmartScroll } from '@/hooks';
import { getQaMessages } from '@/locales/qa';
import { useStore } from '@/provider';
import { postShareV1ChatFeedback } from '@/request/ShareChat';
import { getShareV1ConversationDetail } from '@/request/ShareConversation';
import { postShareV1CommonFileUpload } from '@/request/ShareFile';
import { copyText } from '@/utils';
import SSEClient, { SSEHttpError } from '@/utils/fetch';
import { Image as ImagePreview, message } from '@ctzhian/ui';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconADiancaiWeixuanzhong2,
  IconDiancaiWeixuanzhong,
  IconDianzanWeixuanzhong,
  IconDianzanXuanzhong1,
  IconFasong,
  IconTupian,
  IconXinduihua,
  IconXingxing,
} from '@panda-wiki/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatLoading from '../../views/chat/ChatLoading';
import {
  StyledActionButtonStack,
  StyledActionStack,
  StyledAiBubble,
  StyledAiBubbleContent,
  StyledChunkAccordion,
  StyledChunkAccordionDetails,
  StyledChunkAccordionSummary,
  StyledChunkItem,
  StyledConversationContainer,
  StyledConversationItem,
  StyledFuzzySuggestionItem,
  StyledFuzzySuggestionsStack,
  StyledHotSearchColumn,
  StyledHotSearchColumnItem,
  StyledHotSearchContainer,
  StyledImagePreviewItem,
  StyledImagePreviewStack,
  StyledImageRemoveButton,
  StyledInputContainer,
  StyledInputWrapper,
  StyledMainContainer,
  StyledTextField,
  StyledThinkingAccordion,
  StyledThinkingAccordionDetails,
  StyledThinkingAccordionSummary,
  StyledUserBubble,
} from './StyledComponents';
import { handleThinkingContent } from './utils';

import { getImagePath } from '@/utils/getImagePath';

export interface ConversationItem {
  image_paths: string[];
  q: string;
  a: string;
  score: number;
  update_time: string;
  message_id: string;
  source: 'history' | 'chat';
  chunk_result: ChunkResultItem[];
  result_expend: boolean;
  thinking_expend: boolean;
  thinking_content: string;
  id: string;
}

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const getAnswerStatus = (t: ReturnType<typeof getQaMessages>) => ({
  1: t.searching,
  2: t.thinking,
  3: t.answering,
  4: '',
});

type AnswerStatusMap = ReturnType<typeof getAnswerStatus>;

const MAX_HISTORY_CONTEXT_TURNS = 3;
const MAX_HISTORY_CONTEXT_CHARS = 4000;

const trimContextText = (text: string, maxChars: number) => {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}...`;
};

const buildHistoryContextMessage = (
  items: ConversationItem[],
  question: string,
  t: ReturnType<typeof getQaMessages>,
) => {
  const historyItems = items
    .filter(item => item.source === 'history')
    .slice(-MAX_HISTORY_CONTEXT_TURNS);

  if (historyItems.length === 0) {
    return question;
  }

  const contextBlocks = historyItems.map((item, index) => {
    const answer = item.a || item.thinking_content || '';
    return [
      `第${index + 1}轮问题：${item.q}`,
      `第${index + 1}轮回答：${trimContextText(answer, 1200)}`,
    ].join('\n');
  });

  const contextText = trimContextText(
    contextBlocks.join('\n\n'),
    MAX_HISTORY_CONTEXT_CHARS,
  );

  return [
    t.inheritHistoryPrefix,
    t.inheritHistoryHint,
    '',
    t.historyConversation,
    contextText,
    '',
    `${t.currentFollowUp}${question}`,
  ].join('\n');
};

const LoadingContent = ({
  thinking,
  answerStatus,
}: {
  thinking: keyof AnswerStatusMap;
  answerStatus: AnswerStatusMap;
}) => {
  if (thinking === 4 || thinking === 2) return null;
  return (
    <Stack direction='row' alignItems='center' gap={1} sx={{ pb: 1 }}>
      <Image
        src={aiLoading}
        alt='ai-loading'
        unoptimized
        width={20}
        height={20}
      />
      <Typography
        variant='body2'
        sx={theme => ({
          fontSize: 12,
          color: alpha(theme.palette.text.primary, 0.5),
        })}
      >
        {answerStatus[thinking]}
      </Typography>
    </Stack>
  );
};

const AiQaContent: React.FC<{
  hotSearch: string[];
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onConversationResolved?: (conversationId: string, subject: string) => void;
  activeConversationId?: string;
  onConversationIdChange?: (conversationId?: string) => void;
  persistConversationInUrl?: boolean;
  layoutMode?: 'modal' | 'workspace';
}> = ({
  hotSearch,
  placeholder,
  inputRef,
  onConversationResolved,
  activeConversationId,
  onConversationIdChange,
  persistConversationInUrl = true,
  layoutMode = 'modal',
}) => {
  const sseClientRef = useRef<SSEClient<{
    type: string;
    content: string;
    chunk_result: ChunkResultItem;
  }> | null>(null);
  const { palette } = useTheme();
  const messageIdRef = useRef('');
  const lastResultExpendRef = useRef(false);
  const [fullAnswer, setFullAnswer] = useState<string>('');
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState<keyof typeof AnswerStatus>(4);
  const [nonce, setNonce] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [conversationItem, setConversationItem] =
    useState<ConversationItem | null>(null);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{
      id: string;
      url: string;
      file: File;
    }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fuzzySuggestions, setFuzzySuggestions] = useState<string[]>([]);
  const [showFuzzySuggestions, setShowFuzzySuggestions] = useState(false);
  const lastResolvedConversationRef = useRef('');
  const loadingHistoryConversationRef = useRef('');
  const loadedHistoryConversationRef = useRef('');
  const loadingRef = useRef(false);
  const conversationIdRef = useRef('');
  const nonceRef = useRef('');
  const shouldDecorateCancelRef = useRef(false);
  const onConversationResolvedRef = useRef(onConversationResolved);
  const onConversationIdChangeRef = useRef(onConversationIdChange);

  const searchParams = useSearchParams();
  const basePath = useBasePath();
  const urlConversationId = searchParams.get('cid');

  // 使用智能滚动 hook（内置 ResizeObserver 自动监听内容高度变化，自动滚动）
  const { setShouldAutoScroll } = useSmartScroll({
    container: '.conversation-container',
    behavior: 'smooth',
  });

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    nonceRef.current = nonce;
  }, [nonce]);

  useEffect(() => {
    onConversationResolvedRef.current = onConversationResolved;
  }, [onConversationResolved]);

  useEffect(() => {
    onConversationIdChangeRef.current = onConversationIdChange;
  }, [onConversationIdChange]);

  const onReset = () => {
    if (loading) {
      handleSearchAbort();
    }
    handleSearch(true);
    loadingHistoryConversationRef.current = '';
    loadedHistoryConversationRef.current = '';
    setConversationId('');
    conversationIdRef.current = '';
    onConversationIdChangeRef.current?.('');
    setConversation([]);
    setFullAnswer('');
    setInput('');
    // 清理图片URL
    uploadedImages.forEach(img => {
      if (img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
    setUploadedImages([]);
    setLoading(false);
    setNonce('');
    nonceRef.current = '';
  };

  const handleSearch = (reset: boolean = false) => {
    if (input.length > 0 || uploadedImages.length > 0) {
      onSearch(input, reset);
    }
  };

  const onSuggestionClick = (text: string) => {
    setInput('');
    onSearch(text);
  };

  // 处理图片选择（支持多张）
  const handleImageSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxImages = 3;
    const remainingSlots = maxImages - uploadedImages.length;
    if (remainingSlots <= 0) {
      message.warning(t.uploadLimit.replace('{count}', String(maxImages)));
      return;
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    try {
      const newImages: Array<{
        id: string;
        url: string;
        file: File;
      }> = [];

      for (const file of filesToAdd) {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          message.error(t.onlyImageAllowed);
          continue;
        }

        // 验证文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          message.error(t.imageTooLarge);
          continue;
        }

        // 创建本地预览 URL
        const localUrl = URL.createObjectURL(file);

        newImages.push({
          id: Date.now().toString() + Math.random(),
          url: localUrl,
          file,
        });
      }

      const updatedImages = [...uploadedImages, ...newImages];
      setUploadedImages(updatedImages);
    } catch (error: any) {
      message.error(error.message || t.uploadFailed);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!supportImages) {
      message.info(uploadDisabledReason);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    handleImageSelect(event.target.files);
    // 重置 input value 以允许上传相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (id: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === id);
    if (imageToRemove && imageToRemove.url.startsWith('blob:')) {
      // 释放本地 URL
      URL.revokeObjectURL(imageToRemove.url);
    }

    const updatedImages = uploadedImages.filter(img => img.id !== id);
    setUploadedImages(updatedImages);
  };

  // 处理粘贴上传
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!supportImages) {
      return;
    }
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      const dataTransfer = new DataTransfer();
      imageFiles.forEach(file => dataTransfer.items.add(file));
      await handleImageSelect(dataTransfer.files);
    }
  };

  // 处理输入变化，显示模糊搜索建议
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // if (value.trim().length > 0) {
    //   // 改进的模糊搜索逻辑
    //   const filtered = mockFuzzySuggestions
    //     .filter(suggestion => {
    //       const lowerSuggestion = suggestion.toLowerCase();
    //       const lowerValue = value.toLowerCase();
    //       // 支持前缀匹配和包含匹配
    //       return (
    //         lowerSuggestion.startsWith(lowerValue) ||
    //         lowerSuggestion.includes(lowerValue)
    //       );
    //     })
    //     .slice(0, 5); // 限制显示数量

    //   setFuzzySuggestions(filtered);
    //   setShowFuzzySuggestions(true);
    // } else {
    //   setShowFuzzySuggestions(false);
    //   setFuzzySuggestions([]);
    // }
  };

  // 选择模糊搜索建议
  const handleFuzzySuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowFuzzySuggestions(false);
    setFuzzySuggestions([]);
  };

  // 高亮显示匹配的文本
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    // 转义特殊字符，避免正则表达式错误
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      // 检查是否匹配（不区分大小写）
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <Box
            component='span'
            key={index}
            sx={{
              color: 'primary.main',
            }}
          >
            {part}
          </Box>
        );
      }
      return part;
    });
  };

  // 处理输入框失去焦点
  const handleInputBlur = () => {
    // 延迟隐藏，让用户有时间点击建议
    setTimeout(() => {
      setShowFuzzySuggestions(false);
    }, 200);
  };

  // 处理输入框获得焦点
  const handleInputFocus = () => {
    if (input.trim().length > 0) {
      setShowFuzzySuggestions(true);
    }
  };

  // 上传所有图片到服务器
  const uploadAllImages = async (): Promise<string[]> => {
    if (uploadedImages.length === 0) return [];

    const uploadedUrls: string[] = [];

    try {
      for (const image of uploadedImages) {
        let token = '';
        try {
          const Cap = (await import(`@cap.js/widget`)).default;
          const cap = new Cap({
            apiEndpoint: `${basePath}/share/v1/captcha/`,
          });
          const solution = await cap.solve();
          token = solution.token;
        } catch (error) {
          message.error(t.verifyFailed);
          return Promise.reject(error);
        }
        // 上传新图片
        const result = await postShareV1CommonFileUpload({
          file: image.file,
          captcha_token: token,
        });
        const serverUrl = '/static-file/' + result.key;
        uploadedUrls.push(serverUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      setLoading(false);
      message.error(error.message || t.uploadFailed);
      throw error;
    }
  };

  const chatAnswer = async (q: string, questionOverride?: string) => {
    setLoading(true);
    setThinking(1);

    const imagePaths = await uploadAllImages();

    let token = '';

    const Cap = (await import(`@cap.js/widget`)).default;
    const cap = new Cap({
      apiEndpoint: `${basePath}/share/v1/captcha/`,
    });
    try {
      const solution = await cap.solve();
      token = solution.token;
    } catch (error) {
      setLoading(false);
      setThinking(4);
      message.error(t.verifyFailed);
      return;
    }

    const reqData = {
      message: q,
      question_override: questionOverride,
      image_paths: imagePaths,
      nonce: '',
      conversation_id: '',
      app_type: 1,
      captcha_token: token,
      language,
    };
    const currentConversationId = conversationIdRef.current;
    const currentNonce = nonceRef.current;

    if (currentConversationId) reqData.conversation_id = currentConversationId;
    if (currentNonce) reqData.nonce = currentNonce;

    if (sseClientRef.current) {
      sseClientRef.current.subscribe(
        JSON.stringify(reqData),
        ({ type, content, chunk_result }) => {
          if (type === 'conversation_id') {
            conversationIdRef.current += content;
            setConversationId(prev => prev + content);
          } else if (type === 'message_id') {
            messageIdRef.current += content;
          } else if (type === 'nonce') {
            nonceRef.current += content;
            setNonce(prev => prev + content);
          } else if (type === 'error') {
            setLoading(false);
            setThinking(4);
            setConversation(prev => {
              const newConversation = [...prev];
              const lastConversation =
                newConversation[newConversation.length - 1];
              if (lastConversation) {
                lastConversation.a =
                  lastConversation.a +
                  (content
                    ? `\n\n${t.answerError}: <error>${content}</error>`
                    : `\n\n${t.answerErrorRetry}`);
              }
              return newConversation;
            });
            if (content) message.error(content);
          } else if (type === 'done') {
            setConversation(prev => {
              const newConversation = [...prev];
              const lastConversation =
                newConversation[newConversation.length - 1];
              if (lastConversation) {
                lastConversation.update_time = dayjs().format(
                  'YYYY-MM-DD HH:mm:ss',
                );
                lastConversation.message_id = messageIdRef.current;
                lastConversation.source = 'chat';
              }
              return newConversation;
            });

            setFullAnswer('');
            setLoading(false);

            setThinking(4);
          } else if (type === 'data') {
            setFullAnswer(prevFullAnswer => {
              const newFullAnswer = prevFullAnswer + content;

              const { thinkingContent, answerContent } =
                handleThinkingContent(newFullAnswer);

              // 更新状态
              if (newFullAnswer.includes('</think>')) {
                setThinking(3);
              } else if (newFullAnswer.includes('<think>')) {
                setThinking(2);
              } else {
                setThinking(3);
              }
              setConversation(preConversation => {
                const newConversation = [...preConversation];
                const lastConversation =
                  newConversation[newConversation.length - 1];
                if (lastConversation) {
                  lastConversation.a = answerContent;
                  lastConversation.thinking_content = thinkingContent;
                  lastConversation.result_expend = lastResultExpendRef.current;
                  lastConversation.thinking_expend = false;
                }
                return newConversation;
              });

              return newFullAnswer;
            });
          } else if (type === 'chunk_result') {
            setConversation(preConversation => {
              const newConversation = [...preConversation];
              const lastConversation =
                newConversation[newConversation.length - 1];
              if (lastConversation) {
                lastConversation.chunk_result = [
                  ...lastConversation.chunk_result,
                  chunk_result,
                ];
              }
              return newConversation;
            });
          }
        },
      );
    }
  };

  useEffect(() => {
    // @ts-ignore
    window.CAP_CUSTOM_WASM_URL =
      window.location.origin + `${basePath}/cap@0.0.6/cap_wasm.min.js`;
  }, []);

  const onSearch = (q: string, reset: boolean = false) => {
    if (loading || (!q.trim() && uploadedImages.length === 0)) return;
    setShouldAutoScroll(true); // 开始新搜索时，重置为自动滚动
    const shouldStartFreshFromHistory =
      conversation.some(item => item.source === 'history') && !nonceRef.current;
    const outboundQuestion = shouldStartFreshFromHistory
      ? buildHistoryContextMessage(conversation, q, t)
      : q;

    if (shouldStartFreshFromHistory) {
      loadingHistoryConversationRef.current = '';
      loadedHistoryConversationRef.current = '';
      setConversationId('');
      conversationIdRef.current = '';
      onConversationIdChangeRef.current?.('');
      setNonce('');
      nonceRef.current = '';
    }

    loadingHistoryConversationRef.current = '';
    loadedHistoryConversationRef.current = '';
    const newConversation = reset ? [] : [...conversation];
    lastResultExpendRef.current = false;
    newConversation.push({
      image_paths: uploadedImages.map(img => img.url),
      q,
      a: '',
      score: 0,
      message_id: '',
      update_time: '',
      source: 'chat',
      chunk_result: [],
      thinking_content: '',
      result_expend: true,
      thinking_expend: true,
      id: uuidv4(),
    });
    messageIdRef.current = '';
    setConversation(newConversation);
    setFullAnswer('');
    setTimeout(() => {
      chatAnswer(q, shouldStartFreshFromHistory ? outboundQuestion : undefined);
      setInput('');
      setUploadedImages([]);
    }, 0);
  };

  const handleSearchAbort = (shouldDecorateCancel: boolean = false) => {
    shouldDecorateCancelRef.current = shouldDecorateCancel;
    sseClientRef.current?.unsubscribe();
    setLoading(false);
    setThinking(4);
  };

  const {
    mobile = false,
    kbDetail,
    qaModalOpen,
    language = 'zh-CN',
  } = useStore();
  const isWorkspaceLayout = layoutMode === 'workspace';
  const hasConversation = conversation.length > 0;
  const t = getQaMessages(language);
  const answerStatus = getAnswerStatus(t);
  const supportImages = kbDetail?.support_images ?? false;
  const uploadDisabledReason = t.uploadUnsupported;
  const composerPlaceholder =
    language === 'en-US' ? t.askPlaceholder : placeholder || t.askPlaceholder;

  useEffect(() => {
    dayjs.locale(language === 'en-US' ? 'en' : 'zh-cn');
  }, [language]);

  const isFeedbackEnabled =
    // @ts-ignore
    kbDetail?.settings?.ai_feedback_settings?.is_enabled ?? true;

  const handleScore = async (
    message_id: string,
    score: number,
    type?: string,
    content?: string,
  ) => {
    const data: any = {
      conversation_id: conversationId,
      message_id,
      score,
    };
    if (type) data.type = type;
    if (content) data.feedback_content = content;
    await postShareV1ChatFeedback(data);
    message.success(t.feedbackSuccess);
    setConversation(
      conversation.map(item => {
        return item.message_id === message_id ? { ...item, score } : item;
      }),
    );
  };

  useEffect(() => {
    sseClientRef.current = new SSEClient({
      url: `${basePath}/share/v1/chat/message`,
      headers: {
        'Content-Type': 'application/json',
      },
      onComplete: () => {
        setLoading(false);
        setThinking(4);
      },
      onError: error => {
        setLoading(false);
        setThinking(4);
        if (error instanceof SSEHttpError && error.status === 401) {
          const current = window.location;
          window.location.href = `${basePath}/auth/login?redirect=${encodeURIComponent(current.pathname + current.search)}`;
          return;
        }
        message.error(error.message || t.requestFailed);
      },
      onCancel: () => {
        setLoading(false);
        setThinking(4);
        if (!shouldDecorateCancelRef.current) {
          shouldDecorateCancelRef.current = false;
          return;
        }
        shouldDecorateCancelRef.current = false;
        setConversation(prev => {
          const newConversation = [...prev];
          const lastConversation = newConversation[newConversation.length - 1];
          if (lastConversation) {
            lastConversation.a =
              lastConversation.a + `\n\n<error>${t.requestCanceled}</error>`;
            lastConversation.update_time = dayjs().format(
              'YYYY-MM-DD HH:mm:ss',
            );
            lastConversation.message_id = messageIdRef.current;
          }
          return newConversation;
        });
      },
    });
    const searchQuery =
      sessionStorage.getItem('chat_search_query') || searchParams.get('ask');
    if (searchQuery) {
      sessionStorage.removeItem('chat_search_query');
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('ask');
      window.history.replaceState(null, '', newSearchParams.toString());
      onSearch(searchQuery, true);
    }
    return () => {
      handleSearchAbort();
      if (persistConversationInUrl) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete('cid');
        currentUrl.searchParams.delete('ask');
        window.history.replaceState(null, '', currentUrl.toString());
      }
      setTimeout(() => {
        onReset();
      });
    };
  }, []);

  useEffect(() => {
    if (conversationId) {
      onConversationIdChangeRef.current?.(conversationId);
      if (persistConversationInUrl) {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('cid', conversationId);
        currentUrl.searchParams.delete('ask');
        window.history.replaceState(null, '', currentUrl.toString());
      }
    }
  }, [conversationId, persistConversationInUrl]);

  useEffect(() => {
    const subject = conversation.find(item => item.q?.trim())?.q?.trim();
    if (!conversationId || !subject) {
      return;
    }
    if (lastResolvedConversationRef.current === conversationId) {
      return;
    }
    lastResolvedConversationRef.current = conversationId;
    onConversationResolvedRef.current?.(conversationId, subject);
  }, [conversationId, conversation]);

  useEffect(() => {
    const cid = activeConversationId || urlConversationId;
    if (!cid) {
      return;
    }
    if (
      activeConversationId &&
      activeConversationId === conversationIdRef.current
    ) {
      return;
    }
    if (loadingHistoryConversationRef.current === cid) {
      return;
    }
    if (
      loadedHistoryConversationRef.current === cid &&
      conversationIdRef.current === cid
    ) {
      return;
    }

    loadingHistoryConversationRef.current = cid;
    loadedHistoryConversationRef.current = '';

    if (loadingRef.current) {
      handleSearchAbort();
    }

    setConversationId(cid);
    conversationIdRef.current = cid;
    setFullAnswer('');
    setNonce('');
    nonceRef.current = '';
    setThinking(4);
    setLoading(false);
    setConversation([]);

    const historyConversation: ConversationItem[] = [];
    getShareV1ConversationDetail({
      id: cid,
    }).then(res => {
      if (loadingHistoryConversationRef.current !== cid) {
        return;
      }
      if (res.messages) {
        let current: Partial<ConversationItem> = {
          chunk_result: [],
        };
        res.messages.forEach(message => {
          if (message.role === 'user') {
            current = {
              image_paths: message.image_paths || [],
              q: message.content,
              chunk_result: [],
            };
          } else if (message.role === 'assistant') {
            if (
              current.q ||
              (current.image_paths && current.image_paths.length > 0)
            ) {
              const { thinkingContent, answerContent } = handleThinkingContent(
                message.content || '',
              );
              current.a = answerContent;
              current.update_time = message.created_at;
              current.score = 0;
              current.message_id = '';
              current.thinking_content = thinkingContent;
              current.source = 'history';
              current.id = uuidv4();
              historyConversation.push(current as ConversationItem);
              current = {};
            }
          }
        });
        if (
          current.q ||
          (current.image_paths && current.image_paths.length > 0)
        ) {
          historyConversation.push({
            image_paths: current.image_paths || [],
            q: current.q || '',
            a: '',
            score: 0,
            update_time: '',
            message_id: '',
            source: 'history',
            chunk_result: [],
            thinking_content: '',
            id: uuidv4(),
            result_expend: true,
            thinking_expend: true,
          });
        }
      }
      loadedHistoryConversationRef.current = cid;
      loadingHistoryConversationRef.current = '';
      setConversationId(cid);
      conversationIdRef.current = cid;
      setConversation(historyConversation);
      if (res.subject) {
        lastResolvedConversationRef.current = cid;
        onConversationResolvedRef.current?.(cid, res.subject);
      }
      setShouldAutoScroll(false);
    });
  }, [activeConversationId, urlConversationId, setShouldAutoScroll]);

  useEffect(() => {
    if (!qaModalOpen) {
      conversation.forEach(item => {
        item.image_paths.forEach(image => {
          if (image.startsWith('blob:')) {
            URL.revokeObjectURL(image);
          }
        });
      });
    }
  }, [qaModalOpen, conversation]);

  return (
    <StyledMainContainer
      className={palette.mode === 'dark' ? 'md-dark' : ''}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      {/* 无对话时显示欢迎界面 */}
      {!hasConversation && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateRows: isWorkspaceLayout ? '1fr auto' : '1fr',
            alignItems: 'center',
            gap: isWorkspaceLayout ? 3 : 4,
            px: isWorkspaceLayout ? { xs: 1, md: 3 } : 0,
            pt: isWorkspaceLayout ? { xs: 2, md: 5 } : 0,
            pb: isWorkspaceLayout ? { xs: 2, md: 3 } : 5,
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: isWorkspaceLayout ? 1120 : '100%',
              mx: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isWorkspaceLayout ? 5 : 4,
            }}
          >
            {/* Logo区域 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                my: isWorkspaceLayout ? { xs: 2, md: 4 } : 8,
              }}
            >
              <Image
                src={getImagePath(kbDetail?.settings?.icon || Logo.src, basePath)}
                alt='logo'
                width={46}
                height={46}
                unoptimized
                style={{
                  objectFit: 'contain',
                }}
              />
              <Typography
                variant='h6'
                sx={{
                  fontSize: isWorkspaceLayout ? { xs: 28, md: 44 } : 32,
                  color: 'text.primary',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                {kbDetail?.settings?.title}
              </Typography>
            </Box>

            {/* 热门搜索区域 */}
            {hotSearch.length > 0 && (
              <Box sx={{ width: '100%', maxWidth: isWorkspaceLayout ? 1120 : '100%' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <IconXingxing sx={{ fontSize: 14 }} />
                    {t.hotSearchTitle}
                  </Typography>
                </Box>

                {/* 热门搜索列表 - 两列布局 */}
                <StyledHotSearchContainer
                  sx={
                    isWorkspaceLayout
                      ? {
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            md: 'repeat(2, minmax(0, 1fr))',
                          },
                          gap: 2,
                        }
                      : undefined
                  }
                >
                  {/* 左列 */}
                  <StyledHotSearchColumn
                    sx={
                      isWorkspaceLayout
                        ? {
                            px: 2,
                            py: 2,
                            borderLeft: 'none',
                            borderRadius: '18px',
                            backgroundColor: theme =>
                              alpha(theme.palette.background.default, 0.34),
                            border: theme =>
                              `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
                            gap: 1.25,
                          }
                        : undefined
                    }
                  >
                    {hotSearch
                      .filter((_, index) => index % 2 === 0)
                      .map((suggestion, index) => (
                        <StyledHotSearchColumnItem
                          key={index * 2}
                          onClick={() => onSuggestionClick(suggestion)}
                          sx={
                            isWorkspaceLayout
                              ? {
                                  minHeight: 40,
                                  px: 1,
                                  borderRadius: '12px',
                                  fontSize: 14,
                                  color: 'text.primary',
                                  backgroundColor: theme =>
                                    alpha(
                                      theme.palette.background.paper,
                                      0.38,
                                    ),
                                  '&:hover': {
                                    color: 'primary.main',
                                    backgroundColor: theme =>
                                      alpha(theme.palette.primary.main, 0.08),
                                  },
                                }
                              : undefined
                          }
                        >
                          • {suggestion}
                        </StyledHotSearchColumnItem>
                      ))}
                  </StyledHotSearchColumn>

                  {/* 右列 */}
                  <StyledHotSearchColumn
                    sx={
                      isWorkspaceLayout
                        ? {
                            px: 2,
                            py: 2,
                            borderLeft: 'none',
                            borderRadius: '18px',
                            backgroundColor: theme =>
                              alpha(theme.palette.background.default, 0.34),
                            border: theme =>
                              `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
                            gap: 1.25,
                          }
                        : undefined
                    }
                  >
                    {hotSearch
                      .filter((_, index) => index % 2 === 1)
                      .map((suggestion, index) => (
                        <StyledHotSearchColumnItem
                          key={index * 2 + 1}
                          onClick={() => onSuggestionClick(suggestion)}
                          sx={
                            isWorkspaceLayout
                              ? {
                                  minHeight: 40,
                                  px: 1,
                                  borderRadius: '12px',
                                  fontSize: 14,
                                  color: 'text.primary',
                                  backgroundColor: theme =>
                                    alpha(
                                      theme.palette.background.paper,
                                      0.38,
                                    ),
                                  '&:hover': {
                                    color: 'primary.main',
                                    backgroundColor: theme =>
                                      alpha(theme.palette.primary.main, 0.08),
                                  },
                                }
                              : undefined
                          }
                        >
                          • {suggestion}
                        </StyledHotSearchColumnItem>
                      ))}
                  </StyledHotSearchColumn>
                </StyledHotSearchContainer>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* 有对话时显示对话历史 */}
      <StyledConversationContainer
        direction='column'
        className='conversation-container'
        sx={{
          mb: hasConversation ? 2 : 0,
          display: hasConversation ? 'flex' : 'none',
          flex: 1,
          minHeight: 0,
          maxHeight: 'none',
          px: isWorkspaceLayout ? { xs: 1, md: 2 } : 0,
          py: isWorkspaceLayout ? { xs: 1, md: 2 } : 0,
        }}
      >
        <Stack gap={2} sx={{ width: '100%', maxWidth: 980, mx: 'auto' }}>
          {conversation.map((item, index) => (
            <StyledConversationItem key={item.id}>
              {item.image_paths.length > 0 && (
                <ImagePreview.PreviewGroup>
                  <Stack direction='row' gap={1} sx={{ alignSelf: 'flex-end' }}>
                    {item.image_paths.map((url: string) => (
                      <ImagePreview
                        alt={url}
                        key={url}
                        src={getImagePath(url, basePath)}
                        width={100}
                        height={100}
                        style={{
                          borderRadius: '10px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                        referrerPolicy='no-referrer'
                      />
                    ))}
                  </Stack>
                </ImagePreview.PreviewGroup>
              )}

              {/* 用户问题气泡 - 右对齐 */}
              {item.q && <StyledUserBubble>{item.q}</StyledUserBubble>}
              {/* AI回答气泡 - 左对齐 */}
              <StyledAiBubble>
                {/* 搜索结果 */}
                {item.chunk_result.length > 0 && (
                  <StyledChunkAccordion
                    expanded={item.result_expend}
                    onChange={(event, expanded) => {
                      setConversation(prev => {
                        const newConversation = [...prev];
                        if (index === conversation.length - 1) {
                          lastResultExpendRef.current = expanded;
                        }
                        newConversation[index].result_expend = expanded;
                        return newConversation;
                      });
                    }}
                  >
                    <StyledChunkAccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                    >
                      <Typography
                        variant='body2'
                        sx={theme => ({
                          fontSize: 12,
                          color: alpha(theme.palette.text.primary, 0.5),
                        })}
                      >
                        {t.resultsFound.replace(
                          '{count}',
                          String(item.chunk_result.length),
                        )}
                      </Typography>
                    </StyledChunkAccordionSummary>

                    <StyledChunkAccordionDetails>
                      <Stack gap={1} alignItems='flex-start'>
                        {item.chunk_result.map((chunk, chunkIndex) => (
                          <StyledChunkItem key={chunkIndex}>
                            <Typography
                              variant='body2'
                              className='hover-primary'
                              sx={theme => ({
                                fontSize: 12,
                                color: alpha(theme.palette.text.primary, 0.5),
                              })}
                              onClick={() => {
                                window.open(
                                  `${basePath}/node/${chunk.node_id}`,
                                  '_blank',
                                );
                              }}
                            >
                              {chunk.name}
                            </Typography>
                          </StyledChunkItem>
                        ))}
                      </Stack>
                    </StyledChunkAccordionDetails>
                  </StyledChunkAccordion>
                )}

                {/* 加载状态 */}
                {index === conversation.length - 1 && loading && (
                  <LoadingContent
                    thinking={thinking}
                    answerStatus={answerStatus}
                  />
                )}

                {/* 思考过程 */}
                {!!item.thinking_content && (
                  <StyledThinkingAccordion
                    expanded={item.thinking_expend}
                    onChange={(event, expanded) => {
                      setConversation(prev => {
                        const newConversation = [...prev];
                        newConversation[index].thinking_expend = expanded;
                        return newConversation;
                      });
                    }}
                  >
                    <StyledThinkingAccordionSummary
                      expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />}
                    >
                      <Stack direction='row' alignItems='center' gap={1}>
                        {thinking === 2 &&
                          index === conversation.length - 1 && (
                            <Image
                              src={aiLoading}
                              alt='ai-loading'
                              width={20}
                              height={20}
                            />
                          )}

                        <Typography
                          variant='body2'
                          sx={theme => ({
                            fontSize: 12,
                            color: alpha(theme.palette.text.primary, 0.5),
                          })}
                        >
                          {thinking === 2 && index === conversation.length - 1
                            ? t.thinking
                            : t.thoughtDone}
                        </Typography>
                      </Stack>
                    </StyledThinkingAccordionSummary>

                    <StyledThinkingAccordionDetails>
                      <MarkDown2
                        content={item.thinking_content || ''}
                        autoScroll={false}
                      />
                    </StyledThinkingAccordionDetails>
                  </StyledThinkingAccordion>
                )}

                {/* AI回答内容 */}
                <StyledAiBubbleContent>
                  <MarkDown2
                    content={item.a}
                    autoScroll={false}
                    loading={index === conversation.length - 1 && loading}
                  />
                </StyledAiBubbleContent>

                {/* 操作按钮 */}
                {(index !== conversation.length - 1 || !loading) && (
                  <StyledActionStack
                    direction={mobile ? 'column' : 'row'}
                    alignItems={mobile ? 'flex-start' : 'center'}
                    justifyContent='space-between'
                    gap={mobile ? 1 : 3}
                  >
                    <Stack direction='row' gap={3} alignItems='center'>
                      <span>
                        {t.generatedAt} {dayjs(item.update_time).fromNow()}
                      </span>

                      <IconCopy
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          copyText(item.a);
                        }}
                      />

                      {isFeedbackEnabled && item.source === 'chat' && (
                        <>
                          {item.score === 1 && (
                            <IconDianzanXuanzhong1 sx={{ cursor: 'pointer' }} />
                          )}
                          {item.score !== 1 && (
                            <IconDianzanWeixuanzhong
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (item.score === 0)
                                  handleScore(item.message_id, 1);
                              }}
                            />
                          )}
                          {item.score !== -1 && (
                            <IconDiancaiWeixuanzhong
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (item.score === 0) {
                                  setConversationItem(item);
                                  setOpen(true);
                                }
                              }}
                            />
                          )}
                          {item.score === -1 && (
                            <IconADiancaiWeixuanzhong2
                              sx={{ cursor: 'pointer' }}
                            />
                          )}
                        </>
                      )}
                    </Stack>
                    <Box>
                      {kbDetail?.settings?.disclaimer_settings?.content}
                    </Box>
                  </StyledActionStack>
                )}
              </StyledAiBubble>
            </StyledConversationItem>
          ))}
        </Stack>
      </StyledConversationContainer>
      {hasConversation && (
        <Button
          variant='contained'
          sx={theme => ({
            textTransform: 'none',
            minWidth: 'auto',
            px: 3.5,
            py: '2px',
            gap: 0.5,
            fontSize: 12,
            backgroundColor: 'background.default',
            color: 'text.primary',
            boxShadow: `0px 1px 2px 0px ${alpha(theme.palette.text.primary, 0.06)}`,
            border: '1px solid',
            borderColor: alpha(theme.palette.text.primary, 0.1),
            cursor: 'pointer',
            '&:hover': {
              boxShadow: `0px 1px 2px 0px ${alpha(theme.palette.text.primary, 0.06)}`,
              borderColor: 'primary.main',
              color: 'primary.main',
            },
            mb: 2,
            alignSelf: isWorkspaceLayout ? 'center' : 'flex-start',
          })}
          onClick={onReset}
        >
          <IconXinduihua sx={{ fontSize: 14 }} />
          新会话
        </Button>
      )}

      <StyledInputContainer
        sx={{
          width: '100%',
          maxWidth: isWorkspaceLayout ? 980 : '100%',
          mx: isWorkspaceLayout ? 'auto' : 0,
          mt: isWorkspaceLayout ? 'auto' : 0,
          pb: isWorkspaceLayout ? { xs: 1, md: 2 } : 0,
          px: isWorkspaceLayout ? { xs: 1, md: 2 } : 0,
        }}
      >
        <StyledInputWrapper
          sx={
            isWorkspaceLayout
              ? {
                  px: { xs: 2, md: 2.5 },
                  py: { xs: 1.5, md: 2 },
                  borderRadius: '22px',
                  backgroundColor: theme =>
                    alpha(theme.palette.background.default, 0.68),
                  borderColor: theme => alpha(theme.palette.text.primary, 0.12),
                  boxShadow: theme =>
                    `0px 18px 40px 0px ${alpha(theme.palette.common.black, 0.18)}`,
                }
              : undefined
          }
        >
          {/* 多张图片预览 */}
          {uploadedImages.length > 0 && (
            <StyledImagePreviewStack direction='row' flexWrap='wrap' gap={1}>
              {uploadedImages.map(image => (
                <StyledImagePreviewItem key={image.id}>
                  <Image
                    src={image.url}
                    alt='uploaded'
                    width={40}
                    height={40}
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                  <StyledImageRemoveButton
                    size='small'
                    onClick={() => handleRemoveImage(image.id)}
                  >
                    <CloseIcon sx={{ fontSize: 10 }} />
                  </StyledImageRemoveButton>
                </StyledImagePreviewItem>
              ))}
            </StyledImagePreviewStack>
          )}
          <StyledTextField
            fullWidth
            multiline
            rows={2}
            disabled={loading}
            ref={inputRef}
            size='small'
            value={input}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onPaste={handlePaste}
            onKeyDown={e => {
              const isComposing =
                e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                (input.length > 0 || uploadedImages.length > 0) &&
                !isComposing
              ) {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={composerPlaceholder}
            autoComplete='off'
            sx={
              isWorkspaceLayout
                ? {
                    '.MuiInputBase-root': {
                      height: '84px !important',
                      alignItems: 'flex-start',
                    },
                    textarea: {
                      fontSize: 16,
                      lineHeight: 1.7,
                      paddingTop: '8px',
                    },
                  }
                : undefined
            }
          />
          <StyledActionButtonStack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
          >
            <input
              ref={fileInputRef}
              type='file'
              accept='.jpg,.jpeg,.png,.webp'
              multiple
              style={{ display: 'none' }}
              disabled={!supportImages}
              onChange={handleImageUpload}
            />
            <Tooltip
              title={supportImages ? '' : uploadDisabledReason}
              disableHoverListener={supportImages}
            >
              <span>
                <IconButton
                  size='small'
                  onClick={() => {
                    if (!supportImages) {
                      message.info(uploadDisabledReason);
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={loading || !supportImages}
                  sx={{
                    flexShrink: 0,
                  }}
                >
                  <IconTupian sx={{ fontSize: 20, color: 'text.secondary' }} />
                </IconButton>
              </span>
            </Tooltip>

            <Box
              sx={{
                fontSize: 12,
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              {loading ? (
                <ChatLoading
                  thinking={thinking}
                  onClick={() => {
                    setThinking(4);
                    handleSearchAbort(true);
                  }}
                />
              ) : (
                <IconButton
                  size='small'
                  disabled={input.length === 0 && uploadedImages.length === 0}
                  onClick={() => {
                    if (input.length > 0 || uploadedImages.length > 0) {
                      handleSearchAbort();
                      setThinking(1);
                      handleSearch();
                    }
                  }}
                >
                  <IconFasong
                    sx={{
                      fontSize: 16,
                      color:
                        input.length > 0 || uploadedImages.length > 0
                          ? 'primary.main'
                          : 'text.disabled',
                    }}
                  />
                </IconButton>
              )}
            </Box>
          </StyledActionButtonStack>
        </StyledInputWrapper>
      </StyledInputContainer>
      {/* 模糊搜索建议列表 */}
      {showFuzzySuggestions &&
        fuzzySuggestions.length > 0 &&
        conversation.length === 0 && (
          <StyledFuzzySuggestionsStack gap={0.5}>
            {fuzzySuggestions.map((suggestion, index) => (
              <StyledFuzzySuggestionItem
                key={index}
                onClick={() => handleFuzzySuggestionClick(suggestion)}
              >
                {highlightMatch(suggestion, input)}
              </StyledFuzzySuggestionItem>
            ))}
          </StyledFuzzySuggestionsStack>
        )}

      <Feedback
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleScore}
        data={conversationItem}
      />
    </StyledMainContainer>
  );
};

export default AiQaContent;
