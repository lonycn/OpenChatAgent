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
      <div className="App">
        <MarkdownChatInterface />
      </div>
    </ConfigProvider>
  );
};

export default App; 