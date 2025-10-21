import React from 'react';
import Markdown from 'react-markdown';
import { Button, Image, Skeleton } from 'antd';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import useTypedThrottle from '@/hooks/useTypedThrottle';
import { fixLatex } from '@/utils/markdown';
import { highlightPlugin, imgLoadingPlugin } from './plugin';

import './katex.min.css';
import styles from './index.module.less';
import classNames from 'classnames';
import useConfigStore from '@/store/useConfigStore';

type Props = {
  children: React.ReactNode & string & any;
  speed?: number;
  type?: string;
};

const gfmCommonOptions = {
  singleTilde: false,
}

const MarkdownCard: React.FC<Props> & { flag: string } = ({ children, speed, type }) => {
  const { markdown } = useConfigStore(state => state);
  const typed = useTypedThrottle(children, {
    speed: speed,
    disabled: !speed,
  });

  if (children === '### ') {
    return null;
  }

  return (
    <Markdown
      className={classNames([styles.markdown, {
        [styles.user]: type === 'text',
      }], markdown?.className)}
      remarkPlugins={[
        remarkMath,
        [remarkGfm, gfmCommonOptions],
        imgLoadingPlugin,
        highlightPlugin,
        remarkDirective,
        remarkBreaks, // 支持list里单个换行符换行
      ]}
      rehypePlugins={[ rehypeKatex ]}
      components={{
        // 角标溯源
        // span(props) {
        //   const { node, children, className, ...rest } = props;
        //   const { dataZxzName, referMarker } = node!.properties;
        //   if (dataZxzName === ZXZ_REFER_SENTENCE_NAME) {
        //     return (
        //       <ReferSentence
        //         referMap={referMap}
        //         referMarker={referMarker as string}
        //       >
        //         {children}
        //       </ReferSentence>
        //     );
        //   }

        //   return (
        //     <span {...rest} className={className}>
        //       {children}
        //     </span>
        // //   );
        // },
        img(props: any) {
          return (
            <div>
              <Image
                style={{ maxWidth: '300px', minHeight: '80px' }}
                {...props}
                placeholder={
                  <div style={{ width: '100px', height: '80px' }}>
                    <Skeleton.Image active={true} />
                  </div>
                }
              />
            </div>
          )
        },
        code(props: any) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');

          if (match && match[1] === 'execution') {
            return children;
          }

          if(match) {
            return (
              <SyntaxHighlighter
                {...rest}
                PreTag="div"
                language={match[1]}
              >
                {children}
              </SyntaxHighlighter>
            )
          }

          return (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
        a(props: any) {
          return <a {...props} target="_blank" />;
        },
        ...(markdown?.components || {})
      }}
    >
      { fixLatex(typed) }
    </Markdown>
  );
};

// 标记是 markdown 卡片，给自动高亮能力用的，高亮组件会自动对消息里的第一个 markdown 卡片进行高亮
// 修复：将 flag 属性强制转换为 any，以解决 TypeScript 类型检查问题
(MarkdownCard as any).flag = 'markdown';

export default React.memo(MarkdownCard);
