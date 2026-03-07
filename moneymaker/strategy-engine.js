// Coosin 策略引擎 - 可插拔交易策略框架

export class StrategyEngine {
    constructor() {
        this.strategies = new Map();
        this.activeStrategies = [];
    }

    // 注册策略
    registerStrategy(name, strategy) {
        this.strategies.set(name, strategy);
        console.log(`[StrategyEngine] 策略已注册: ${name}`);
    }

    // 激活策略
    activateStrategy(name, config = {}) {
        const strategy = this.strategies.get(name);
        if (!strategy) {
            throw new Error(`策略不存在: ${name}`);
        }
        this.activeStrategies.push({
            name,
            instance: new strategy(config),
            config
        });
        console.log(`[StrategyEngine] 策略已激活: ${name}`);
    }

    // 处理行情数据
    onTick(tickData) {
        const signals = [];
        for (const { name, instance } of this.activeStrategies) {
            if (instance.onTick) {
                const signal = instance.onTick(tickData);
                if (signal) {
                    signals.push({ strategy: name, ...signal });
                }
            }
        }
        return signals;
    }

    // 获取策略列表
    getStrategies() {
        return Array.from(this.strategies.keys());
    }
}

// 基础策略类
export class BaseStrategy {
    constructor(config) {
        this.config = config;
        this.position = null; // 当前持仓
        this.history = [];    // 历史信号
    }

    onTick(tickData) {
        // 子类实现
        return null;
    }

    // 生成买入信号
    buy(price, reason = '') {
        const signal = {
            action: 'buy',
            price,
            reason,
            timestamp: new Date().toISOString()
        };
        this.history.push(signal);
        this.position = { side: 'long', entryPrice: price };
        return signal;
    }

    // 生成卖出信号
    sell(price, reason = '') {
        const signal = {
            action: 'sell',
            price,
            reason,
            timestamp: new Date().toISOString()
        };
        this.history.push(signal);
        this.position = null;
        return signal;
    }
}

// 简单均线交叉策略示例
export class MovingAverageCrossStrategy extends BaseStrategy {
    constructor(config) {
        super(config);
        this.shortPeriod = config.shortPeriod || 5;
        this.longPeriod = config.longPeriod || 20;
        this.priceHistory = [];
    }

    onTick(tickData) {
        const price = parseFloat(tickData.last);
        this.priceHistory.push(price);

        // 保持历史数据长度
        if (this.priceHistory.length > this.longPeriod) {
            this.priceHistory.shift();
        }

        // 数据不足时不操作
        if (this.priceHistory.length < this.longPeriod) {
            return null;
        }

        // 计算均线
        const shortMA = this.calculateMA(this.shortPeriod);
        const longMA = this.calculateMA(this.longPeriod);

        // 金叉买入
        if (!this.position && shortMA > longMA) {
            return this.buy(price, `金叉: ${shortMA.toFixed(2)} > ${longMA.toFixed(2)}`);
        }

        // 死叉卖出
        if (this.position && shortMA < longMA) {
            return this.sell(price, `死叉: ${shortMA.toFixed(2)} < ${longMA.toFixed(2)}`);
        }

        return null;
    }

    calculateMA(period) {
        const slice = this.priceHistory.slice(-period);
        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / period;
    }
}

export default StrategyEngine;
