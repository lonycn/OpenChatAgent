import React from 'react';
import ChatContainer from './Chat/ChatContainer';

// 调试计数器
let robustRenderCount = 0;

/**
 * 健壮的聊天容器组件
 * 使用新的 ChatUI 框架
 */
const RobustChatContainer = () => {
  robustRenderCount++;
  console.log(`🔄 RobustChatContainer渲染次数: ${robustRenderCount}`);
  
  if (robustRenderCount > 10) {
    console.error('🚨 RobustChatContainer异常高频渲染，可能存在无限循环！');
  }

  return <ChatContainer />;
};

export default RobustChatContainer;