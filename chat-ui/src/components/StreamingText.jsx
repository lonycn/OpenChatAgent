import React, { useState, useEffect, useRef } from 'react';
import './StreamingText.css';

/**
 * 流式文本组件 - 支持逐字显示和实时内容更新
 * 优化版本：修复内容更新时的显示问题
 */
const StreamingText = ({ 
  value = '', 
  speed = 50, 
  onComplete,
  className = '',
  style = {}
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const timerRef = useRef(null);
  const indexRef = useRef(0);
  const lastValueRef = useRef('');
  const isInitializedRef = useRef(false);

  // 清理定时器
  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // 开始流式显示
  const startStreaming = (text, startIndex = 0) => {
    clearTimer();
    setIsStreaming(true);
    indexRef.current = startIndex;

    const streamNextChar = () => {
      if (indexRef.current < text.length) {
        setDisplayValue(text.slice(0, indexRef.current + 1));
        indexRef.current++;
        timerRef.current = setTimeout(streamNextChar, speed);
      } else {
        setIsStreaming(false);
        onComplete?.();
      }
    };

    streamNextChar();
  };

  useEffect(() => {
    // 如果值没有变化，不处理
    if (value === lastValueRef.current) {
      return;
    }

    const prevValue = lastValueRef.current;
    lastValueRef.current = value;

    // 首次初始化
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      if (value) {
        startStreaming(value, 0);
      }
      return;
    }

    // 如果是新内容追加（流式更新）
    if (value.length > prevValue.length && value.startsWith(prevValue)) {
      // 如果当前正在流式显示，让它继续，但更新目标文本
      if (isStreaming) {
        // 不需要重新开始，让当前的流式显示继续到新的长度
        return;
      } else {
        // 从当前显示的位置继续流式显示
        const currentLength = displayValue.length;
        if (currentLength < value.length) {
          startStreaming(value, currentLength);
        } else {
          // 直接显示新内容
          setDisplayValue(value);
        }
      }
    } else {
      // 完全新的内容，重新开始
      setDisplayValue('');
      indexRef.current = 0;
      if (value) {
        startStreaming(value, 0);
      }
    }
  }, [value, speed, onComplete]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  // 如果当前正在流式显示，使用displayValue，否则使用完整的value
  const finalValue = isStreaming ? displayValue : value;

  return (
    <span 
      className={className}
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...style
      }}
    >
      {finalValue}
      {isStreaming && (
        <span 
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1.2em',
            backgroundColor: 'currentColor',
            marginLeft: '2px',
            animation: 'blink 1s infinite'
          }}
        />
      )}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </span>
  );
};

export default StreamingText; 