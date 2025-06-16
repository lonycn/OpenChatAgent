import { useState, useMemo, useCallback } from 'react';
import { getRandomString } from '../utils';
import { MessageProps as BaseMessageProps, MessageId } from '../components/Message';

// 扩展MessageProps以支持_originalId和_isStreaming
type MessageProps = BaseMessageProps & {
  _originalId?: MessageId;
  _isStreaming?: boolean;
};

type Messages = MessageProps[];

type MessageWithoutId = Omit<MessageProps, '_id'> & {
  _id?: MessageId;
};

// 流式消息数据结构
type StreamingData = {
  id: MessageId;
  fullText: string;
  isComplete: boolean;
  [key: string]: any;
};

const TIME_GAP = 5 * 60 * 1000;
let lastTs = 0;

const makeMsg = (msg: MessageWithoutId, id?: MessageId) => {
  const ts = msg.createdAt || Date.now();
  const hasTime = msg.hasTime || ts - lastTs > TIME_GAP;

  if (hasTime) {
    lastTs = ts;
  }

  return {
    ...msg, // 保留所有原始属性，包括_isStreaming等自定义属性
    _id: msg._id || id || getRandomString(),
    createdAt: ts,
    position: msg.position || 'left',
    hasTime,
  };
};

export default function useMessages(initialState: MessageWithoutId[] = []) {
  const initialMsgs: Messages = useMemo(() => initialState.map((t) => makeMsg(t)), [initialState]);
  const [messages, setMessages] = useState(initialMsgs);

  const prependMsgs = useCallback((msgs: Messages) => {
    setMessages((prev: Messages) => [...msgs, ...prev]);
  }, []);

  const updateMsg = useCallback((id: MessageId, msg: MessageWithoutId) => {
    setMessages((prev) => prev.map((t) => (t._id === id ? makeMsg(msg, id) : t)));
  }, []);

  const appendMsg = useCallback((msg: MessageWithoutId) => {
    const newMsg = makeMsg(msg);
    setMessages((prev) => [...prev, newMsg]);
    return newMsg._id;
  }, []);

  // 新增：流式消息处理方法
  const appendMsgStream = useCallback((streamData: StreamingData, msgTemplate?: Partial<MessageWithoutId>) => {
    const { id, fullText, isComplete, ...otherData } = streamData;
    
    console.log('📝 appendMsgStream调用:', {
      id,
      fullText: fullText.substring(0, 50) + '...',
      isComplete,
      msgTemplate,
      '_isStreaming in msgTemplate': msgTemplate?._isStreaming
    });
    
    setMessages((prev) => {
      // 使用_originalId来查找现有的流式消息 - 确保精确匹配
      const existingIndex = prev.findIndex(msg => 
        msg._originalId === id && msg._originalId !== undefined
      );

      if (existingIndex >= 0) {
        // 更新现有消息 - 保持原始时间戳和位置
        const existingMsg = prev[existingIndex];
        const baseMsg: MessageWithoutId = {
          type: 'text',
          content: { text: fullText },
          position: 'left',
          _originalId: id,
          createdAt: existingMsg.createdAt, // 保持原始创建时间
          hasTime: existingMsg.hasTime, // 保持时间显示状态
          ...otherData,
          ...msgTemplate, // msgTemplate放在最后，确保_isStreaming等属性不被覆盖
        };

        // 完成时使用原始ID，流式中使用临时ID
        const finalId = isComplete ? id : `${id}_streaming_${existingMsg.createdAt}`;
        const updatedMsg = {
          ...baseMsg,
          _id: finalId,
          _originalId: id,
          _isStreaming: baseMsg._isStreaming, // 确保_isStreaming属性被保留
        };

        const newMessages = [...prev];
        newMessages[existingIndex] = updatedMsg;
        return newMessages;
      } else {
        // 添加新消息 - 使用当前时间戳，确保消息出现在底部
        const now = Date.now();
        const baseMsg: MessageWithoutId = {
          type: 'text',
          content: { text: fullText },
          position: 'left',
          _originalId: id,
          createdAt: now, // 使用当前时间确保消息在底部
          ...otherData,
          ...msgTemplate, // msgTemplate放在最后，确保_isStreaming等属性不被覆盖
        };

        // 完成时使用原始ID，流式中使用临时ID
        const finalId = isComplete ? id : `${id}_streaming_${now}`;
        const newMsg = makeMsg(baseMsg, finalId);
        
        // 确保新消息添加到数组末尾（底部），并保留所有自定义属性
        return [...prev, { ...newMsg, _originalId: id, _isStreaming: baseMsg._isStreaming }];
      }
    });

    return isComplete ? id : `${id}_streaming`;
  }, []);

  const deleteMsg = useCallback((id: MessageId) => {
    setMessages((prev) => prev.filter((t) => t._id !== id));
  }, []);

  const resetList = useCallback((list = []) => {
    setMessages(list);
  }, []);

  return {
    messages,
    prependMsgs,
    appendMsg,
    appendMsgStream, // 新增的流式消息方法
    updateMsg,
    deleteMsg,
    resetList,
  };
}
