import express from 'express';
import { Dashboard } from '../moneymaker/dashboard.js';

const app = express();
const PORT = 3000;

// CORS配置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 仪表盘接口
app.get('/api/dashboard', async (req, res) => {
  try {
    const dashboard = new Dashboard();
    const data = await dashboard.generate();
    res.json(data);
  } catch (e) {
    console.error('接口错误:', e);
    res.status(500).json({ error: e.message });
  }
});

// 账户信息接口
app.get('/api/account', async (req, res) => {
  try {
    const dashboard = new Dashboard();
    const data = await dashboard.getAccountData();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 持仓接口
app.get('/api/positions', async (req, res) => {
  try {
    const dashboard = new Dashboard();
    const data = await dashboard.getPositionData();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 行情接口
app.get('/api/market', async (req, res) => {
  try {
    const dashboard = new Dashboard();
    const data = await dashboard.getMarketData();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 系统状态接口
app.get('/api/system', async (req, res) => {
  try {
    const dashboard = new Dashboard();
    const data = await dashboard.getSystemStatus();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 APP后端接口服务已启动，端口: ${PORT}`);
  console.log(`📱 接口地址: http://localhost:${PORT}/api/dashboard`);
});
