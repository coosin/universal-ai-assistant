// 策略引擎 V2 - 多策略并行与自动选择
// 支持多策略并行运行，根据行情自动切换最优策略

import { DynamicThresholdStrategy } from './strategy/dynamic-threshold.js';
import { GridTradingStrategy } from './strategy/grid-trading.js';
import { VolatilityTradingStrategy } from './strategy/volatility-trading.js';
import { MachineLearningTradingStrategy } from './strategy/machine-learning-trading.js';
import { ArbitrageTradingStrategy } from './strategy/arbitrage-trading.js';

export class StrategyEngineV2 {
    constructor(config = {}) {
        this.config = {
            defaultStrategy: 'dynamic-threshold',
            autoSwitch: true,
            performanceWindow: 100,
            ...config
        };
        
        // 策略绩效统计（必须在 registerStrategy 之前初始化）
        this.performance = new Map();
        this.activeStrategies = [];
        this.currentMarketRegime = 'unknown';
        
        // 注册所有可用策略
        this.strategies = new Map();
        this.registerStrategy('dynamic-threshold', DynamicThresholdStrategy);
        this.registerStrategy('grid-trading', GridTradingStrategy);
        this.registerStrategy('volatility-trading', VolatilityTradingStrategy);
        this.registerStrategy('machine-learning', MachineLearningTradingStrategy);
        this.registerStrategy('arbitrage', ArbitrageTradingStrategy);
    }

    registerStrategy(name, StrategyClass, config = {}) {
        this.strategies.set(name, {
            class: StrategyClass,
            config,
            instance: null
        });
        this.performance.set(name, {
            trades: 0,
            wins: 0,
            losses: 0,
            totalProfit: 0,
            winRate: 0,
            profitFactor: 0
        });
    }

    activateStrategy(name, config = {}) {
        const strategy = this.strategies.get(name);
        if (!strategy) {
            throw new Error(`策略 ${name} 不存在`);
        }
        
        strategy.instance = new strategy.class(config);
        this.activeStrategies.push(name);
        
        return strategy.instance;
    }

    deactivateStrategy(name) {
        const index = this.activeStrategies.indexOf(name);
        if (index > -1) {
            this.activeStrategies.splice(index, 1);
        }
        
        const strategy = this.strategies.get(name);
        if (strategy) {
            strategy.instance = null;
        }
    }

    onTick(tick, priceHistory = [], volatilityHistory = []) {
        if (this.activeStrategies.length === 0) {
            return { action: 'hold', reason: '无活跃策略' };
        }

        const signals = [];
        for (const name of this.activeStrategies) {
            const strategy = this.strategies.get(name);
            if (strategy && strategy.instance) {
                const signal = strategy.instance.onTick(tick, priceHistory, volatilityHistory);
                if (signal && signal.action !== 'hold') {
                    signals.push({ strategy: name, ...signal });
                }
            }
        }

        if (signals.length === 0) {
            return { action: 'hold', reason: '所有策略无信号' };
        }

        const buySignals = signals.filter(s => s.action === 'buy');
        const sellSignals = signals.filter(s => s.action === 'sell');

        if (buySignals.length > sellSignals.length) {
            return buySignals[0];
        } else if (sellSignals.length > buySignals.length) {
            return sellSignals[0];
        } else {
            return { action: 'hold', reason: '多空信号平衡' };
        }
    }

    updatePerformance(strategyName, isWin, profit) {
        const perf = this.performance.get(strategyName);
        if (!perf) return;

        perf.trades++;
        if (isWin) {
            perf.wins++;
            perf.totalProfit += profit;
        } else {
            perf.losses++;
            perf.totalProfit += profit;
        }

        perf.winRate = perf.wins / perf.trades;
        perf.profitFactor = perf.losses !== 0 ? Math.abs(perf.totalProfit / perf.losses) : Infinity;
    }

    getBestStrategy() {
        let bestName = null;
        let bestScore = -Infinity;

        for (const [name, perf] of this.performance.entries()) {
            const score = perf.winRate * perf.profitFactor;
            if (score > bestScore) {
                bestScore = score;
                bestName = name;
            }
        }

        return bestName;
    }

    autoSwitchStrategy() {
        if (!this.config.autoSwitch) return;

        const bestStrategy = this.getBestStrategy();
        if (bestStrategy && !this.activeStrategies.includes(bestStrategy)) {
            this.activateStrategy(bestStrategy);
            console.log(`自动切换到最优策略：${bestStrategy}`);
        }
    }

    getStatus() {
        return {
            activeStrategies: this.activeStrategies,
            currentMarketRegime: this.currentMarketRegime,
            performance: Object.fromEntries(this.performance)
        };
    }
}

export { BaseStrategy } from './strategy-engine.js';
