import React from 'react';
import ReactDOM from 'react-dom/client';
import EventEmitter from 'eventemitter3';
import { mergeWith } from 'lodash';
import useConfigStore, { ConfigState, ThemeType } from '@/store/useConfigStore';
import useChatStore from '@/store/useChatStore';
import useSessionStore, { Prompt, selectActiveSession } from '@/store/useSessionStore';
import usePromptStore, { PromptState } from '@/store/useInputStore';
import useMiscStore from '@/store/useMiscStore';
import Message from '@/store/message';
import Session from '@/store/session';
import Home from '@/components/Home';
import { mergeWithArray } from './utils/util';
import './global.less';
import './reset.css';

export default class AuChat extends EventEmitter {
  public container: any;
  public richInput: any;
  private root: ReactDOM.Root | null = null; // 添加 root 属性，用于存储 React 根实例

  constructor(config: Partial<ConfigState>) {
    super();
    this.container = config.container;
    this.init(config);

    if (config.container) {
      // 修复：确保 ReactDOM.createRoot 只被调用一次
      if (!this.root) { // 如果 root 不存在，则创建
        this.root = ReactDOM.createRoot(config.container);
      }
      this.root.render(<Home />); // 渲染或更新
    }
  };

  init(config: Partial<ConfigState>) {
    useChatStore.setState({ chat: this });
    useConfigStore.getState().setConfig(config);
  }

  setConfig(config: Partial<ConfigState>) {
    useConfigStore.getState().setConfig(config);
  }

  setLng(lng: 'zh' | 'en') {
    useConfigStore.getState().setLng(lng);
  }

  getConfig() {
    return useConfigStore.getState();
  }

  setActiveRoute(route: string) {
    useConfigStore.getState().setActiveRoute(route);
  }

  setCopilot(copilot: ConfigState['copilot']) {
    useConfigStore.getState().setCopilot(copilot);
  }

  mergeConfig(config: Partial<ConfigState>) {
    useConfigStore.getState().mergeConfig(config);
  }

  setPrompt(input: Partial<PromptState>) {
    usePromptStore.getState().setPrompt(input);
  }

  getPrompt() {
    return usePromptStore.getState().prompt;
  }

  mergePrompt(prompt: Prompt) {
    const { prompt: oldPrompt } = usePromptStore.getState();
    usePromptStore.getState().setPrompt({ prompt: { ...oldPrompt, ...prompt } });
  }

  setSkill(skill?: Prompt['skill']) {
    const prompt = mergeWith({}, usePromptStore.getState().prompt, { skill }, mergeWithArray);
    usePromptStore.getState().setPrompt({ prompt });
  }

  activateSkill(skillName: string) {
    usePromptStore.getState().setPrompt({
      prompt: {
        content: '',
        skill: {
          type: skillName,
          data: undefined,
        },
      },
    });
  }

  clearSkill() {
    usePromptStore.getState().setPrompt({
      prompt: {
        content: '',
        skill: undefined,
      },
    });
  }

  clearInput() {
    // TODO 名字不太对，其实清除的是 prompt.content
    // richInput 内容是非受控的，所以这里要同时清空 prompt.content 和 richInput 的内容
    usePromptStore.getState().mergePrompt({ content: '' });
    this.richInput.tf.reset();
  }

  sendPrompt(prompt: Prompt) {
    useSessionStore.getState().sendPrompt({ prompt });
  }

  switchTheme(theme?: ThemeType) {
    useConfigStore.getState().switchTheme(theme);
  }

  pushAssistantMessage(message: Message) {
    const { activeSessionId } = useSessionStore.getState();
    if (!activeSessionId) {
      throw new Error('未定义当前SessionId'); // 直接抛错，避免ts认为还会返回undefined
    }
    return useSessionStore.getState().pushAssistantMessage(activeSessionId, message);
  }

  updateSession(sessionId: string, options: Partial<Session>) {
    useSessionStore.getState().updateSession(sessionId, options);
  }

  getActiveSession() {
    return selectActiveSession(useSessionStore.getState());
  }

  activateSession(sessionId: string) {
    useSessionStore.getState().activateSession(sessionId);
  }

  scrollToBottom() {
    useMiscStore.getState().scrollToBottom();
  }

  handleInitSessionList() {
    return useSessionStore.getState().initSessionList();
  }

  switchSider(isOpen: boolean, options?: {isPin?: boolean}) {
    useMiscStore.getState().setMisc({
      siderVisible: isOpen,
      isPinSidebar: options?.isPin,
    })
  }

  setArtifact(artifact: React.ReactNode | undefined, props?: any) {
    useMiscStore.getState().setArtifact(artifact, props);
  }
};
