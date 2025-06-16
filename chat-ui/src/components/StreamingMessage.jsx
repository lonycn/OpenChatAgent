import React, { useState, useEffect, useRef } from 'react';

const StreamingMessage = ({ text, isComplete, speed = 30 }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);
  const lastTextRef = useRef('');

  useEffect(() => {
    // 如果消息已完成，直接显示完整文本
    if (isComplete && text !== displayText) {
      setDisplayText(text);
      setCurrentIndex(text.length);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 如果文本发生变化且未完成，启动打字机效果
    if (text !== lastTextRef.current && !isComplete) {
      lastTextRef.current = text;
      
      // 清除之前的定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // 从当前位置开始打字
      const startIndex = displayText.length;
      let index = startIndex;

      intervalRef.current = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.substring(0, index + 1));
          setCurrentIndex(index + 1);
          index++;
        } else {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, speed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, isComplete, speed, displayText]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {displayText}
      {!isComplete && currentIndex < text.length && (
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
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </span>
  );
};

export default StreamingMessage; 