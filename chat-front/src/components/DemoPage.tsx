import React, { useState } from 'react';
import { Card, Space, Button, Typography, Divider, Tag } from 'antd';
import { RobotOutlined, UserOutlined, ApiOutlined } from '@ant-design/icons';
import { ChatInterface } from './ChatInterface';

const { Title, Paragraph, Text } = Typography;

/**
 * 演示页面 - 展示 Chat Front 的各种功能
 */
export const DemoPage: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return <ChatInterface />;
  }

  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <RobotOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={2}>OpenChatAgent - Chat Front</Title>
          <Paragraph type="secondary">
            基于 Ant Design X 构建的现代化智能客服前端系统
          </Paragraph>
          
          <Space size="middle" style={{ marginTop: '16px' }}>
            <Tag color="blue">React 18</Tag>
            <Tag color="green">TypeScript</Tag>
            <Tag color="orange">Ant Design X</Tag>
            <Tag color="purple">WebSocket</Tag>
            <Tag color="cyan">流式消息</Tag>
          </Space>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* 核心功能 */}
        <Card 
          title={
            <Space>
              <ApiOutlined />
              核心功能
            </Space>
          }
          hoverable
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>✅ 实时通信</Text>
              <br />
              <Text type="secondary">WebSocket 长连接，自动重连机制</Text>
            </div>
            <div>
              <Text strong>✅ 流式消息</Text>
              <br />
              <Text type="secondary">基于 XStream 的流式文本处理</Text>
            </div>
            <div>
              <Text strong>✅ 状态管理</Text>
              <br />
              <Text type="secondary">连接状态、接待状态智能切换</Text>
            </div>
            <div>
              <Text strong>✅ 打字机效果</Text>
              <br />
              <Text type="secondary">流畅的逐字显示动画</Text>
            </div>
          </Space>
        </Card>

        {/* 技术特性 */}
        <Card 
          title={
            <Space>
              <RobotOutlined />
              技术特性
            </Space>
          }
          hoverable
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>🎨 Ant Design X</Text>
              <br />
              <Text type="secondary">专业的聊天 UI 组件库</Text>
            </div>
            <div>
              <Text strong>🔒 TypeScript</Text>
              <br />
              <Text type="secondary">完整的类型安全保障</Text>
            </div>
            <div>
              <Text strong>📱 响应式设计</Text>
              <br />
              <Text type="secondary">移动端友好的界面</Text>
            </div>
            <div>
              <Text strong>⚡ 高性能</Text>
              <br />
              <Text type="secondary">优化的渲染和内存管理</Text>
            </div>
          </Space>
        </Card>

        {/* 用户体验 */}
        <Card 
          title={
            <Space>
              <UserOutlined />
              用户体验
            </Space>
          }
          hoverable
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>🎯 智能路由</Text>
              <br />
              <Text type="secondary">AI 优先，人工接管</Text>
            </div>
            <div>
              <Text strong>💬 消息状态</Text>
              <br />
              <Text type="secondary">发送中、已送达、错误状态</Text>
            </div>
            <div>
              <Text strong>🔄 自动重连</Text>
              <br />
              <Text type="secondary">网络异常自动恢复</Text>
            </div>
            <div>
              <Text strong>📊 状态监控</Text>
              <br />
              <Text type="secondary">实时连接和会话状态</Text>
            </div>
          </Space>
        </Card>
      </div>

      <Divider />

      <Card>
        <div style={{ textAlign: 'center' }}>
          <Title level={3}>开始体验</Title>
          <Paragraph>
            点击下方按钮启动聊天界面，体验完整的智能客服功能
          </Paragraph>
          <Button 
            type="primary" 
            size="large"
            icon={<RobotOutlined />}
            onClick={() => setShowDemo(true)}
            style={{ marginTop: '16px' }}
          >
            启动聊天界面
          </Button>
        </div>
      </Card>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Text type="secondary">
          OpenChatAgent Chat Front v1.0.0 | 基于 Ant Design X 构建
        </Text>
      </div>
    </div>
  );
};

export default DemoPage; 