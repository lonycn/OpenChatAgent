import React, { useState, useEffect, useRef } from 'react';
import { XStream } from '@ant-design/x';
import { Typography } from 'antd';

const { Text } = Typography;

interface XStreamMessageProps {
  /** 流式数据源 */
  streamData?: ReadableStream<Uint8Array>;
  /** 静态文本内容（用于非流式消息） */
  content?: string;
  /** 是否为流式消息 */
  isStreaming?: boolean;
  /** 完成回调 */
  onComplete?: (fullText: string) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
}

/**
 * 基于 Ant Design X XStream 的流式消息组件
 * 支持 SSE 协议的流式数据处理
 */
export const XStreamMessage: React.FC<XStreamMessageProps> = ({
  streamData,
  content = '',
  isStreaming = false,
  onComplete,
  onError,
  style = {},
  className = '',
}) => {
  const [displayText, setDisplayText] = useState(content);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 处理流式数据
  useEffect(() => {
    if (!streamData || !isStreaming) {
      setDisplayText(content);
      return;
    }

    const processStream = async () => {
      setIsProcessing(true);
      setError(null);
      
      // 创建 AbortController 用于取消流
      abortControllerRef.current = new AbortController();

      try {
        let fullText = '';
        
        // 使用 XStream 处理流式数据
        for await (const chunk of XStream({
          readableStream: streamData,
        })) {
          // 检查是否被取消
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          // 解析 SSE 数据
          if (chunk.data) {
            try {
              const data = JSON.parse(chunk.data);
              
              if (data.type === 'stream') {
                fullText = data.fullText || data.text || '';
                setDisplayText(fullText);
                
                // 如果流式消息完成
                if (data.isComplete) {
                  setIsProcessing(false);
                  onComplete?.(fullText);
                  break;
                }
              } else if (data.type === 'text') {
                fullText = data.text || '';
                setDisplayText(fullText);
                setIsProcessing(false);
                onComplete?.(fullText);
                break;
              } else if (data.type === 'error') {
                throw new Error(data.message || '流处理错误');
              }
            } catch (parseError) {
              // 如果不是 JSON 格式，直接作为文本处理
              fullText += chunk.data;
              setDisplayText(fullText);
            }
          }
        }
      } catch (err) {
        const error = err as Error;
        console.error('XStream 处理错误:', error);
        setError(error.message);
        setIsProcessing(false);
        onError?.(error);
      }
    };

    processStream();

    // 清理函数
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [streamData, isStreaming, content, onComplete, onError]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 渲染错误状态
  if (error) {
    return (
      <Text 
        type="danger" 
        style={{ ...style, fontStyle: 'italic' }}
        className={className}
      >
        消息加载失败: {error}
      </Text>
    );
  }

  // 渲染正常内容
  return (
    <span
      className={className}
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...style,
      }}
    >
      {displayText}
      {isProcessing && (
        <span
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1em',
            backgroundColor: 'currentColor',
            marginLeft: '2px',
            animation: 'blink 1s infinite',
          }}
        />
      )}
    </span>
  );
};

export default XStreamMessage; 