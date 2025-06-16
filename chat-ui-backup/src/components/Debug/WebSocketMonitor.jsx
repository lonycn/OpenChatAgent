import React, { useState, useEffect } from 'react';
import { Card, Badge, Typography, List, Button, Space, Alert, Progress, Tabs, Tag } from 'antd';
import { ReloadOutlined, DeleteOutlined, ExportOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

const WebSocketMonitor = ({ 
  websocketService, 
  isConnected, 
  sessionId, 
  interceptorStats = {}, 
  requestInterceptor 
}) => {
  const [logs, setLogs] = useState([]);
  const [httpBlocks, setHttpBlocks] = useState([]);
  const [interceptorLogs, setInterceptorLogs] = useState([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    blockedRequests: 0,
    connectionUptime: 0
  });

  useEffect(() => {
    // 监控被阻止的HTTP请求
    const checkBlockedRequests = () => {
      if (window.blockedRequests) {
        setHttpBlocks([...window.blockedRequests].reverse().slice(0, 20));
        setStats(prev => ({ 
          ...prev, 
          blockedRequests: window.blockedRequests.length 
        }));
      }

      // 获取拦截器日志
      if (requestInterceptor) {
        const logs = requestInterceptor.getLogs();
        setInterceptorLogs(logs.slice(-50).reverse()); // 最新50条
      }
    };

    const interval = setInterval(checkBlockedRequests, 1000);
    return () => clearInterval(interval);
  }, [requestInterceptor]);

  const addLog = (type, message, data = {}) => {
    const logEntry = {
      id: Date.now(),
      type,
      message,
      data,
      timestamp: new Date()
    };
    
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]); // 保持最新50条
  };

  useEffect(() => {
    addLog('info', `WebSocket 连接状态: ${isConnected ? '已连接' : '未连接'}`);
  }, [isConnected]);

  useEffect(() => {
    if (sessionId) {
      addLog('success', `会话已建立: ${sessionId}`);
    }
  }, [sessionId]);

  const getStatusColor = () => {
    if (!isConnected) return 'error';
    if (httpBlocks.length > 0) return 'warning';
    return 'success';
  };

  const clearAllData = () => {
    setLogs([]);
    setHttpBlocks([]);
    setInterceptorLogs([]);
    if (window.blockedRequests) {
      window.blockedRequests = [];
    }
    if (window.interceptorLogs) {
      window.interceptorLogs = [];
    }
    if (requestInterceptor) {
      requestInterceptor.clearStats();
    }
  };

  const exportLogs = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      sessionId,
      isConnected,
      stats,
      interceptorStats,
      logs,
      httpBlocks,
      interceptorLogs: interceptorLogs.slice(0, 100), // 限制导出数量
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `websocket-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogTypeColor = (type) => {
    switch (type.toUpperCase()) {
      case 'ERROR': return 'red';
      case 'WARN': return 'orange';
      case 'INFO': return 'blue';
      case 'DEBUG': return 'default';
      default: return 'default';
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'axios': return 'green';
      case 'fetch': return 'blue';
      case 'xhr': return 'orange';
      case 'axios-wildcard': return 'purple';
      default: return 'default';
    }
  };

  return (
    <Card 
      size="small" 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🔍 调试监控面板</span>
          <Space>
            <Button 
              size="small" 
              icon={<ExportOutlined />} 
              onClick={exportLogs}
              title="导出调试数据"
            >
              导出
            </Button>
            <Button 
              size="small" 
              icon={<DeleteOutlined />} 
              onClick={clearAllData}
              danger
              title="清空所有数据"
            >
              清空
            </Button>
          </Space>
        </div>
      }
      style={{ height: '100vh', overflow: 'auto' }}
    >
      {/* 状态概览 */}
      <div style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>连接状态: </Text>
            <Badge status={getStatusColor()} text={isConnected ? "已连接" : "未连接"} />
          </div>
          
          <div>
            <Text strong>会话ID: </Text>
            <Text code>{sessionId ? `${sessionId.substring(0, 12)}...` : '未建立'}</Text>
          </div>
          
          <div>
            <Text strong>拦截统计: </Text>
            <Text type="danger">{interceptorStats.totalBlocked || 0} 个请求被阻止</Text>
          </div>

          {interceptorStats.totalBlocked > 0 && (
            <Progress 
              percent={Math.min(100, (interceptorStats.totalBlocked / 10) * 100)} 
              size="small"
              status={interceptorStats.totalBlocked > 5 ? 'exception' : 'active'}
              format={() => `${interceptorStats.totalBlocked} 拦截`}
            />
          )}
        </Space>
      </div>

      {/* HTTP请求警告 */}
      {httpBlocks.length > 0 && (
        <Alert
          type="warning"
          message={`检测到 ${httpBlocks.length} 个被阻止的HTTP请求`}
          description="ProChat可能仍在尝试发送HTTP请求，已被专业拦截器阻止"
          showIcon
          style={{ marginBottom: 12 }}
          action={
            <Button size="small" onClick={() => setHttpBlocks([])}>
              忽略
            </Button>
          }
        />
      )}

      {/* 标签页内容 */}
      <Tabs size="small" type="card">
        <TabPane tab={`HTTP拦截 (${httpBlocks.length})`} key="http">
          <List
            size="small"
            dataSource={httpBlocks.slice(0, 10)}
            renderItem={(item, index) => (
              <List.Item style={{ padding: '8px 0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Tag color={getSourceColor(item.source)} size="small">{item.source}</Tag>
                      <Text code style={{ fontSize: '11px' }}>{item.method}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text 
                      style={{ 
                        fontSize: '11px', 
                        wordBreak: 'break-all',
                        display: 'block'
                      }}
                    >
                      {item.url}
                    </Text>
                  </div>
                  {item.count && (
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      第 {item.count} 次拦截
                    </Text>
                  )}
                </div>
              </List.Item>
            )}
            locale={{ emptyText: '暂无被拦截的请求' }}
          />
        </TabPane>

        <TabPane tab={`系统日志 (${interceptorLogs.length})`} key="system">
          <List
            size="small"
            dataSource={interceptorLogs.slice(0, 20)}
            renderItem={(item) => (
              <List.Item style={{ padding: '6px 0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag color={getLogTypeColor(item.level)} size="small">
                      {item.level}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                  <Text style={{ fontSize: '11px', display: 'block', marginTop: 2 }}>
                    {item.message}
                  </Text>
                  {Object.keys(item.data || {}).length > 0 && (
                    <Text 
                      type="secondary" 
                      style={{ 
                        fontSize: '10px', 
                        display: 'block',
                        maxHeight: '40px',
                        overflow: 'hidden'
                      }}
                    >
                      {JSON.stringify(item.data).substring(0, 100)}...
                    </Text>
                  )}
                </div>
              </List.Item>
            )}
            locale={{ emptyText: '暂无系统日志' }}
          />
        </TabPane>

        <TabPane tab={`调试日志 (${logs.length})`} key="debug">
          <List
            size="small"
            dataSource={logs.slice(0, 15)}
            renderItem={(item) => (
              <List.Item style={{ padding: '6px 0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Tag 
                      color={
                        item.type === 'success' ? 'green' : 
                        item.type === 'error' ? 'red' : 
                        item.type === 'warning' ? 'orange' : 'default'
                      } 
                      size="small"
                    >
                      {item.type}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: '10px' }}>
                      {item.timestamp.toLocaleTimeString()}
                    </Text>
                  </div>
                  <Text style={{ fontSize: '11px', display: 'block', marginTop: 2 }}>
                    {item.message}
                  </Text>
                </div>
              </List.Item>
            )}
            locale={{ emptyText: '暂无调试日志' }}
          />
        </TabPane>

        <TabPane tab="统计详情" key="stats">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>拦截源统计:</Text>
              {interceptorStats.sourceBreakdown && Object.entries(interceptorStats.sourceBreakdown).map(([source, count]) => (
                <div key={source} style={{ margin: '4px 0' }}>
                  <Tag color={getSourceColor(source)} size="small">{source}</Tag>
                  <Text>{count} 次</Text>
                </div>
              ))}
            </div>
            
            <div>
              <Text strong>浏览器信息:</Text>
              <Text style={{ fontSize: '10px', display: 'block', wordBreak: 'break-all' }}>
                {navigator.userAgent}
              </Text>
            </div>
            
            <div>
              <Text strong>页面URL:</Text>
              <Text style={{ fontSize: '10px', display: 'block', wordBreak: 'break-all' }}>
                {window.location.href}
              </Text>
            </div>

            {interceptorStats.lastBlocked && (
              <div>
                <Text strong>最后拦截时间:</Text>
                <Text style={{ display: 'block' }}>
                  {new Date(interceptorStats.lastBlocked).toLocaleString()}
                </Text>
              </div>
            )}
          </Space>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default WebSocketMonitor; 