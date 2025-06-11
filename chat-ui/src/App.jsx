import React, { useState } from 'react';
import { ConfigProvider, Button } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ChatContainer from './components/Chat/ChatContainer';

// 临时简化版本用于诊断问题
const App = () => {
  const [showChat, setShowChat] = useState(false);
  const [systemStatus, setSystemStatus] = useState({});

  React.useEffect(() => {
    // 检查系统状态
    setTimeout(() => {
      setSystemStatus({
        globalErrorHandler: !!window.globalErrorHandler,
        requestInterceptor: !!window.requestInterceptor,
        react: true,
        antd: true
      });
    }, 1000);
  }, []);

  if (window.location.search.includes('restore=true') || showChat) {
    return (
      <ConfigProvider locale={zhCN}>
        <ChatContainer />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ 
        padding: '20px', 
        minHeight: '100vh', 
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <h1>OpenChatAgent 诊断页面</h1>
        <p>如果你能看到这个页面，说明基础组件运行正常</p>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <h3>系统状态检查</h3>
          <p>✅ React 应用已启动: {systemStatus.react ? '正常' : '异常'}</p>
          <p>✅ Ant Design 组件库已加载: {systemStatus.antd ? '正常' : '异常'}</p>
          <p>✅ 全局错误处理器: {systemStatus.globalErrorHandler ? '已加载' : '未加载'}</p>
          <p>✅ 请求拦截器: {systemStatus.requestInterceptor ? '已加载' : '未加载'}</p>
          <div style={{ marginTop: '16px' }}>
            <h4>控制台日志:</h4>
            <p style={{ fontSize: '12px', color: '#666' }}>
              请检查浏览器控制台是否有错误信息
            </p>
          </div>
        </div>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <Button 
            type="primary"
            onClick={() => setShowChat(true)}
            style={{ marginTop: '10px' }}
          >
            加载聊天界面
          </Button>
          
          <button 
            onClick={() => window.location.href = '?restore=true'}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              background: '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            直接加载完整界面
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              background: '#faad14',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            刷新页面
          </button>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default App;
