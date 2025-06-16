import React from 'react';
import { Badge, Button, Space, Typography } from 'antd';
import { 
  WifiOutlined, 
  DisconnectOutlined, 
  LoadingOutlined,
  UserOutlined,
  RobotOutlined,
  ReloadOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { ConnectionStatus, HandoverStatus } from '../types';

const { Text } = Typography;

interface StatusBarProps {
  /** 连接状态 */
  connectionStatus: ConnectionStatus;
  /** 接待状态 */
  handoverStatus: HandoverStatus;
  /** 是否正在输入 */
  isTyping: boolean;
  /** 会话ID */
  sessionId: string | null;
  /** 用户ID */
  userId: string;
  /** 转人工回调 */
  onRequestHandover: () => void;
  /** AI接管回调 */
  onRequestAITakeover: () => void;
  /** 重连回调 */
  onReconnect: () => void;
  /** 清空聊天记录回调 */
  onClearMessages: () => void;
}

/**
 * 状态栏组件 - 显示连接状态和控制按钮
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  connectionStatus,
  handoverStatus,
  isTyping,
  sessionId,
  userId,
  onRequestHandover,
  onRequestAITakeover,
  onReconnect,
  onClearMessages,
}) => {
  // 获取连接状态显示
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          status: 'success' as const,
          icon: <WifiOutlined />,
          text: '已连接',
          color: '#52c41a',
        };
      case 'connecting':
        return {
          status: 'processing' as const,
          icon: <LoadingOutlined spin />,
          text: '连接中',
          color: '#1890ff',
        };
      case 'reconnecting':
        return {
          status: 'processing' as const,
          icon: <LoadingOutlined spin />,
          text: '重连中',
          color: '#faad14',
        };
      case 'disconnected':
      default:
        return {
          status: 'error' as const,
          icon: <DisconnectOutlined />,
          text: '已断开',
          color: '#ff4d4f',
        };
    }
  };

  // 获取接待状态显示
  const getHandoverDisplay = () => {
    return handoverStatus === 'AI' 
      ? {
          icon: <RobotOutlined />,
          text: 'AI助手',
          color: '#1890ff',
        }
      : {
          icon: <UserOutlined />,
          text: '人工客服',
          color: '#52c41a',
        };
  };

  const connectionDisplay = getConnectionDisplay();
  const handoverDisplay = getHandoverDisplay();

  return (
    <div
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      {/* 左侧状态信息 */}
      <Space size="middle">
        {/* 连接状态 */}
        <Badge
          status={connectionDisplay.status}
          text={
            <Space size="small">
              {connectionDisplay.icon}
              <Text style={{ color: connectionDisplay.color, fontSize: '12px' }}>
                {connectionDisplay.text}
              </Text>
            </Space>
          }
        />

        {/* 接待状态 */}
        <Space size="small">
          <span style={{ color: handoverDisplay.color }}>
            {handoverDisplay.icon}
          </span>
          <Text style={{ color: handoverDisplay.color, fontSize: '12px' }}>
            当前接待：{handoverDisplay.text}
          </Text>
        </Space>

        {/* 打字状态 */}
        {isTyping && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <LoadingOutlined spin style={{ marginRight: '4px' }} />
            正在输入...
          </Text>
        )}
      </Space>

      {/* 右侧控制按钮 */}
      <Space size="small">
        {/* 转接按钮 */}
        {handoverStatus === 'AI' ? (
          <Button
            type="primary"
            size="small"
            icon={<UserOutlined />}
            onClick={onRequestHandover}
            disabled={connectionStatus !== 'connected'}
          >
            转人工
          </Button>
        ) : (
          <Button
            type="default"
            size="small"
            icon={<RobotOutlined />}
            onClick={onRequestAITakeover}
            disabled={connectionStatus !== 'connected'}
          >
            AI接管
          </Button>
        )}

        {/* 重连按钮 */}
        {connectionStatus === 'disconnected' && (
          <Button
            type="default"
            size="small"
            icon={<ReloadOutlined />}
            onClick={onReconnect}
          >
            重连
          </Button>
        )}

        {/* 清空按钮 */}
        <Button
          type="text"
          size="small"
          icon={<ClearOutlined />}
          onClick={onClearMessages}
          title="清空聊天记录"
        />
      </Space>

      {/* 会话信息（小屏幕时换行显示） */}
      {sessionId && (
        <div style={{ width: '100%', marginTop: '4px' }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            会话ID: {sessionId.slice(-8)} | 用户ID: {userId.slice(-8)}
          </Text>
        </div>
      )}
    </div>
  );
};

export default StatusBar; 