import React, { useState, useEffect } from 'react';
import { Bubble } from '@chatui/core';

/**
 * 打字机效果气泡组件
 * 基于官方ChatUI的Bubble组件，添加打字机动画效果
 */
const TypewriterBubble = ({ 
  content, 
  speed = 50, 
  onComplete,
  ...props 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!content || typeof content !== 'string') {
      setDisplayText(content || '');
      setIsTyping(false);
      onComplete && onComplete();
      return;
    }

    let index = 0;
    setDisplayText('');
    setIsTyping(true);

    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayText(content.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
        onComplete && onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [content, speed, onComplete]);

  return (
    <div style={{ position: 'relative' }}>
      <Bubble 
        content={displayText} 
        {...props}
      />
      {isTyping && (
        <span style={{
          display: 'inline-block',
          width: '2px',
          height: '16px',
          backgroundColor: '#1890ff',
          marginLeft: '2px',
          animation: 'blink 1s infinite',
          verticalAlign: 'middle'
        }} />
      )}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default TypewriterBubble; 