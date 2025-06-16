import React, { useEffect, useRef, useState } from 'react';
import TypeIt from 'typeit';

const TypeItStreamingMessage = ({ 
  text, 
  isComplete, 
  speed = 50, 
  showCursor = true,
  onComplete = null 
}) => {
  const elementRef = useRef(null);
  const instanceRef = useRef(null);
  const lastTextRef = useRef('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!elementRef.current) return;

    // 初始化TypeIt实例
    if (!instanceRef.current) {
      instanceRef.current = new TypeIt(elementRef.current, {
        speed: speed,
        cursor: showCursor,
        cursorChar: '|',
        cursorSpeed: 1000,
        deleteSpeed: 50,
        lifeLike: true,
        waitUntilVisible: true,
        afterComplete: () => {
          if (onComplete) onComplete();
        }
      });
      setIsReady(true);
    }

    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [speed, showCursor, onComplete]);

  useEffect(() => {
    if (!instanceRef.current || !isReady) return;

    // 如果文本发生变化
    if (text !== lastTextRef.current) {
      const previousText = lastTextRef.current;
      lastTextRef.current = text;

      if (isComplete) {
        // 如果消息完成，直接显示完整文本
        instanceRef.current
          .delete()
          .type(text, { instant: true })
          .go();
      } else {
        // 流式模式：计算新增的文本
        const newContent = text.substring(previousText.length);
        if (newContent) {
          instanceRef.current
            .type(newContent, { instant: false })
            .go();
        }
      }
    }
  }, [text, isComplete, isReady]);

  return (
    <span 
      ref={elementRef}
      style={{ 
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        display: 'inline-block',
        minHeight: '1.2em'
      }}
    />
  );
};

export default TypeItStreamingMessage; 