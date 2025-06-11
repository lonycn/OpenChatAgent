module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/test/**/*.test.js',
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // 覆盖率收集
  collectCoverage: true,
  collectCoverageFrom: [
    'core/**/*.js',
    'handlers/**/*.js',
    'middleware/**/*.js',
    'plugins/**/*.js',
    'index.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/tests/**',
    '!**/examples/**'
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 测试超时时间（毫秒）
  testTimeout: 10000,
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // 模块路径映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // 忽略的文件模式
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/'
  ],
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: false,
  
  // 清除模拟
  clearMocks: true,
  
  // 强制退出
  forceExit: true,
  
  // 检测打开的句柄
  detectOpenHandles: true
};