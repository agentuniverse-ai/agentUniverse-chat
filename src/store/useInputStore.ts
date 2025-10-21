import { create } from 'zustand';
import { mergeWith } from 'lodash';
import { Prompt } from './useSessionStore';
import { mergeWithArray } from '@/utils/util';

// 扩展 Prompt 接口，添加 serviceId
declare module './useSessionStore' {
  export interface Prompt {
    serviceId?: string;
  }
}

export interface PromptState {
  prompt?: Prompt;
  disableSend: boolean;
  selectedServiceId?: string; // 添加 selectedServiceId 状态
}

export interface PromptAction {
  setPrompt: (config: Partial<PromptState>) => void;
  mergePrompt: (prompt: Partial<Prompt>) => void;
  setSelectedServiceId: (id: string) => void; // 添加 setSelectedServiceId action
}

export type PromptStore = PromptState & PromptAction; // 修改类型名称

const usePromptStore = create<PromptStore>()((set, get) => ({ // 修复：将 ConfigStore 改名为 PromptStore
  prompt: undefined,
  disableSend: false,
  selectedServiceId: undefined, // 初始化 selectedServiceId

  setPrompt: (input) => {
    set(input);
  },
  
  mergePrompt: (prompt) => {
    set(state => ({
      prompt: mergeWith(state.prompt, prompt, mergeWithArray),
    }));
  },

  setSelectedServiceId: (id: string) => { // 实现 setSelectedServiceId action
    set({ selectedServiceId: id });
  },
}));

export default usePromptStore;
