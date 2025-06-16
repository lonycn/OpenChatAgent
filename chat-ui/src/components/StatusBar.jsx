import React from 'react';

/**
 * 状态栏组件 - 显示连接状态、接待者信息和切换按钮
 * 基于官方ChatUI设计风格
 */
const StatusBar = ({
  connectionHealth,
  reconnectInfo,
  handoverStatus,
  onHandoverRequest,
  sessionId,
  userId
}) => {
  // 获取连接状态颜色
  const getStatusColor = () => {
    switch (connectionHealth) {
      case 'connected': return '#52c41a';
      case 'reconnecting': return '#faad14';
      case 'disconnected': 
      case 'error':
      case 'failed': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (connectionHealth) {
      case 'connected': return '已连接';
      case 'reconnecting': return reconnectInfo ? `重连中 (${reconnectInfo.attempt}/${reconnectInfo.maxAttempts})` : '重连中';
      case 'disconnected': return '已断开';
      case 'error': return '连接错误';
      case 'failed': return '连接失败';
      default: return '未知状态';
    }
  };

  return (
    <div style={{
      padding: '8px 16px',
      background: '#f5f5f5',
      borderBottom: '1px solid #e8e8e8',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 连接状态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor()
          }} />
          <span style={{ color: '#666' }}>
            {getStatusText()}
          </span>
        </div>
        
        {/* 接待者状态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#666' }}>当前接待:</span>
          <span style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: handoverStatus === 'AI' ? '#e6f7ff' : '#f6ffed',
            color: handoverStatus === 'AI' ? '#1890ff' : '#52c41a',
            fontWeight: '500'
          }}>
            {handoverStatus === 'AI' ? '🤖 AI助手' : '👨‍💼 人工客服'}
          </span>
        </div>

        {/* 会话信息 */}
        {(sessionId || userId) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#999' }}>
            {sessionId && <span>会话: {sessionId.slice(0, 8)}...</span>}
            {userId && <span>用户: {userId.slice(0, 8)}...</span>}
          </div>
        )}
      </div>
      
      {/* 切换按钮 */}
      <button
        onClick={onHandoverRequest}
        disabled={connectionHealth !== 'connected'}
        style={{
          padding: '4px 12px',
          fontSize: '12px',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          background: connectionHealth === 'connected' ? 'white' : '#f5f5f5',
          color: connectionHealth === 'connected' ? '#333' : '#999',
          cursor: connectionHealth === 'connected' ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          fontWeight: '500'
        }}
        onMouseEnter={(e) => {
          if (connectionHealth === 'connected') {
            e.target.style.borderColor = '#1890ff';
            e.target.style.color = '#1890ff';
          }
        }}
        onMouseLeave={(e) => {
          if (connectionHealth === 'connected') {
            e.target.style.borderColor = '#d9d9d9';
            e.target.style.color = '#333';
          }
        }}
      >
        {handoverStatus === 'AI' ? '转人工' : 'AI接管'}
      </button>
    </div>
  );
};

export default StatusBar; 