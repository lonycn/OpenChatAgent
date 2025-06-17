#!/usr/bin/env python3
"""
WebSocket 连接测试脚本
用于测试 chat-api 的 WebSocket 功能
"""

import asyncio
import websockets
import json
import uuid
from datetime import datetime

async def test_websocket():
    """测试 WebSocket 连接和消息发送"""
    uri = "ws://localhost:8000/ws"
    
    try:
        print(f"🔗 正在连接到 {uri}...")
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket 连接成功!")
            
            # 等待连接确认消息
            try:
                welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                welcome_data = json.loads(welcome_msg)
                print(f"📨 收到欢迎消息: {welcome_data}")
            except asyncio.TimeoutError:
                print("⚠️  未收到欢迎消息，继续测试...")
            
            # 发送测试消息
            test_message = {
                "type": "message",
                "id": str(uuid.uuid4()),
                "content": "你好，这是一条测试消息",
                "timestamp": datetime.now().isoformat(),
                "userId": f"test_user_{int(datetime.now().timestamp())}",
            }
            
            print(f"📤 发送测试消息: {test_message}")
            await websocket.send(json.dumps(test_message))
            
            # 监听响应消息
            print("👂 等待响应消息...")
            timeout = 30  # 30秒超时
            
            try:
                while timeout > 0:
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        response_data = json.loads(response)
                        print(f"📨 收到响应: {response_data}")
                        
                        # 如果收到完整的AI回复，结束测试
                        if (response_data.get('type') in ['text', 'message'] and 
                            response_data.get('from') != 'user'):
                            print("✅ 收到AI回复，测试成功!")
                            break
                        elif (response_data.get('type') == 'stream' and 
                              response_data.get('isComplete')):
                            print("✅ 收到完整的流式回复，测试成功!")
                            break
                            
                    except asyncio.TimeoutError:
                        timeout -= 1
                        if timeout % 5 == 0:
                            print(f"⏳ 等待响应中... 剩余 {timeout} 秒")
                        continue
                        
                if timeout <= 0:
                    print("⚠️  响应超时，但连接正常")
                    
            except Exception as e:
                print(f"❌ 接收消息时出错: {e}")
                
    except ConnectionRefusedError:
        print("❌ 连接被拒绝，请确保 chat-api 服务正在运行")
    except Exception as e:
        print(f"❌ 连接失败: {e}")

if __name__ == "__main__":
    print("🚀 开始 WebSocket 测试...")
    asyncio.run(test_websocket())
    print("🏁 测试完成")
