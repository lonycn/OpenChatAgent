import React, { useEffect, useRef, useState } from 'react';
import { Chat, Bubble } from './chatui';
import './chatui/styles/index.less';
import StatusBar from './components/StatusBar';
import { useChat } from './hooks/useChat';
import StreamingDemo from './components/StreamingDemo';
import StreamingText from './components/StreamingText';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * 主应用组件 - 基于阿里巴巴官方ChatUI
 * 集成WebSocket、状态管理、转人工等完整功能
 */
const App = () => {
  const [showDemo, setShowDemo] = useState(false);

  const {
    messages,
    connectionHealth,
    sessionId,
    handoverStatus,
    isTyping,
    handleSend,
    handleHandoverRequest,
  } = useChat();

  // 用于自动滚动的引用
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  // 当消息更新时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // 渲染消息内容
  const renderMessageContent = (msg) => {
    const { content, _isStreaming } = msg;
    
    console.log('🎨 渲染消息:', {
      id: msg._id,
      text: content?.text?.substring(0, 50) + '...',
      _isStreaming,
      msgKeys: Object.keys(msg)
    });
    
    // 如果是流式消息，使用StreamingText组件
    if (_isStreaming) {
      console.log('🔄 使用StreamingText组件渲染');
      return (
        <Bubble type="text">
          <StreamingText 
            value={content.text} 
            speed={15} // 进一步提高速度，减少卡顿感
            onComplete={() => {
              console.log('✅ 流式消息显示完成');
            }}
          />
        </Bubble>
      );
    }
    
    // 普通消息使用Markdown渲染
    console.log('📝 使用Markdown渲染');
    return (
      <Bubble type="text">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // 自定义样式 - 修复嵌套问题
            p: ({children}) => <div style={{margin: '0.5em 0', lineHeight: '1.6'}}>{children}</div>,
            code: ({children}) => <code style={{
              backgroundColor: '#f5f5f5',
              padding: '2px 4px',
              borderRadius: '3px',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '0.9em'
            }}>{children}</code>,
            pre: ({children}) => <div style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '6px',
              overflow: 'auto',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '0.9em',
              whiteSpace: 'pre-wrap'
            }}>{children}</div>,
            ul: ({children}) => <ul style={{margin: '0.5em 0', paddingLeft: '1.5em'}}>{children}</ul>,
            ol: ({children}) => <ol style={{margin: '0.5em 0', paddingLeft: '1.5em'}}>{children}</ol>,
            blockquote: ({children}) => <div style={{
              borderLeft: '4px solid #ddd',
              paddingLeft: '12px',
              margin: '0.5em 0',
              color: '#666',
              fontStyle: 'italic'
            }}>{children}</div>,
          }}
        >
          {content.text}
        </ReactMarkdown>
      </Bubble>
    );
  };

  // 渲染导航栏
  const renderNavbar = () => (
    <div style={{
      padding: '12px 16px',
      background: '#fff',
      borderBottom: '1px solid #e8e8e8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{
        margin: 0,
        fontSize: '16px',
        fontWeight: '500',
        color: '#333'
      }}>
        OpenChatAgent - 智能客服
      </h1>
    </div>
  );

  // 处理快捷回复点击
  const handleQuickReplyClick = (item) => {
    if (item.name === '转人工') {
      handleHandoverRequest();
    } else if (item.name === 'AI接管') {
      handleHandoverRequest();
    } else {
      // 直接调用handleSend，它会返回Promise
      handleSend('text', item.name);
    }
  };

  // 根据当前状态动态生成快捷回复
  const getQuickReplies = () => {
    const baseReplies = [
      { name: '你好', isNew: false, isHighlight: false },
      { name: '帮助', isNew: false, isHighlight: false },
    ];

    // 根据当前接待状态添加转接按钮
    if (handoverStatus === 'AI') {
      baseReplies.push({ name: '转人工', isNew: false, isHighlight: true });
    } else {
      baseReplies.push({ name: 'AI接管', isNew: false, isHighlight: true });
    }

    return baseReplies;
  };

  if (showDemo) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px", borderBottom: "1px solid #eee" }}>
          <button 
            onClick={() => setShowDemo(false)}
            style={{ 
              padding: "8px 16px", 
              backgroundColor: "#1890ff", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            返回聊天
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <StreamingDemo />
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f5f5f5'
    }}>
      {/* 自定义导航栏 */}
      {renderNavbar()}
      
      {/* 简化的状态栏 */}
      <div
        style={{
          padding: "8px 16px",
          backgroundColor: "#f5f5f5",
          borderBottom: "1px solid #e0e0e0",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* 连接状态 */}
        <span
          style={{
            color: connectionHealth === 'connected' ? "#52c41a" : "#ff4d4f",
            fontWeight: "500",
          }}
        >
          ● {connectionHealth === 'connected' ? "已连接" : "未连接"}
        </span>

        {/* 用户信息 */}
        <span style={{ color: "#666" }}>
          {sessionId ? `会话: ${sessionId.slice(0, 8)}...` : "访客用户"}
        </span>

        {/* 转人工按钮 */}
        <button
          onClick={handleHandoverRequest}
          disabled={handoverStatus !== 'AI'}
          style={{
            padding: "4px 12px",
            backgroundColor: handoverStatus === 'AI' ? "#1890ff" : "#d9d9d9",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: handoverStatus === 'AI' ? "pointer" : "not-allowed",
          }}
        >
          转人工
        </button>

        {/* 刷新按钮 */}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "4px 12px",
            backgroundColor: "#52c41a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          刷新
        </button>
      </div>

      {/* 聊天容器 */}
      <div style={{ 
        flex: 1, 
        position: 'relative',
        overflow: 'hidden' // 防止外层滚动
      }}>
        <Chat
          messages={messages}
          renderMessageContent={renderMessageContent}
          onSend={handleSend}
          placeholder={`向${handoverStatus === 'AI' ? 'AI助手' : '人工客服'}发送消息...`}
          quickReplies={getQuickReplies()}
          onQuickReplyClick={handleQuickReplyClick}
        />
        
        {/* 用于自动滚动的锚点 */}
        <div 
          ref={messagesEndRef} 
          style={{ 
            height: '1px',
            position: 'absolute',
            bottom: '80px', // 留出输入框的空间
            width: '100%'
          }} 
        />
      </div>
    </div>
  );
};

export default App; 