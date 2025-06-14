import React, { useState } from 'react';
import { Composer } from '@chatui/core';

/**
 * 消息输入组件
 * 基于 ChatUI 的 Composer 组件封装
 */
const MessageInput = ({ onSend, placeholder = "请输入消息...", disabled = false }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = (type, val) => {
    if (type === 'text' && val.trim()) {
      onSend(type, val);
      setInputValue('');
    }
  };

  const handleInputChange = (val) => {
    setInputValue(val);
  };

  return (
    <Composer
      value={inputValue}
      placeholder={placeholder}
      onSend={handleSend}
      onChange={handleInputChange}
      disabled={disabled}
    />
  );
};

export default MessageInput;