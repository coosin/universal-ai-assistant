// Coosin 交易系统 - 主入口
// 🏗️ 架构：策略引擎 + 回测框架 + 风控模块 + 执行引擎

import { StrategyEngine, BaseStrategy, MovingAverageCrossStrategy } from './strategy-engine.js';
import { BacktestEngine } from './backtest-engine.js';
import { RiskManager } from './risk-manager.js';
import { OKXClient } from './okx-api.js';

export class CoosinTradingSystem {
    constructor(config = {}) {
        this.config = config;
        
        // 初始化核心模块
        this.strategyEngine = new StrategyEngine();
        this.riskManager = new RiskManager(config.risk);
        
        // 交易所客户端
        if (config.okx) {
            this.okx = new OKXClient(config.okx);
        }
        
        // 系统状态
        this.isRunning = false;
        this.equity = config.initialCapital || 10000;
        this.positions = new Map();
    }

    // 注册内置策略
    registerBuiltinStrategies() {
        this.strategyEngine.registerStrategy('ma-cross', MovingAverageCrossStrategy);
        console.log('[Coosin] 内置策略已注册');
    }

    // 激活策略
    activateStrategy(name, strategyConfig = {}) {
        this.strategyEngine.activateStrategy(name, strategyConfig);
    }

    // 生成模拟K线数据用于测试
    generateMockData(points = 1000) {
        const data = [];
        let price = 50000; // BTC 起始价格
        const now = Date.now();
        
        for (let i = 0; i < points; i++) {
            // 随机游走 + 轻微趋势
            const change = (Math.random() - 0.48) * price * 0.01;
            price = Math.max(1000, price + change);
            
            const open = price;
            const close = price + (Math.random() - 0.5) * price * 0.005;
            const high = Math.max(open, close) * (1 + Math.random() * 0.005);
            const low = Math.min(open, close) * (1 - Math.random() * 0.005);
            
            data.push({
                timestamp: new Date(now - (points - i) * 60000).toISOString(),
                open: open.toFixed(2),
                high: high.toFixed(2),
                low: low.toFixed(2),
                close: close.toFixed(2),
                last: close.toFixed(2),
                volume: (Math.random() * 1000).toFixed(2)
            });
        }
        
        return data;
    }

    // 运行回测
    async runBacktest(strategyName, strategyConfig = {}, initialCapital = 10000) {
        console.log('\n🚀 ===== Coosin 回测系统 =====');
        console.log(`策略: ${strategyName}`);
        console.log(`初始资金: ${initialCapital}`);
        
        // 生成模拟数据
        const mockData = this.generateMockData(2000);
        console.log(`数据点: ${mockData.length}`);
        
        // 创建策略实例
        const StrategyClass = this.strategyEngine.strategies.get(strategyName);
        if (!StrategyClass) {
            throw new Error(`策略不存在: ${strategyName}`);
        }
        
        const strategy = new StrategyClass(strategyConfig);
        const backtest = new BacktestEngine(strategy, initialCapital);
        const results = backtest.run(mockData);
        
        console.log('\n📊 ===== 回测结果 =====');
        console.log(`最终资金: $${results.finalCapital.toFixed(2)}`);
        console.log(`总收益率: ${(results.totalReturn * 100).toFixed(2)}%`);
        console.log(`交易次数: ${results.totalTrades}`);
        console.log(`胜率: ${(results.winRate * 100).toFixed(2)}%`);
        console.log(`最大回撤: ${(results.maxDrawdown * 100).toFixed(2)}%`);
        
        if (results.trades.length > 0) {
            console.log(`\n📈 最近5笔交易:`);
            results.trades.slice(-5).forEach((trade, i) => {
                const side = trade.side === 'long' ? '做多' : '做空';
                const sign = trade.pnl >= 0 ? '+' : '';
                console.log(`  ${i + 1}. ${side} @ ${trade.entryPrice.toFixed(2)} -> ${trade.exitPrice.toFixed(2)} | ${sign}${trade.pnl.toFixed(2)} (${sign}${trade.pnlPercent.toFixed(2)}%)`);
            });
        }
        
        return results;
    }

    // 启动实盘（模拟）
    start() {
        if (this.isRunning) {
            console.log('[Coosin] 系统已在运行中');
            return;
        }
        
        this.isRunning = true;
        console.log('[Coosin] 交易系统已启动');
    }

    // 停止系统
    stop() {
        this.isRunning = false;
        console.log('[Coosin] 交易系统已停止');
    }

    // 获取系统状态
    getStatus() {
        return {
            isRunning: this.isRunning,
            equity: this.equity,
            positions: Array.from(this.positions.entries()),
            strategies: this.strategyEngine.getStrategies(),
            risk: this.riskManager.getStatus()
        };
    }
}

// 导出所有模块
export * from './strategy-engine.js';
export * from './backtest-engine.js';
export * from './risk-manager.js';
export * from './okx-api.js';

export default CoosinTradingSystem;
