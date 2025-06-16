import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Avatar, Spin, Alert, Tag } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const SimpleChatInterface = ({ 
  messages, 
  onSend, 
  input, 
  onInputChange, 
  loading,
  helloMessage,
  placeholder 
}) => {
  const messagesEndRef = useRef(null);
  const [inputHeight, setInputHeight] = useState(32);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input.trim());
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 'user':
        return {
          avatar: <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />,
          name: '我',
          align: 'right',
          bgColor: '#e6f7ff'
        };
      case 'assistant':
        return {
          avatar: <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />,
          name: 'AI助手',
          align: 'left',
          bgColor: '#f6ffed'
        };
      case 'system':
        return {
          avatar: <Avatar style={{ backgroundColor: '#faad14' }}>系</Avatar>,
          name: '系统',
          align: 'center',
          bgColor: '#fffbe6'
        };
      default:
        return {
          avatar: <Avatar>{role?.charAt(0)?.toUpperCase() || '?'}</Avatar>,
          name: role || '未知',
          align: 'left',
          bgColor: '#f5f5f5'
        };
    }
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#fafafa'
    }}>
      {/* 消息列表区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '16px',
        background: '#fff'
      }}>
        {helloMessage && messages.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#666'
          }}>
            <RobotOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>
              {helloMessage}
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>
              请输入您的问题，我会尽力为您解答
            </div>
          </div>
        )}

        <List
          dataSource={messages}
          renderItem={(message, index) => {
            const roleInfo = getRoleInfo(message.role);
            const isUser = message.role === 'user';
            const isSystem = message.role === 'system';
            
            return (
              <List.Item
                key={message.id || index}
                style={{ 
                  border: 'none',
                  padding: '8px 0',
                  justifyContent: isUser ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  maxWidth: isSystem ? '100%' : '70%',
                  width: isSystem ? '100%' : 'auto'
                }}>
                  {!isSystem && (
                    <div style={{ 
                      margin: isUser ? '0 0 0 8px' : '0 8px 0 0',
                      flexShrink: 0
                    }}>
                      {roleInfo.avatar}
                    </div>
                  )}
                  
                  <div style={{
                    background: isSystem ? roleInfo.bgColor : (isUser ? '#1890ff' : '#f0f0f0'),
                    color: isUser ? '#fff' : '#000',
                    padding: isSystem ? '8px 16px' : '12px 16px',
                    borderRadius: isSystem ? '4px' : '18px',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                    textAlign: isSystem ? 'center' : 'left',
                    border: isSystem ? '1px solid #d9d9d9' : 'none'
                  }}>
                    {isSystem && (
                      <Tag color="orange" style={{ marginBottom: '4px' }}>
                        {roleInfo.name}
                      </Tag>
                    )}
                    <div style={{ 
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {message.content}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      marginTop: '4px',
                      opacity: 0.7,
                      textAlign: isUser ? 'right' : 'left'
                    }}>
                      {formatTime(message.createTime)}
                    </div>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
        
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}>
            <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a', marginRight: '8px' }} />
            <Spin size="small" style={{ marginRight: '8px' }} />
            <span style={{ color: '#666' }}>AI正在思考中...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div style={{ 
        padding: '16px',
        background: '#fff',
        borderTop: '1px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <TextArea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || '请输入您的问题...'}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ flex: 1 }}
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            disabled={!input.trim()}
            style={{ height: 'auto', minHeight: '32px' }}
          >
            发送
          </Button>
        </div>
        
        <div style={{ 
          fontSize: '12px', 
          color: '#999', 
          marginTop: '8px',
          textAlign: 'center'
        }}>
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    </div>
  );
};

export default SimpleChatInterface; 