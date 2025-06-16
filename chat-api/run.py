#!/usr/bin/env python3
"""
🚀 Chat API 启动脚本

快速启动开发服务器
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(str(Path(__file__).parent))

# 设置环境变量
os.environ.setdefault("PYTHONPATH", str(Path(__file__).parent))

if __name__ == "__main__":
    from src.main import main
    main()
