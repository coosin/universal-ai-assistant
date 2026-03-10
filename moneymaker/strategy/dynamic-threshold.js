// 动态阈值策略 - 适配震荡行情
// 基于波动率自动调整止盈止损阈值，提高震荡市胜率

import { BaseStrategy } from '../strategy-engine.js';

export class DynamicThresholdStrategy extends BaseStrategy {
    constructor(config = {}) {
        super(config);
        this.name = 'dynamic-threshold';
        this.description = '动态阈值策略，根据波动率自动调整止盈止损';
        
        // 默认配置
        this.config = {
            baseTakeProfit: 0.02,  // 基础止盈 2%
            baseStopLoss: 0.03,    // 基础止损 3%
            volatilityWindow: 20,  // 波动率计算窗口
            maxTakeProfit: 0.05,   // 最大止盈 5%
            minTakeProfit: 0.01,   // 最小止盈 1%
            maxStopLoss: 0.05,     // 最大止损 5%
            minStopLoss: 0.02,     // 最小止损 2%
            ...config
        };
        
        this.priceHistory = [];
    }

    // 计算波动率（标准差）
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    // 计算动态阈值
    calculateThresholds(currentVolatility) {
        // 波动率越高，阈值越大
        const volatilityMultiplier = Math.min(2, Math.max(0.5, currentVolatility * 100));
        
        return {
            takeProfit: Math.min(this.config.maxTakeProfit, 
                               Math.max(this.config.minTakeProfit, 
                                       this.config.baseTakeProfit * volatilityMultiplier)),
            stopLoss: Math.min(this.config.maxStopLoss, 
                             Math.max(this.config.minStopLoss, 
                                     this.config.baseStopLoss * volatilityMultiplier))
        };
    }

    onTick(tick) {
        const price = parseFloat(tick.close);
        this.priceHistory.push(price);
        
        // 保持窗口大小
        if (this.priceHistory.length > this.config.volatilityWindow) {
            this.priceHistory.shift();
        }

        // 窗口不足时使用基础阈值
        if (this.priceHistory.length < this.config.volatilityWindow) {
            return {
                action: 'hold',
                thresholds: {
                    takeProfit: this.config.baseTakeProfit,
                    stopLoss: this.config.baseStopLoss
                }
            };
        }

        // 计算波动率和动态阈值
        const volatility = this.calculateVolatility(this.priceHistory);
        const thresholds = this.calculateThresholds(volatility);

        return {
            action: 'hold',
            thresholds,
            volatility: volatility * 100,
            reason: `波动率 ${(volatility * 100).toFixed(2)}%, 动态阈值: 止盈 +${(thresholds.takeProfit * 100).toFixed(2)}%, 止损 -${(thresholds.stopLoss * 100).toFixed(2)}%`
        };
    }
}
