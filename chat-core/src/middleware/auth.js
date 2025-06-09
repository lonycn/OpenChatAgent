const jwt = require("jsonwebtoken");

/**
 * WebSocket 连接认证中间件
 * 从查询参数或头部提取 token 进行验证
 */
function authenticateWebSocket(ws, req, next) {
  try {
    // 从查询参数获取 token
    const token = req.url.includes("?")
      ? new URLSearchParams(req.url.split("?")[1]).get("token")
      : null;

    if (!token) {
      // 对于开发阶段，允许无 token 连接，但记录警告
      console.warn(
        "WebSocket: No authentication token provided, using guest mode"
      );
      req.user = { id: `guest_${Date.now()}`, type: "guest" };
      return next();
    }

    // TODO: 验证 JWT token
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;

    // 暂时模拟用户信息
    req.user = { id: `user_${Date.now()}`, type: "authenticated" };
    next();
  } catch (error) {
    console.error("WebSocket Auth Error:", error);
    ws.close(1008, "Authentication failed");
  }
}

/**
 * HTTP API 认证中间件
 */
function authenticateAPI(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // 对于开发阶段，允许无认证访问
      req.user = { id: `api_user_${Date.now()}`, type: "guest" };
      return next();
    }

    const token = authHeader.split(" ")[1]; // Bearer token

    // TODO: 验证 JWT token
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;

    // 暂时模拟用户信息
    req.user = { id: `api_user_${Date.now()}`, type: "authenticated" };
    next();
  } catch (error) {
    console.error("API Auth Error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * 可选认证中间件 - 不强制要求认证，但会解析用户信息
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(" ")[1];
      // TODO: 验证 JWT token
      req.user = { id: `auth_user_${Date.now()}`, type: "authenticated" };
    } else {
      req.user = { id: `guest_${Date.now()}`, type: "guest" };
    }

    next();
  } catch (error) {
    // 认证失败时仍然允许继续，但标记为访客
    req.user = { id: `guest_${Date.now()}`, type: "guest" };
    next();
  }
}

module.exports = {
  authenticateWebSocket,
  authenticateAPI,
  optionalAuth,
};
