import { FC } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MarkdownChatInterface from './components/MarkdownChatInterface';
import 'antd/dist/reset.css';

/**
 * 主应用组件
 * 支持Markdown渲染的智能客服系统
 */
const App: FC = () => {
  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <div className="App" style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
      }}>
        <div style={{
          width: '100%',
          height: '100vh',
          maxWidth: '900px',
          maxHeight: '800px',
          margin: '0 auto',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }} className="chat-container-wrapper">
          <MarkdownChatInterface />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default App;