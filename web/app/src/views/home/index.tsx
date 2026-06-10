'use client';

import { Banner } from '@panda-wiki/ui';
import dynamic from 'next/dynamic';
import { DomainRecommendNodeListResp } from '@/request/types';
import { getQaMessages, QaLanguage } from '@/locales/qa';
import { convertToTree } from '@/utils/tree';
import { useStore } from '@/provider';
import { useBasePath } from '@/hooks';
import { getImagePath } from '@/utils/getImagePath';

type HomeFallbackMessages = ReturnType<typeof getHomeFallbackMessages>;

const getHomeFallbackMessages = (language: QaLanguage) => {
  const t = getQaMessages(language);

  return {
    linkGroup: t.linkGroup,
    basicDocCard: t.basicDocCard,
    noSummary: t.noSummary,
    folderCard: t.folderCard,
    navCard: t.navCard,
    simpleDocCard: t.simpleDocCard,
    carousel: t.carousel,
    heading: t.heading,
    caseCard: t.caseCard,
    metricsCard: t.metricsCard,
    featureCard: t.featureCard,
    imageTextLeft: t.imageTextLeft,
    imageTextRight: t.imageTextRight,
    commentCard: t.commentCard,
    blockGrid: t.blockGrid,
    commonQuestions: t.commonQuestions,
  };
};

const handleFaqProps = (
  config: any = {},
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.linkGroup,
    items:
      config.list?.map((item: any) => ({
        question: item.question,
        url: item.link,
      })) || [],
  };
};

const handleBasicDocProps = (
  config: any = {},
  docs: DomainRecommendNodeListResp[],
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.basicDocCard,
    basePath,
    items:
      docs?.map(item => ({
        ...item,
        summary: item.summary || messages.noSummary,
      })) || [],
  };
};

const handleDirDocProps = (
  config: any = {},
  docs: DomainRecommendNodeListResp[],
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.folderCard,
    basePath,
    items:
      docs?.map(item => ({
        id: item.id,
        name: item.name,
        ...item,
        recommend_nodes: [...(item.recommend_nodes || [])].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        ),
      })) || [],
  };
};

const handleNavDocProps = (
  config: any = {},
  docs: DomainRecommendNodeListResp[],
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.navCard,
    basePath,
    items:
      docs?.map(item => ({
        id: item.id,
        name: item.name,
        ...item,
        // @ts-ignore
        list: convertToTree(item.recommend_nodes || []),
      })) || [],
  };
};

const handleSimpleDocProps = (
  config: any = {},
  docs: DomainRecommendNodeListResp[],
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.simpleDocCard,
    basePath,
    items:
      docs?.map(item => ({
        ...item,
      })) || [],
  };
};

const handleCarouselProps = (
  config: any = {},
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.carousel,
    items:
      config.list?.map((item: any) => ({
        id: item.id,
        title: item.title,
        url: getImagePath(item.url, basePath),
        desc: item.desc,
      })) || [],
  };
};

const handleBannerProps = (config: any = {}, basePath: string) => {
  return {
    title: {
      text: config.title,
    },
    subtitle: {
      text: config.subtitle,
    },
    bg_url: getImagePath(config.bg_url, basePath),
    search: {
      placeholder: config.placeholder,
      hot: config.hot_search,
    },
  };
};

const handleTextProps = (config: any = {}, messages: HomeFallbackMessages) => {
  return {
    title: config.title || messages.heading,
  };
};

const handleCaseProps = (config: any = {}, messages: HomeFallbackMessages) => {
  return {
    title: config.title || messages.caseCard,
    items: config.list || [],
  };
};

const handleMetricsProps = (
  config: any = {},
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.metricsCard,
    items: config.list || [],
  };
};

const handleFeatureProps = (
  config: any = {},
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.featureCard,
    items: config.list || [],
  };
};

const handleImgTextProps = (
  config: any = {},
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.imageTextLeft,
    item: {
      ...config.item,
      url: getImagePath(config.item?.url, basePath),
    },
    direction: 'row',
  };
};

const handleTextImgProps = (
  config: any = {},
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.imageTextRight,
    item: {
      ...config.item,
      url: getImagePath(config.item?.url, basePath),
    },
    direction: 'row-reverse',
  };
};

const handleCommentProps = (
  config: any = {},
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.commentCard,
    items:
      config.list?.map((item: any) => ({
        ...item,
        avatar: getImagePath(item.avatar, basePath),
      })) || [],
  };
};

const handleBlockGridProps = (
  config: any = {},
  basePath: string,
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.blockGrid,
    basePath,
    items:
      config.list?.map((item: any) => ({
        ...item,
        url: getImagePath(item.url, basePath),
      })) || [],
  };
};

const handleQuestionProps = (
  config: any = {},
  messages: HomeFallbackMessages,
) => {
  return {
    title: config.title || messages.commonQuestions,
    items: config.list || [],
  };
};

const componentMap = {
  banner: Banner,
  basic_doc: dynamic(() => import('@panda-wiki/ui').then(mod => mod.BasicDoc)),
  dir_doc: dynamic(() => import('@panda-wiki/ui').then(mod => mod.DirDoc)),
  simple_doc: dynamic(() =>
    import('@panda-wiki/ui').then(mod => mod.SimpleDoc),
  ),
  carousel: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Carousel)),
  faq: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Faq)),
  text: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Text)),
  nav_doc: dynamic(() => import('@panda-wiki/ui').then(mod => mod.NavDoc)),
  case: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Case)),
  metrics: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Metrics)),
  feature: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Feature)),
  text_img: dynamic(() => import('@panda-wiki/ui').then(mod => mod.ImgText)),
  img_text: dynamic(() => import('@panda-wiki/ui').then(mod => mod.ImgText)),
  comment: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Comment)),
  block_grid: dynamic(() =>
    import('@panda-wiki/ui').then(mod => mod.BlockGrid),
  ),
  question: dynamic(() => import('@panda-wiki/ui').then(mod => mod.Question)),
} as const;

const Welcome = () => {
  const basePath = useBasePath();
  const {
    mobile = false,
    kbDetail,
    triggerHomeInlineQa,
    language = 'zh-CN',
  } = useStore();
  const settings = kbDetail?.settings;
  const fallbackMessages = getHomeFallbackMessages(language);
  const onBannerSearch = (
    searchText: string,
    type: 'chat' | 'search' = 'chat',
  ) => {
    if (searchText.trim()) {
      sessionStorage.setItem('chat_search_query', searchText.trim());
      triggerHomeInlineQa?.(type);
    }
  };

  const TYPE_TO_CONFIG_LABEL = {
    banner: 'banner_config',
    basic_doc: 'basic_doc_config',
    nav_doc: 'nav_doc_config',
    dir_doc: 'dir_doc_config',
    simple_doc: 'simple_doc_config',
    carousel: 'carousel_config',
    faq: 'faq_config',
    text: 'text_config',
    case: 'case_config',
    metrics: 'metrics_config',
    feature: 'feature_config',
    text_img: 'text_img_config',
    img_text: 'img_text_config',
    comment: 'comment_config',
    block_grid: 'block_grid_config',
    question: 'question_config',
  } as const;

  const handleComponentProps = (data: any) => {
    const config =
      data[
        TYPE_TO_CONFIG_LABEL[data.type as keyof typeof TYPE_TO_CONFIG_LABEL]
      ];

    switch (data.type) {
      case 'faq':
        return handleFaqProps(config, fallbackMessages);
      case 'basic_doc':
        return handleBasicDocProps(config, data.nodes, basePath, fallbackMessages);
      case 'dir_doc':
        return handleDirDocProps(config, data.nodes, basePath, fallbackMessages);
      case 'nav_doc':
        return handleNavDocProps(config, data.nodes, basePath, fallbackMessages);
      case 'simple_doc':
        return handleSimpleDocProps(config, data.nodes, basePath, fallbackMessages);
      case 'carousel':
        return handleCarouselProps(config, basePath, fallbackMessages);
      case 'banner':
        return {
          ...handleBannerProps(config, basePath),
          onSearch: onBannerSearch,
          btns: (config?.btns || []).map((item: any) => ({
            ...item,
            href: getImagePath(item.href || '/node', basePath),
          })),
        };
      case 'text':
        return handleTextProps(config, fallbackMessages);
      case 'case':
        return handleCaseProps(config, fallbackMessages);
      case 'metrics':
        return handleMetricsProps(config, fallbackMessages);
      case 'feature':
        return handleFeatureProps(config, fallbackMessages);
      case 'text_img':
        return handleTextImgProps(config, basePath, fallbackMessages);
      case 'img_text':
        return handleImgTextProps(config, basePath, fallbackMessages);
      case 'comment':
        return handleCommentProps(config, basePath, fallbackMessages);
      case 'block_grid':
        return handleBlockGridProps(config, basePath, fallbackMessages);
      case 'question':
        return {
          ...handleQuestionProps(config, fallbackMessages),
          onSearch: (text: string) => {
            onBannerSearch(text, 'chat');
          },
        };
    }
  };
  return (
    <>
      {settings?.web_app_landing_configs?.map((item, index) => {
        const Component = componentMap[item.type as keyof typeof componentMap];
        const props = handleComponentProps(item);
        return Component ? (
          // @ts-ignore
          <Component key={index} mobile={mobile} {...props} />
        ) : null;
      })}
    </>
  );
};

export default Welcome;
