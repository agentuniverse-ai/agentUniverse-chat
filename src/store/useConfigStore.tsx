import { create } from 'zustand';
import { merge } from 'lodash';
import { darkTheme, lightTheme } from '@/constants/antdTheme';
import { LIGHT_THEME_LOGO, DARK_THEME_LOGO } from '@/constants/index';
import Message from '@/store/message';
import Session from '@/store/session';
import Event from '@/constants/event';
import { Prompt } from '@/store/useSessionStore';
import useChatStore from './useChatStore';
import { Skill } from '@/skill';
import React from 'react';
import { CollapseProps } from 'antd';
import { Options as MarkdownOptions } from 'react-markdown'

export type ThemeType = 'dark' | 'light';

export type ActionPosition = 'start' | 'end';

export type ActionComponent = React.FC<{
  onClick?: <T>(message: Message, ...args: T[]) => void;
  message?: Message;
  [key: string]: any;
}>;

export interface ConfigState {
  container?: HTMLElement;
  disabledSession?: boolean; // 隐藏左侧列表，但是业务侧不需要sider的时候，不需要创建新的session
  hiddenSider?: boolean; // 在蚁和等业务侧隐藏左侧列表
  hiddenHeader?: boolean; // 在蚁和等业务侧隐藏头部
  openAI?: {
    apiKey: string;
    baseURL: string;
  };
  activeRoute: string;
  menuRoutes?: {
    label: string,
    value: string
    icon: React.ReactElement,
    content: React.ReactElement,
    onClick?: () => void,
  }[];
  isCompact: boolean; // 是否紧缩样式模型，紧缩模型用于移动端和展厅竖版屏
  autoCompact: boolean; // 是否自动切换紧凑模式
  isDocCopilotMode?: boolean; // 是否是研报解读模式，中间pdf，右侧会话输入框
  docLimitAlert?: { // 限制浏览文档次数和提示
    message: string,
    redirect: React.ReactElement,
  };
  theme: ThemeType;
  lng: 'zh' | 'en'; // 语言 zh | en
  safeTip: string;
  product: {
    logo: string | React.ReactElement;
    darkLogo?: string | React.ReactElement;
    name: string;
  }
  avatar: {
    user?: string | React.ReactElement;
    assistant?: string | React.ReactElement;
  };
  recommend?: {
    list: Prompt[];
    autoSwap?: boolean; // 默认自动从list里随机挑4个推荐，支持换一换
  };
  input?: {
    placeholder?: string;
    hidden?: boolean;
    disabled?: boolean;
  };
  markdown?: {
    className: string;
    imgFlag?: {
      srcGen?: (key: string) => string;
    },
    components: MarkdownOptions['components']
  };
  message?: {
    userBubbleClassName: string
    userBubbleStyle: React.CSSProperties;
    assistantBubbleClassName: string;
    assistantBubbleStyle: React.CSSProperties;
  }
  welcomeSlot?: string | React.ReactElement;
  SideBottomSlot?: string | React.ReactElement;
  headerSlots?: React.FC[];
  sessionDefaultActiveKey?: CollapseProps['defaultActiveKey'],
  history?: any;
  suggestPoppover?: {
    delay?: number;
    onSearch: (value: string) => Promise<{value: string}[]>
  }
  enableAlipayVoice: boolean;
  skills?: [Skill, any][];
  copilot?: {
    title?: string,
    isFolding?: boolean, // 是否可折叠
    isOpen?: boolean, // 展示/隐藏
  }
  feedbackFormList: any[];
  sessionHandler?: {
    initSessionList(): Promise<Session[]>;
    addSession({title, service_id}: {title: string, service_id?: string}): Promise<{ id: string; title: string }>;
    deleteSession(sessionId: string): Promise<void>;
    updateSession(sessionId: string, title: string): Promise<void>;
    sendPrompt?: ({ sessionId, prompt }: { sessionId: string; prompt: Prompt }) => Promise<void>;
  }

  messageHandler?: {
    initMessageList(sessionId: string): Promise<any[]>;
  }

  messageActions?: Array<[
    ActionComponent,
    {
      onClick?: <T>(message: T) => void;
      onInit?: () => Promise<any>;
      position?: ActionPosition;
    }
  ]>
}

export interface ConfigAction {
  setConfig: (config: Partial<ConfigState>) => void;
  mergeConfig: (config: Partial<ConfigState>) => void;
  switchTheme: (theme?: ThemeType) => void;
  setLng: (lng: 'zh' | 'en') => void;
  setActiveRoute: (route: string) => void;
  setCopilot: (obj: ConfigState['copilot']) => void;
}

export type ConfigStore = ConfigState & ConfigAction;

const useConfigStore = create<ConfigStore>()((set, get) => ({
  container: undefined,
  disabledSession: false,
  hiddenSider: false,
  hiddenHeader: false,
  openAI: undefined,
  activeRoute: 'session',
  menuRoutes: undefined,
  copilot: {
    title: '',
    isFolding: false,
    isOpen: false,
  },
  isCompact: false,
  isInstitution: false,
  autoCompact: true,
  isDocCopilotMode: false,
  docLimitAlert: undefined,
  theme: 'light',
  lng: 'zh',
  safeTip: '内容由 AI 生成，不构成投资建议，请谨慎参考',
  input: {
    hidden: false,
    placeholder: '请输入你的问题',
    disabled: false,
  },
  product: {
    logo: <img src={LIGHT_THEME_LOGO} />,
    darkLogo: <img src={DARK_THEME_LOGO} />,
    name: '支小助',
  },
  avatar: {},
  recommend: {
    list: [],
    autoSwap: true,
  },
  welcomeSlot: undefined,
  SideBottomSlot: undefined,
  headerSlots: [],
  
  enableAlipayVoice: false,
  suggestPoppover: undefined,
  sessionDefaultActiveKey: undefined,
  skills: [],
  feedbackFormList: [],
  skillValue: undefined,
  sessionHandler: {
    initSessionList: async () => {throw new Error('未设置 initSessionList')},
    addSession: async () => {throw new Error('未设置 addSession')},
    deleteSession: async () => {throw new Error('未设置 deleteSession')},
    updateSession: async () => {throw new Error('未设置 updateSession')},
  },

  messageHandler: {
    initMessageList: async () => {throw new Error('未设置 initMessageList')},
  },

  messageActions: [],

  setConfig: (config) => {
    set(config);
  },

  setLng: (lng) => {
    set({ lng });
    useChatStore.getState().chat.emit(Event.LANGUAGE_CHANGE, lng);
  },

  mergeConfig: (config) => {
    set(merge({}, get(), config));
  },

  switchTheme: (theme) => {
    const themeToUse = theme || (useConfigStore.getState().theme === 'light' ? 'dark' : 'light');
    useChatStore.getState().chat.emit(Event.THEME_CHANGE, themeToUse);
    set({ theme: themeToUse });
  },

  setActiveRoute: (route) => {
    set({
      activeRoute: route,
    })
    get().setCopilot({
      isFolding: route === 'session' ? false : true,
      isOpen: route === 'investment' ? false : true,
    })
    useChatStore.getState().chat.emit(Event.ROUTE_CHANGE, route);
  },

  setCopilot: (obj) => {
    set({
      copilot: {
        ...get().copilot,
        ...obj
      }
    })
  }
}));

export const selectAntdTheme = (state: ConfigStore) => {
  return state.theme === 'dark' ? darkTheme : lightTheme;
};

export const selectProductLogo = (state: ConfigStore) => {
  return state.theme === 'dark' ? state.product.darkLogo : state.product.logo;
};

export default useConfigStore;
