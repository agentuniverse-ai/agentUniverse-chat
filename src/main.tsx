import React, { useEffect, useRef } from 'react';
// 导入 AuChat 及其相关类型和枚举
import AuChat, { Card, Event, MessageStatus, Session, Role, Message, Prompt } from './index';
// 导入 useSessionStore 用于获取 session 状态
import useSessionStore from './store/useSessionStore';
// 导入 usePromptStore 用于获取 prompt 状态和设置选中的 serviceId
import usePromptStore from './store/useInputStore';
// 导入 ReactDOM 的 createRoot 方法，用于 React 18 的并发模式
import ReactDOM, { createRoot } from 'react-dom/client';
import useAgentStore from './store/useAgentStore'; // 导入 useAgentStore
import { FallOutlined } from '@ant-design/icons';

// 模拟异步延迟函数
const delay = async (ms: number) => new Promise(resolve => {
  setTimeout(resolve, ms);
});

const App = () => {
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 在组件挂载时获取智能体服务列表
    useAgentStore.getState().fetchAgentList();

    // 初始化 AuChat 实例
    const auChat = new AuChat({
      container: chatRef.current, // 聊天容器 DOM 元素

      product: {
        logo: <img src='https://gw.alipayobjects.com/zos/finxbff/compress-tinypng/QBYeBCymJCQGCgUDcKADp/yuantulogo3.png' />,
        darkLogo: <img src='https://gw.alipayobjects.com/zos/finxbff/compress-tinypng/Ek69FC46jbmc4rBmNKiLa/899A7B21_C634_4135_B7E9_D16C1C3BE4D5.png' />,
        name: 'XXX',
      },

      avatar: {
        assistant: <img src='https://gw.alipayobjects.com/zos/finxbff/compress-tinypng/igrVm7tHegnACtg4gFPaY/weitu__1_.png' />,
        user: '洋流',
      },

      recommend: {
        list: [
          { content: '2024年的中国经济走向，核心关注什么？' },
          { content: '白酒上市公司需要关注哪几个方面的因素' },
          { content: '近十年两会召开期间上证指数平均走势如何' },
          { content: '怎么解读2023年中国政府的财政预算报告？' },
          { content: '2024年中国经济走向何方，核心关注什么？' },
          { content: '从投资时钟的角度来看，当前我国的经济处于什么位置' },
          { content: '央行降准后市场风格和行业表现上会有何特征？' },
          { content: '如何看待海通证券荀玉根发布的策略专题报告：策略研究框架' },
          { content: '分短期和中长期来看,医药反腐政策对行业会产生何种影响' },
        ],
      },

      sessionHandler: {
        // 初始化会话列表
        async initSessionList(): Promise<Session[]> {
          const response = await fetch('http://127.0.0.1:8888/session/list');
          const data = await response.json();
          return data.map((item: any) => new Session({
            id: item.id,
            title: item.title,
            serviceId: item.service_id, // 新增 service_id
            store: useSessionStore.getState(),
          }));
        },
        // 添加会话
        async addSession({ title, service_id }: { title: string, service_id?: string }): Promise<{ id: string; title: string }> {
          // 后端没有提供添加会话的接口，这里暂时模拟
          await delay(1000);
          const newId = Math.random().toString(36).substring(2, 8); // 模拟后端生成ID，缩短长度
          console.log('addSession', title, newId, service_id);
          return { id: newId, title };
        },
        // 删除会话
        async deleteSession(sessionId: string): Promise<void> {
          await fetch('http://127.0.0.1:8888/session/delete', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_id: sessionId }),
          });
          console.log('deleteSession', sessionId);
        },
        // 更新会话
        async updateSession(sessionId: string, title: string): Promise<void> {
          await fetch('http://127.0.0.1:8888/session/update', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_id: sessionId, title: title }),
          });
          console.log('updateSession', sessionId, title);
        },
        // 发送提示
        async sendPrompt({ sessionId, prompt }: { sessionId: string; prompt: Prompt }): Promise<void> {
          console.log('sessionHandler.sendPrompt called with:', { sessionId, prompt });
          // 这里可以添加实际的后端请求逻辑，将 prompt.serviceId 发送到后端
          // 为了演示，我们暂时只打印日志
          await delay(500); // 模拟网络请求
        }
      },

      messageHandler: {
        // 初始化消息列表
        async initMessageList(sessionId: string): Promise<any[]> {
          const response = await fetch(`http://127.0.0.1:8888/session/${sessionId}/history`);
          const data = await response.json();
          console.log('initMessageList', sessionId, data);
          return data.map((item: any) => {
            let content;
            if (typeof item.content === 'string') {
              content = item.content;
            } else if (Array.isArray(item.content) && item.content.length > 0) {
              // 假设 content 是一个数组，并且我们只关心第一个元素的 children
              content = item.content.map((c: any) => {
                if (c.card === 'Markdown' && c.props && c.props.children) {
                  return {
                    card: Card.Markdown,
                    props: {
                      children: c.props.children,
                      speed: 100, // 可以根据需要调整速度
                    },
                  };
                }
                return c; // 返回原始对象如果不是 Markdown 类型
              });
            } else {
              content = item.content; // 其他情况保持原样
            }

            return {
              id: item.id,
              role: item.role,
              content: content,
              status: item.status,
              gmt_create: item.gmt_create,
            };
          });
        },
      },
    });


    // 监听 PROMPT_SEND 事件，处理用户发送消息的逻辑
    auChat.on(Event.PROMPT_SEND, async (prompt, sessionId) => {
      console.log('prompt', prompt);
      const { selectedAgentId } = useAgentStore.getState(); // 获取 selectedAgentId
      const activeSession = auChat.getActiveSession(); // 获取当前活跃的 session

      let currentAnswerMessage: Message | null = null;
      let currentContent = '';
      let lastAgentName: string | null = null;

      try {
        // 发送请求到后端服务，实现流式传输
        const response = await fetch('http://127.0.0.1:8888/web_stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service_id: selectedAgentId || prompt.skill?.type || 'demo_service', // 优先使用 selectedAgentId
            saved: true,
            params: {
              // session_id: sessionId || 'default_session_id',
              session_id: sessionId, // 使用动态的 sessionId
              input: prompt.content, // 修复：使用动态的 prompt.content
            },
          }),
        });

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const jsonStr = line.substring(5).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  const agentName = data.process?.data?.agent_info?.name;

                  if (data.process?.type === 'token' && agentName) {
                    // 当 agent 切换时，创建新的消息
                    if (agentName !== lastAgentName) {
                      if (currentAnswerMessage) {
                        currentAnswerMessage.update({ status: MessageStatus.SUCCESS });
                      }
                      currentContent = ''; // 重置内容
                      currentAnswerMessage = auChat.pushAssistantMessage(new Message({
                        id: Math.random().toString(36).substring(2, 15),
                        status: MessageStatus.RUNNING,
                        role: Role.ASSISTANT,
                        session: activeSession,
                        store: useSessionStore.getState(),
                        content: [{ card: Card.Markdown, props: { children: '' } }]
                      }));
                      lastAgentName = agentName;
                    }

                    // 提取 chunk 并更新当前消息
                    let chunk = '';
                    if (typeof data.process.data.chunk === 'object' && data.process.data.chunk.text !== undefined) {
                      chunk = data.process.data.chunk.text;
                    } else if (typeof data.process.data.chunk === 'string') {
                      chunk = data.process.data.chunk;
                    }

                    if (chunk && currentAnswerMessage) {
                      currentContent += chunk;
                      currentAnswerMessage.update({
                        content: [{
                          card: Card.Markdown,
                          props: { children: currentContent, speed: 200 }
                        }]
                      });
                    }
                  } else if (data.result) {
                    // Final result can be handled here if needed
                  }
                }
              } catch (e) {
                console.error('Error parsing JSON from stream:', e, line);
              }
            }
          }
        }

        // 循环结束后，完成最后一个消息
        if (currentAnswerMessage) {
          currentAnswerMessage.update({ status: MessageStatus.SUCCESS });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        if (currentAnswerMessage) {
          currentAnswerMessage.update({
            status: MessageStatus.FAILURE,
            content: [{
              card: Card.Markdown,
              props: { children: `发送消息失败: ${error.message}`, speed: 200 },
            }],
          });
        } else {
          // 如果在创建任何消息之前就出错，则推送一个新的错误消息
          auChat.pushAssistantMessage(new Message({
            id: Math.random().toString(36).substring(2, 15),
            status: MessageStatus.FAILURE,
            role: Role.ASSISTANT,
            session: activeSession,
            store: useSessionStore.getState(),
            content: [{
              card: Card.Markdown,
              props: { children: `发送消息失败: ${error.message}`, speed: 200 },
            }],
          }));
        }
      }
    });
  }, []);

test
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div ref={chatRef} style={{ width: '100%', height: '100%' }}></div>
    </div>
  )
}

// 修复：确保 ReactDOM.createRoot 只被调用一次
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
