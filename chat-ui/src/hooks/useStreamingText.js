import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 流式文本Hook - 专门处理WebSocket流式数据的打字机效果
 * @param {Object} options 配置选项
 * @returns {Object} 包含显示文本和控制方法的对象
 */
export const useStreamingText = (options = {}) => {
  const {
    speed = 50, // 打字速度(毫秒)
    enableTypewriter = true, // 是否启用打字机效果
    onComplete = null, // 完成回调
    onChunkReceived = null, // 接收到新块时的回调
  } = options;

  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const fullTextRef = useRef("");
  const currentIndexRef = useRef(0);
  const timerRef = useRef(null);
  const isStreamingRef = useRef(false);

  // 清理定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 开始打字动画
  const startTyping = useCallback(() => {
    if (!enableTypewriter) {
      setDisplayText(fullTextRef.current);
      setIsComplete(true);
      setIsTyping(false);
      if (onComplete) onComplete();
      return;
    }

    setIsTyping(true);
    setIsComplete(false);

    const typeNextChar = () => {
      const currentIndex = currentIndexRef.current;
      const fullText = fullTextRef.current;

      if (currentIndex < fullText.length) {
        setDisplayText(fullText.substring(0, currentIndex + 1));
        currentIndexRef.current = currentIndex + 1;

        timerRef.current = setTimeout(typeNextChar, speed);
      } else {
        setIsTyping(false);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    };

    typeNextChar();
  }, [speed, enableTypewriter, onComplete]);

  // 更新流式文本
  const updateStreamText = useCallback(
    (newText, isStreamComplete = false) => {
      const previousText = fullTextRef.current;
      fullTextRef.current = newText;
      isStreamingRef.current = !isStreamComplete;

      // 如果是新的文本或者文本增长了
      if (newText !== previousText) {
        if (onChunkReceived) {
          onChunkReceived(newText, isStreamComplete);
        }

        // 如果启用打字机效果
        if (enableTypewriter) {
          // 如果当前没有在打字，开始打字
          if (!isTyping) {
            currentIndexRef.current = displayText.length;
            startTyping();
          }
          // 如果正在打字，让现有的打字动画继续，它会自动处理新增的文本
        } else {
          // 不启用打字机效果，直接显示
          setDisplayText(newText);
          setIsComplete(isStreamComplete);
        }
      }

      // 如果流式传输完成
      if (isStreamComplete) {
        isStreamingRef.current = false;
      }
    },
    [
      displayText.length,
      isTyping,
      enableTypewriter,
      startTyping,
      onChunkReceived,
    ]
  );

  // 重置状态
  const reset = useCallback(() => {
    clearTimer();
    setDisplayText("");
    setIsTyping(false);
    setIsComplete(false);
    fullTextRef.current = "";
    currentIndexRef.current = 0;
    isStreamingRef.current = false;
  }, [clearTimer]);

  // 立即完成显示
  const complete = useCallback(() => {
    clearTimer();
    setDisplayText(fullTextRef.current);
    setIsTyping(false);
    setIsComplete(true);
    currentIndexRef.current = fullTextRef.current.length;
    if (onComplete) onComplete();
  }, [clearTimer, onComplete]);

  // 清理副作用
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    displayText,
    isTyping,
    isComplete,
    isStreaming: isStreamingRef.current,
    updateStreamText,
    reset,
    complete,
    fullText: fullTextRef.current,
  };
};
