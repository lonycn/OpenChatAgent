#!/usr/bin/env node

/**
 * OpenChatAgent 简易Web监控面板
 * 提供服务状态和基本管理功能
 */

const express = require("express");
const { exec } = require("child_process");
const path = require("path");

const app = express();
const PORT = 9999;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 获取服务状态
app.get("/api/status", (req, res) => {
  exec("pm2 jlist", (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: "PM2 not running or not found" });
    }

    try {
      const processes = JSON.parse(stdout);
      const services = processes.map((proc) => ({
        name: proc.name,
        status: proc.pm2_env.status,
        cpu: proc.monit.cpu,
        memory: proc.monit.memory,
        pid: proc.pid,
        uptime: proc.pm2_env.pm_uptime,
        restarts: proc.pm2_env.restart_time,
      }));

      res.json({ services, timestamp: Date.now() });
    } catch (e) {
      res.status(500).json({ error: "Failed to parse PM2 data" });
    }
  });
});

// 重启服务
app.post("/api/restart/:name", (req, res) => {
  const serviceName = req.params.name;
  exec(`pm2 restart ${serviceName}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr });
    }
    res.json({ message: `Service ${serviceName} restarted`, output: stdout });
  });
});

// 停止服务
app.post("/api/stop/:name", (req, res) => {
  const serviceName = req.params.name;
  exec(`pm2 stop ${serviceName}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr });
    }
    res.json({ message: `Service ${serviceName} stopped`, output: stdout });
  });
});

// 启动服务
app.post("/api/start/:name", (req, res) => {
  const serviceName = req.params.name;
  exec(`pm2 start ${serviceName}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr });
    }
    res.json({ message: `Service ${serviceName} started`, output: stdout });
  });
});

// 获取日志
app.get("/api/logs/:name", (req, res) => {
  const serviceName = req.params.name;
  exec(`pm2 logs ${serviceName} --lines 50`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr });
    }
    res.json({ logs: stdout });
  });
});

// 健康检查端点
app.get("/api/health", (req, res) => {
  const services = [
    { name: "chat-ui", port: 8001 },
    { name: "chat-core", port: 8002 },
    { name: "ai-service", port: 8003 },
    { name: "chat-session", port: 8004 },
    { name: "chat-admin", port: 8005 },
    { name: "chat-admin-ui", port: 8006 },
  ];

  Promise.all(
    services.map(
      (service) =>
        new Promise((resolve) => {
          exec(
            `curl -s http://localhost:${service.port} --connect-timeout 3`,
            (error) => {
              resolve({
                name: service.name,
                port: service.port,
                healthy: !error,
              });
            }
          );
        })
    )
  ).then((results) => {
    res.json({ health: results, timestamp: Date.now() });
  });
});

// 主页面
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>OpenChatAgent 监控面板</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .service { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
        .service:last-child { border-bottom: none; }
        .status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
        .online { background: #52c41a; }
        .stopped { background: #f5222d; }
        .errored { background: #fa8c16; }
        .button { padding: 6px 12px; margin: 0 4px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .restart { background: #1890ff; color: white; }
        .stop { background: #f5222d; color: white; }
        .start { background: #52c41a; color: white; }
        .logs { background: #722ed1; color: white; }
        h1 { color: #1890ff; text-align: center; }
        .refresh { float: right; background: #1890ff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .health-indicator { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
        .healthy { background: #52c41a; }
        .unhealthy { background: #f5222d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 OpenChatAgent 监控面板</h1>
        
        <div class="card">
            <h3>服务状态 <button class="refresh" onclick="refreshStatus()">刷新</button></h3>
            <div id="services"></div>
        </div>
        
        <div class="card">
            <h3>服务健康检查</h3>
            <div id="health"></div>
        </div>
        
        <div class="card">
            <h3>快速访问</h3>
            <p><a href="http://localhost:8001" target="_blank">🌐 用户前端 (8001)</a></p>
            <p><a href="http://localhost:8002/api/health" target="_blank">🔧 API网关 (8002)</a></p>
            <p><a href="http://localhost:8006" target="_blank">👤 管理后台 (8006)</a></p>
        </div>
    </div>

    <script>
        function refreshStatus() {
            fetch('/api/status')
                .then(res => res.json())
                .then(data => {
                    const servicesDiv = document.getElementById('services');
                    servicesDiv.innerHTML = data.services.map(service => \`
                        <div class="service">
                            <div>
                                <strong>\${service.name}</strong>
                                <span class="status \${service.status}">\${service.status}</span>
                            </div>
                            <div>
                                CPU: \${service.cpu}% | 内存: \${Math.round(service.memory/1024/1024)}MB | 重启: \${service.restarts}次
                            </div>
                            <div>
                                <button class="button restart" onclick="restartService('\${service.name}')">重启</button>
                                <button class="button stop" onclick="stopService('\${service.name}')">停止</button>
                                <button class="button logs" onclick="viewLogs('\${service.name}')">日志</button>
                            </div>
                        </div>
                    \`).join('');
                })
                .catch(err => {
                    document.getElementById('services').innerHTML = '<p>❌ 无法获取服务状态，请确保PM2已启动</p>';
                });
                
            // 健康检查
            fetch('/api/health')
                .then(res => res.json())
                .then(data => {
                    const healthDiv = document.getElementById('health');
                    healthDiv.innerHTML = data.health.map(h => \`
                        <p><span class="health-indicator \${h.healthy ? 'healthy' : 'unhealthy'}"></span>\${h.name} (:\${h.port}) - \${h.healthy ? '健康' : '异常'}</p>
                    \`).join('');
                });
        }

        function restartService(name) {
            fetch(\`/api/restart/\${name}\`, {method: 'POST'})
                .then(res => res.json())
                .then(data => {
                    alert(data.message || data.error);
                    setTimeout(refreshStatus, 2000);
                });
        }

        function stopService(name) {
            if (confirm(\`确定要停止 \${name} 服务吗？\`)) {
                fetch(\`/api/stop/\${name}\`, {method: 'POST'})
                    .then(res => res.json())
                    .then(data => {
                        alert(data.message || data.error);
                        setTimeout(refreshStatus, 2000);
                    });
            }
        }

        function viewLogs(name) {
            window.open(\`/logs/\${name}\`, '_blank');
        }

        // 自动刷新
        setInterval(refreshStatus, 10000);
        refreshStatus();
    </script>
</body>
</html>
  `);
});

// 日志页面
app.get("/logs/:name", (req, res) => {
  const serviceName = req.params.name;
  exec(`pm2 logs ${serviceName} --lines 100`, (error, stdout, stderr) => {
    const logs = error ? stderr : stdout;
    res.send(`
      <html>
        <head>
          <title>${serviceName} 日志</title>
          <style>
            body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; margin: 20px; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
            .refresh { background: #007acc; color: white; padding: 8px 16px; border: none; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <button class="refresh" onclick="location.reload()">刷新日志</button>
          <h2>${serviceName} 日志</h2>
          <pre>${logs}</pre>
        </body>
      </html>
    `);
  });
});

app.listen(PORT, () => {
  console.log(`🎯 OpenChatAgent 监控面板启动在: http://localhost:${PORT}`);
  console.log(`📊 功能: 服务状态监控、启停控制、日志查看`);
});

module.exports = app;
