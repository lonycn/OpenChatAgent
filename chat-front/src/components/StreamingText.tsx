import React, { useState, useEffect, useRef } from 'react';

interface StreamingTextProps {
  /** 要显示的文本内容 */
  value: string;
  /** 打字速度（毫秒） */
  speed?: number;
  /** 完成回调 */
  onComplete?: () => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 自定义类名 */
  className?: string;
  /** 是否启用打字机效果 */
  enableTypewriter?: boolean;
}

/**
 * 流式文本组件 - 实现打字机效果
 * 基于 chat-ui 项目的 StreamingText 组件
 */
export const StreamingText: React.FC<StreamingTextProps> = ({
  value = '',
  speed = 30,
  onComplete,
  style = {},
  className = '',
  enableTypewriter = true,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [, setIsComplete] = useState(false);
  
  const lastValueRef = useRef('');
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // 开始打字动画
  const startStreaming = (text: string, startIndex: number = 0) => {
    if (!enableTypewriter) {
      setDisplayValue(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setIsStreaming(true);
    setIsComplete(false);
    indexRef.current = startIndex;

    const typeNextChar = () => {
      if (indexRef.current < text.length) {
        setDisplayValue(text.substring(0, indexRef.current + 1));
        indexRef.current++;
        timeoutRef.current = setTimeout(typeNextChar, speed);
      } else {
        setIsStreaming(false);
        setIsComplete(true);
        onComplete?.();
      }
    };

    typeNextChar();
  };

  // 监听文本变化
  useEffect(() => {
    if (value === lastValueRef.current) return;

    const prevValue = lastValueRef.current;
    lastValueRef.current = value;

    // 检测是否为增量更新（流式场景）
    if (value.length > prevValue.length && value.startsWith(prevValue)) {
      // 继续当前的打字动画，无需重启
      if (!isStreaming && enableTypewriter) {
        const currentLength = displayValue.length;
        if (currentLength < value.length) {
          startStreaming(value, currentLength);
        }
      } else if (!enableTypewriter) {
        setDisplayValue(value);
      }
    } else {
      // 全新内容，重新开始
      clearTimer();
      setDisplayValue('');
      indexRef.current = 0;
      if (value) {
        startStreaming(value, 0);
      } else {
        setIsStreaming(false);
        setIsComplete(true);
      }
    }
  }, [value, speed, enableTypewriter, displayValue.length, isStreaming, onComplete]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  // 闪烁光标组件
  const BlinkingCursor: React.FC = () => (
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
  );

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
      <span
        className={className}
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...style,
        }}
      >
        {enableTypewriter ? displayValue : value}
        {isStreaming && <BlinkingCursor />}
      </span>
    </>
  );
};

export default StreamingText; 