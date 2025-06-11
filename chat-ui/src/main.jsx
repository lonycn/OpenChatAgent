import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'antd/dist/reset.css'; // Ant Design global reset CSS
import './index.css'

// 🚨 在应用启动时立即初始化拦截器和错误处理器
import './utils/requestInterceptor';
import './utils/globalErrorHandler';

console.log('🚀 OpenChatAgent 前端应用启动');
console.log('✅ HTTP请求拦截器已激活');
console.log('✅ 全局错误处理器已激活');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
