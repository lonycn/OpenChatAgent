import React from 'react';
import { MessageList as ChatUIMessageList } from '@chatui/core';

/**
 * 消息列表组件
 * 基于 ChatUI 的 MessageList 组件封装
 */
const MessageList = ({ messages, renderMessageContent }) => {
  return (
    <ChatUIMessageList
      messages={messages}
      renderMessageContent={renderMessageContent}
    />
  );
};

export default MessageList;