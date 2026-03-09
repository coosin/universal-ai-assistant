# OpenClaw 移动应用开发文档

## 项目概述

OpenClaw 是一个基于 React Native 和 Expo 框架的移动应用，用于控制和监控 OpenClaw 机器人系统。

## 技术栈

- **前端框架**: React Native + Expo
- **状态管理**: Redux Toolkit
- **导航**: React Navigation (Bottom Tabs)
- **UI 组件**: React Native Paper
- **WebSocket**: 实时通信
- **语音功能**: expo-av (录音), expo-speech (TTS), expo-speech-recognition (真实语音识别)
- **存储**: AsyncStorage
- **构建工具**: EAS Build

## 项目结构

```
OpenClawAppSimple/
├── src/
│   ├── navigation/        # 导航配置
│   ├── screens/          # 屏幕组件
│   │   ├── ChatScreen.js           # 聊天界面（Expo Go 版本）
│   │   ├── ChatScreenWithRealVoice.js  # 真实语音识别版本
│   │   ├── DashboardScreen.js      # 仪表盘
│   │   ├── SystemStatusScreen.js   # 系统状态
│   │   └── SettingsScreen.js       # 设置
│   ├── services/         # 服务
│   │   ├── openclaw-app-websocket.js  # WebSocket 服务
│   │   ├── watchdogService.js          # 看门狗服务
│   │   ├── openclaw-app-chat-service.js  # 聊天服务
│   │   └── openclaw-app-system-management.js  # 系统管理服务
│   └── store/            # Redux 状态管理
│       ├── store.js      # 存储配置
│       ├── chatSlice.js  # 聊天状态
│       └── systemSlice.js  # 系统状态
├── assets/               # 静态资源
├── app.json              # Expo 配置
├── eas.json              # EAS Build 配置
├── package.json          # 依赖配置
└── config.js             # 应用配置
```

## 核心功能

### 1. 实时通信
- 使用 WebSocket 连接到 OpenClaw 网关
- 支持 challenge-response 认证
- 消息队列机制确保消息可靠传递

### 2. 聊天功能
- 文本消息发送和接收
- 语音消息（模拟识别）
- 真实语音识别（开发构建版本）
- 文本转语音回复

### 3. 系统监控
- 网络状态显示
- 系统信息展示
- 机器人状态监控
- 看门狗服务监控连接

### 4. 仪表盘
- 实时数据展示
- 网络质量监控
- 系统资源使用情况

## 配置文件

### config.js
```javascript
// WebSocket 配置
export const WebSocketConfig = {
  url: 'wss://home.qlsm.net',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10
};

// 应用配置
export const AppConfig = {
  appName: 'OpenClaw App',
  version: '1.0.0'
};
```

## 开发指南

### 开发环境设置

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm start --lan  # 局域网模式
   # 或
   npm start --tunnel  # 隧道模式
   ```

3. **在 Expo Go 中测试**
   - 扫描 QR 码
   - 或使用链接：`exp://192.168.1.250:8081`

### 真实语音识别

**注意**：真实语音识别需要开发构建，不能在 Expo Go 中使用。

1. **切换到真实语音识别版本**
   ```bash
   cp src/screens/ChatScreenWithRealVoice.js src/screens/ChatScreen.js
   cp app-with-real-voice.json app.json
   ```

2. **创建开发构建**
   ```bash
   # 登录 EAS
   eas login

   # 配置项目（首次）
   eas build:configure

   # 创建开发构建
   eas build --platform android --profile development
   ```

3. **下载并安装 APK**
   - 构建完成后会收到下载链接
   - 下载并安装到 Android 设备

4. **在开发构建中使用**
   ```bash
   npx expo start --dev-client
   ```

### 构建正式版本

```bash
eas build --platform android --profile production
```

## 部署流程

1. **代码推送**
   ```bash
   git add .
   git commit -m "Update: [描述]"
   git push origin main
   ```

2. **在 GitHub Codespaces 中构建**
   - 打开 GitHub 仓库
   - 创建 Codespace
   - 运行 EAS Build

3. **部署到应用商店**
   - Android: Google Play Store
   - iOS: App Store

## 维护指南

### 常见问题

1. **WebSocket 连接失败**
   - 检查网络连接
   - 检查 OpenClaw 网关是否运行
   - 检查 Cloudflare Tunnel 配置

2. **语音识别不工作**
   - 确保使用开发构建
   - 检查麦克风权限
   - 检查语音识别服务是否可用

3. **应用崩溃**
   - 查看日志
   - 检查依赖版本
   - 检查 WebSocket 连接状态

### 日志查看

```bash
# 开发服务器日志
npm start --lan

# 应用日志
# 在 Expo Go 或开发构建中查看
```

## 扩展功能

### 计划中的功能

1. **更多语音命令**
   - 支持更多语音指令
   - 自定义语音命令

2. **增强的系统监控**
   - 更详细的系统信息
   - 历史数据图表

3. **远程控制**
   - 机器人远程操作
   - 场景自动化

4. **多语言支持**
   - 支持多种语言
   - 语言切换功能

## 技术支持

- **GitHub 仓库**: https://github.com/coosin/universal-ai-assistant
- **Expo 文档**: https://docs.expo.dev/
- **React Native 文档**: https://reactnative.dev/docs/getting-started

## 版本历史

### v1.0.0
- 初始版本
- 基础聊天功能
- 系统监控
- 仪表盘
- 语音功能（模拟识别）

### v1.1.0
- 真实语音识别支持
- 改进的 WebSocket 连接
- 看门狗服务
- EAS Build 配置

---

**文档更新日期**: 2026-03-07
**维护者**: OpenClaw Team
