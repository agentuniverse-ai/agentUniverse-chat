import { message as antdMessage } from 'antd';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {produce} from 'immer';
import { last, merge, assign, pick, isEmpty, isUndefined, isString } from 'lodash';
import { Node } from 'slate';
import { nanoid } from 'nanoid';
import { Optional } from 'utility-types';
import OpenAI from 'openai';
import Event from '@/constants/event';
import { Card } from '@/index';
import useConfigStore from './useConfigStore';
import useChatStore from './useChatStore';
import useMiscStore from './useMiscStore';
import useAgentStore from './useAgentStore';

import Message, {
  MessageError,
  MessageStatus,
  Role,
} from './message';
import Session from './session';

export interface SessionState {
  error?: MessageError;
  sessionList: Session[];
  activeSessionId?: string;
  sessionListLoading: boolean;
  messageListLoading: boolean;
  pdfDownloadLoading: boolean;
}

export interface Prompt {
  content: string; // 序列化后的文本数据
  framework?: any;
  isRetry?: boolean; // 是否是重试消息
  raw?: Node[];  // 富文本数据（原始数据）
  attachment?: any[]; 
  skill?: {
    type: string;  // 技能类型
    data?: any;     // 技能数据
    name?: string;
  };
};

export interface SessionAction {
  // Session 管理
  initSessionList: () => Promise<Session[] | undefined>;
  addSession: (sessionOption?: Partial<Session>) => Promise<Session>;
  updateSession: (id: string, session: Partial<Session>) => void;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void | undefined>;
  deleteSession: (id: string) => Promise<void | undefined>;
  setActiveSessionId: (sessionId?: string) => Session;
  activateSession: (sessionId: string) => void;
  

  // Message管理
  initMessageList: (sessionId: string) => Promise<void>;
  sendPrompt: ({prompt, sessionId }: {prompt: Prompt, sessionId?: string}) => void;
  pushUserMessage: (sessionId: string, prompt: Prompt) => Message;
  pushAssistantMessage: (sessionId: string, msg: Optional<Message>) => Message;
  updateMessage: (message: Message, messageOption: Partial<Message>) => void;
  updateMessageContent: (message: Message, content: string) => void;
  toggleMessageListLoading: (b: boolean) => void;

  togglePdfLoading: (loading: boolean) => void;
  _getIndexByMessageId(messageId: string): [number, number];
}

export type SessionStore = SessionState & SessionAction;

const useSessionStore = create<SessionStore>()(
  immer((set, get) => ({
    error: undefined,
    sessionList: [],
    activeSessionId: undefined,
    sessionListLoading: false,
    messageListLoading: false,
    pdfDownloadLoading: false,

    /* session 管理 */
    async initSessionList() {
      set({ sessionListLoading: true });
      let res;
      try {
        res = await useConfigStore.getState().sessionHandler?.initSessionList();
        set({
          sessionList: res,
        });
        set({ sessionListLoading: false });
        return res;
      }
      catch (error) {
        set({
          sessionListLoading: false,
          error: {
            code: -1,
            message: (error as Error).message,
          },
        });
      }
    },

    toggleMessageListLoading(loading: boolean) {
      set({
        messageListLoading: loading,
      });
    },

    // 创建 session
    async addSession(sessionOption) {
      let res: any;
      const title = sessionOption?.title || '新建会话'
      let session = new Session({
        store: get(),
        id: nanoid(),
        title,
        serviceId: sessionOption?.serviceId,
      });

      set({
        sessionList: [session, ...get().sessionList],
        activeSessionId: session.id,
      });

      if (!useConfigStore.getState().disabledSession && !useConfigStore.getState().openAI) {
        res = await useConfigStore.getState().sessionHandler?.addSession({ title, service_id: sessionOption?.serviceId });
        // 更新session id
        // 修复：只有当 res 存在且有 id 时才更新 session id 和 title，以避免 TypeError
        if (res && res.id) {
          // @ts-ignore
          session = session.update({id: res.id, title: res.title || title });
          set({
            activeSessionId: res.id,
          });
        }
      }
      return session;
    },

    // 更新 session
    updateSession(sessionId, option) {
      const sessionList = get().sessionList;
      const index = sessionList.findIndex(
        (session) => session.id === sessionId,
      );
      set((state: SessionState) => {
        merge(state.sessionList[index], option);
      });
      
      return produce(sessionList[index], draft => {
        merge(draft, option);
      });
    },

    // 更新session标题
    updateSessionTitle(sessionId, title) {
      const sessionHandler = useConfigStore.getState().sessionHandler;
      if (!sessionHandler) {
        console.error('sessionHandler is undefined');
        return Promise.reject(new Error('sessionHandler is undefined'));
      }
      return sessionHandler.updateSession(sessionId, title).then(() => {
        this.updateSession(sessionId, { title });
      });
    },

    // 删除 session
    deleteSession(id) {
      const sessionHandler = useConfigStore.getState().sessionHandler;
      if (!sessionHandler) {
        console.error('sessionHandler is undefined');
        return Promise.reject(new Error('sessionHandler is undefined'));
      }
      return sessionHandler.deleteSession(id).then(() => {
        set({
          sessionList: get().sessionList.filter((item) => item.id !== id),
        });
      });
    },

    // 设置active session
    setActiveSessionId(sessionId) {
      set({
        activeSessionId: sessionId,
        messageListLoading: false, // 更复杂且合理的逻辑应该是切换 Session 后取消当前 Session下的请求（如果有），可以后续低优优化
      });

      return get().sessionList.find((session) => session.id === sessionId)!;
    },

    // 更新当前session,获取messageList
    activateSession(sessionId) {
      const activeSession = get().setActiveSessionId(sessionId);
      const { setMisc, scrollToBottom } = useMiscStore.getState();
      const { chat } = useChatStore.getState();
      const { isCompact } = useConfigStore.getState();
      const { setSelectedAgentId } = useAgentStore.getState();

      if (activeSession?.serviceId) {
        setSelectedAgentId(activeSession.serviceId);
      }

      scrollToBottom();
      chat.emit(Event.SESSION_CHANGE, activeSession);

      if (isCompact) {
        setMisc({ siderVisible: false });
      }

      // 如果没有会话
      if(isEmpty(activeSession)) {
        return;
      }

      // 如果没有数据就请求数据
      if (isEmpty(activeSession.messageList)) {
        activeSession.initMessageList();
      }
    },

    /* message 管理 */
    initMessageList(sessionId) {
      set({ messageListLoading: true });
      const messageHandler = useConfigStore.getState().messageHandler;
      if (!messageHandler) {
        console.error('messageHandler is undefined');
        set({ messageListLoading: false });
        return Promise.reject(new Error('messageHandler is undefined'));
      }
      return messageHandler.initMessageList(sessionId)
        .then((messageList) => {
          set((state: SessionState) => {
            const session = state.sessionList.find(
              (session) => session.id === sessionId,
            );

            // Check if session is defined before proceeding
            if (!session) {
              console.error('Session not found');
              return; // Early return if session is undefined
            }
            session.messageList = messageList.map((originMsg) => {
              return new Message({
                session: session!,
                store: get(),
                attachment: originMsg.attachment,
                // @ts-ignore
                status: MessageStatus.SUCCESS, // status 默认为成功
                // @ts-ignore
                isHistory: true, // 默认都是历史消息
                ...pick(originMsg, ['id', 'role', 'content', 'status', 'relateQuestion', 'extra', 'contentString','isHistory']),
              });
            });
          });
        })
        .finally(() => set({ messageListLoading: false }));
    },

    // 发送消息
    async sendPrompt({ sessionId = get().activeSessionId, prompt }) {
      const { scrollToBottom } = useMiscStore.getState();
      scrollToBottom();

      let session = get().sessionList.find(session => session.id === sessionId);
      if (!session) {
        session = await get().addSession({
          title: prompt.content,
        });
      }
      get().pushUserMessage(session.id, prompt);
      useChatStore.getState().chat.emit(Event.PROMPT_SEND, prompt, session.id);

      const sessionHandler = useConfigStore.getState().sessionHandler;
      console.log('Sending prompt:', { sessionId: session.id, prompt }); // 添加日志
      if (sessionHandler && sessionHandler.sendPrompt) {
        // 如果存在 sessionHandler 并且有 sendPrompt 方法，则通过它发送
        await sessionHandler.sendPrompt({ sessionId: session.id, prompt });
      } else {
        // 否则，回退到 OpenAI 或其他默认逻辑
        const openAIConfig = useConfigStore.getState().openAI;
        if (openAIConfig) {
          let answerMessage = get().pushAssistantMessage(session.id,{
            id: nanoid(),
            status: MessageStatus.RUNNING,
          });

          const openai = new OpenAI(openAIConfig);
          const completion = await openai.chat.completions.create({
            model: "qwen-plus",  //模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt.content },
                { role: "system", content: `Selected service ID: ${prompt.serviceId}` }
            ],
          });
          answerMessage.update({
            status: MessageStatus.SUCCESS,
            content: [
              {
                // @ts-ignore
                card: Card.Markdown,
                props: {
                  children: completion.choices[0].message.content,
                  speed: 250,
                },
              }
            ],
            contentString: completion.choices[0].message.content,
          });
        }
      }
    },

    // 推送 User 消息
    pushUserMessage(sessionId, prompt) {
      const sessionList = get().sessionList;
      const index = sessionList.findIndex(
        (session) => session.id === sessionId,
      );
      const session = sessionList[index];
      const message = new Message({
        id: nanoid(), // 前端创建一个临时id
        session,
        role: Role.USER,
        content: prompt.content,
        store: get(),
        attachment: prompt?.attachment,
      });

      set((state: SessionState) => {
        state.sessionList[index].messageList.push(message);
      });

      return message;
    },

    // 推送 AI 消息
    pushAssistantMessage(sessionId, msg) {
      const sessionList = get().sessionList;
      const index = sessionList.findIndex(
        (session) => session.id === sessionId,
      );
      const session = sessionList[index];
      const message = new Message({
        id: msg.id!,
        role: Role.ASSISTANT,
        session,
        store: get(),
        status: MessageStatus.RUNNING,
        ...msg,
      });
      set((state: SessionState) => {
        state.sessionList[index].messageList.push(message);
      });

      return message;
    },

    // 更新消息
    updateMessage(originMessage, messageOption) {
      set((state: SessionState) => {
        const [sessionIndex, messageIndex] = get()._getIndexByMessageId(originMessage.id);
        if (isUndefined(sessionIndex) || isUndefined(messageIndex)) {
          console.error('updateMessage: message not found');
          antdMessage.error('消息不存在');
          // TODO 应该报错显示在页面上
          return;
        }
        // merge是深合并，message的content中cardList会被替换，而不会全覆盖，导致cardList值错乱
        // case: 正常4e问答cardList.length = 2，后端在遇敏感信息回返回总结性一句话，cardList.length = 1，导致页面上展示错乱
        // 此场景merge和assign只是对象和数组深浅拷贝区别，其他一样
        const message = state.sessionList[sessionIndex].messageList[messageIndex];
        assign(message, messageOption);
      });

      return produce(originMessage, draft => {
        assign(draft, messageOption);
      });
    },

     // 更新答案部分的MD
     updateMessageContent(originMessage, content) {
      const isContentString = isString(originMessage.content);
      
      set((state: SessionState) => {
        const [sessionIndex, messageIndex] = get()._getIndexByMessageId(originMessage.id);
        if (isUndefined(sessionIndex) || isUndefined(messageIndex)) {
          console.error('updateMessage: message not found');
          antdMessage.error('消息不存在');
          // TODO 应该报错显示在页面上
          return;
        }
        const message = state.sessionList[sessionIndex].messageList[messageIndex];

        // TODO 暂时先把第一个 markdown 作为答案吧，有升级再说，现在是给高亮定制的，以后再改
        if (isContentString) {
          merge(message, { content });
        }
        else {
          // @ts-ignore
          const answerIndex = originMessage.content.findIndex((item) => item.card?.flag === 'markdown' || isString(item));
          if (answerIndex !== -1) {
            // @ts-ignore
            message.content[answerIndex] = content;
          }
          merge(message, {
            // @ts-ignore
            content: [...message.content],
          });
        }
      });
    },

    togglePdfLoading(loading) {
      set({pdfDownloadLoading: loading})
    },

    // 通过 messageId 获取到 message 在 session 中的位置
    _getIndexByMessageId(messageId) {
      const sessionList = get().sessionList;
      let sessionIndex: number;
      let messageIndex: number;
      sessionList.some((session, sIndex) => {
        return session.messageList.some((message, mIndex) => {
          if (message.id === messageId) {
            sessionIndex = sIndex;
            messageIndex = mIndex;
            return true;
          }
          return false;
        });
      });
      // @ts-ignore
      return [sessionIndex, messageIndex];
    },
  })),
);

// 当前 activeSession
export const selectActiveSession = (state: SessionState) => {
  const activeSession = state.sessionList.find(
    (session) => session.id === state.activeSessionId,
  );
  return activeSession;
};

// 获取当前session中最后的message
export const selectLastMessage = (state: SessionState) => {
  const session = selectActiveSession(state);
  const lastMessage = session && last(session.messageList);
  return lastMessage;
};

// input是否running
export const selectInputRunning = (state: SessionState) => {
  const lastMessage = selectLastMessage(state);
  return Boolean(lastMessage && lastMessage.status === MessageStatus.RUNNING);
};

export default useSessionStore;
