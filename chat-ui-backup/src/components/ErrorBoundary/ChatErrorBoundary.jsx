import React from 'react';
import { Alert, Button, Card, Space } from 'antd';

class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ChatErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // 记录错误到全局变量供调试
    if (!window.chatErrors) {
      window.chatErrors = [];
    }
    window.chatErrors.push({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date(),
      retryCount: this.state.retryCount
    });

    // 🚨 发送错误到全局错误处理器和后端日志
    try {
      if (window.globalErrorHandler) {
        window.globalErrorHandler.logError(
          `React Error Boundary: ${error.message}`,
          {
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            retryCount: this.state.retryCount,
            isProChatError: error.message?.includes('enableHistoryCount') || 
                           error.stack?.includes('pro-chat')
          },
          'ERROR'
        );
      }
    } catch (logError) {
      console.warn('Failed to log error to global handler:', logError);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isProChatError = this.state.error?.message?.includes('enableHistoryCount') ||
                           this.state.error?.stack?.includes('pro-chat');

      return (
        <div style={{ 
          padding: '20px', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Card 
            title="🚨 聊天组件错误" 
            style={{ maxWidth: 600, width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {isProChatError ? (
                <Alert
                  type="error"
                  message="ProChat 组件配置错误"
                  description="ProChat 组件内部状态异常，可能是由于配置冲突导致。正在尝试修复..."
                  showIcon
                />
              ) : (
                <Alert
                  type="error"
                  message="聊天界面出现错误"
                  description={this.state.error?.message || '未知错误'}
                  showIcon
                />
              )}

              <div style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '4px',
                fontSize: '12px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <strong>错误详情:</strong>
                <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                  {this.state.error?.stack || '无详细信息'}
                </pre>
              </div>

              <div style={{ 
                textAlign: 'center',
                marginTop: '16px'
              }}>
                <Space>
                  <Button 
                    type="primary" 
                    onClick={this.handleRetry}
                    disabled={this.state.retryCount >= 3}
                  >
                    重试 ({this.state.retryCount}/3)
                  </Button>
                  <Button onClick={this.handleReload}>
                    刷新页面
                  </Button>
                </Space>
              </div>

              {this.state.retryCount >= 3 && (
                <Alert
                  type="warning"
                  message="多次重试失败"
                  description="建议刷新页面或联系技术支持。错误已记录到 window.chatErrors 供调试。"
                  showIcon
                />
              )}

              <div style={{ fontSize: '12px', color: '#666', marginTop: '16px' }}>
                <p><strong>调试信息:</strong></p>
                <p>• 时间: {new Date().toLocaleString()}</p>
                <p>• 重试次数: {this.state.retryCount}</p>
                <p>• 错误类型: {isProChatError ? 'ProChat配置错误' : '通用错误'}</p>
                <p>• 解决建议: {isProChatError ? '检查ProChat配置参数' : '检查网络连接和服务状态'}</p>
              </div>
            </Space>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary; 