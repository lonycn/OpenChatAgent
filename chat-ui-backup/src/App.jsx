import React, { useState, useEffect, useRef } from 'react';
import RobustChatContainer from './components/RobustChatContainer';
import '@chatui/core/dist/index.css';

// 调试计数器
let renderCount = 0;
let effectCount = 0;

// 临时简化版本用于诊断问题
const App = () => {
  const [showChat, setShowChat] = useState(false);
  const [systemStatus, setSystemStatus] = useState({});
  const [debugInfo, setDebugInfo] = useState({ renders: 0, effects: 0, errors: [] });
  const mountedRef = useRef(false);
  
  // 增加渲染计数
  renderCount++;
  console.log(`🔄 App组件渲染次数: ${renderCount}`);
  
  // 错误边界处理
  useEffect(() => {
    const handleError = (error) => {
      console.error('🚨 全局错误捕获:', error);
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, { time: new Date().toLocaleTimeString(), message: error.message || error.toString() }]
      }));
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason);
    });
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      console.warn('⚠️ App组件重复挂载，可能存在无限渲染问题');
      return;
    }
    mountedRef.current = true;
    
    effectCount++;
    console.log(`🔧 App useEffect执行次数: ${effectCount}`);
    
    // 检查系统状态
    const timer = setTimeout(() => {
      setSystemStatus({
        globalErrorHandler: !!window.globalErrorHandler,
        requestInterceptor: !!window.requestInterceptor,
        react: true,
        chatui: true
      });
      
      setDebugInfo(prev => ({
        ...prev,
        renders: renderCount,
        effects: effectCount
      }));
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
    };
  }, []);

  if (window.location.search.includes('restore=true') || showChat) {
    return <RobustChatContainer />;
  }

  return (
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
        <p>✅ ChatUI 组件库已加载: {systemStatus.chatui ? '正常' : '异常'}</p>
        <p>✅ 全局错误处理器: {systemStatus.globalErrorHandler ? '已加载' : '未加载'}</p>
        <p>✅ 请求拦截器: {systemStatus.requestInterceptor ? '已加载' : '未加载'}</p>
        
        <div style={{ marginTop: '16px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
          <h4>🔍 调试信息:</h4>
          <p>🔄 组件渲染次数: <strong style={{ color: debugInfo.renders > 10 ? 'red' : 'green' }}>{debugInfo.renders}</strong></p>
          <p>🔧 Effect执行次数: <strong style={{ color: debugInfo.effects > 5 ? 'red' : 'green' }}>{debugInfo.effects}</strong></p>
          {debugInfo.renders > 10 && (
            <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ 检测到异常高频渲染，可能存在无限循环！</p>
          )}
          {debugInfo.errors.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <h5 style={{ color: 'red' }}>🚨 错误日志:</h5>
              {debugInfo.errors.slice(-3).map((error, index) => (
                <p key={index} style={{ fontSize: '12px', color: 'red', margin: '4px 0' }}>
                  [{error.time}] {error.message}
                </p>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '16px' }}>
          <h4>控制台日志:</h4>
          <p style={{ fontSize: '12px', color: '#666' }}>
            请检查浏览器控制台是否有错误信息
          </p>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setShowChat(true)}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          加载聊天界面
        </button>
        
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
  );
};

export default App;
