import EventEmitter from 'eventemitter3';
import { immerable } from 'immer';
import { Optional }  from 'utility-types';
import Event from '@/constants/event';
import useChatStore from '@/store/useChatStore';
// import { MessageCardRecords, RecordType, Answer, ExecutingTask } from '@/typings/answer';
import Session from './session';
import { SessionStore } from './useSessionStore';

type MaybeArray<T> = T | T[];

export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
};

export enum MessageStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILURE = 'failure',
  STOPPED = 'stopped',
};

export type MessageError = {
  code: number, // 前端报错默认-1
  message: string
}

export type MessageContent =
  string |
  React.ReactElement |
  Array<{
    type: string;
    [prop: string]: any;
  }>;

class Message extends EventEmitter {
  [immerable] = true
  public readonly role: Role;
  public id: string; // 这里不能使用 readonly，因为消息提交时需要前端生成一个临时id，等消息返回后再替换成后端的正式id
  public error?: MessageError;                        // 错误信息
  public content: MaybeArray<string | React.ReactElement | { card: React.FC<any> & { flag?: string }; props: any }>; // 文本或组件卡片 // 修复：将 flag 属性标记为可选，以解决 TypeScript 类型检查问题
  public contentString?: string | null;  // content 转化的字符串,给一些只读取字符串的功能使用，比如各种 actions
  public status: MessageStatus;                       // 解读进度，如果是 running，消息发送按钮会禁用
  public connectTime: number;                         // 该次消息请求连接耗费的时间，用来判断是否弱网环境     
  public relateQuestion: string[];
  public isHistory?: boolean; // 是否是历史消息
  public attachment?: Array<{
    type: string,
    id: string;
    source: string;
    name?: string;
    disabled?: boolean;
  }>;

  public readonly session: Session;  // 消息所属的 session
  public readonly store: SessionStore;
 
  public extra?: Record<string, any>; // 业务侧自定义字段可以放这里

  constructor(option: Optional<Pick<Message, 
    'id' | 'role' | 'session' | 'store' | 'content' |
    'status' | 'error' | 'relateQuestion' | 'extra' | 'isHistory' | 'contentString' | 'attachment'
  >, 'content' | 'status' | 'relateQuestion'>) {
    super();
    // 基本属性（raw 数据）
    this.id = option.id;
    this.role = option.role;
    this.status = option.status || MessageStatus.RUNNING;
    this.content = option.content || [];
    this.contentString = option.contentString;
    this.error = option.error;
    this.connectTime = 0;
    this.relateQuestion = option.relateQuestion || [];
    this.attachment = option.attachment || [];
    // 实例
    this.session = option.session;
    this.store = option.store;
    this.extra = option.extra;
    this.isHistory = option.isHistory || false;
  };

  // 停止解读，修改解读状态为stopped
  abort() {
    this.store.updateMessage(this, {
      status: MessageStatus.STOPPED,
    });

    useChatStore.getState().chat.emit(Event.MESSAGE_ABORT, this);
  };

  update(option: Partial<Message>) {
    if (this.status === MessageStatus.STOPPED) {
      return;
    };
    return this.store.updateMessage(this, option);
  };

  updateContent(content: string) {
    this.store.updateMessageContent(this, content);
  };

  checkIsLast() {
    const lastMessage = this.session.messageList[this.session.messageList.length - 1];
    return lastMessage.id === this.id;
  }
}

export default Message;
