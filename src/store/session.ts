import EventEmitter from 'eventemitter3';
import { immerable } from 'immer';
import Message from './message';
import type { Prompt } from './useSessionStore';
import type { SessionStore } from './useSessionStore';
// import { URL_REGEX } from '@/constants';

class Session extends EventEmitter {
  [immerable] = true; // 为什么要加这个，参阅immer文档：https://immerjs.github.io/immer/complex-objects/
  public id: string;  // 这里不能使用 readonly，因为消息提交时需要前端生成一个临时id，等消息返回后再替换成后端的正式id
  public title: string;
  public serviceId?: string;
  public messageList: Message[];
  public readonly store: SessionStore;
  public attachment?: Array<{
    type: string,
    id: string;
    source: string;
    name?: string;
    disabled?: boolean,
  }>;
  /** 可以用来存放业务侧的自定义字段 */
  public extra?: Record<string, any>;

  constructor(option: Pick<Session, 'id' | 'title' | 'store' | 'attachment' | 'extra' | 'serviceId'>) {
    super();
    this.id = option.id;
    this.title = option.title;
    this.serviceId = option.serviceId;
    this.messageList = [];
    this.store = option.store;
    this.attachment = option.attachment = [];
    this.extra = option.extra || {};
  }

  update(session: Partial<Session>) {
    return this.store.updateSession(this.id, session);
  }

  destroy() {
    return this.store.deleteSession(this.id);
  }

  // 初始化消息列表（后端返回的user侧消息无id，需前端补充）
  initMessageList() {
    return this.store.initMessageList(this.id);
  }

  updateTitle(title: string) {
    return this.store.updateSessionTitle(this.id, title);
  }

  // 添加消息
  sendPrompt(prompt: Prompt) {
    return this.store.sendPrompt({
      sessionId: this.id,
      prompt
    });
  }
}

export default Session;
