// 波动率交易策略 - 利用短期波动率突变获利
// 监测价格波动率突破，捕捉趋势行情

import { BaseStrategy } from '../strategy-engine.js';

export class VolatilityTradingStrategy extends BaseStrategy {
    constructor(config = {}) {
        super(config);
        this.name = 'volatility-trading';
        this.description = '波动率交易策略，捕捉趋势行情';
        
        // 默认配置
        this.config = {
            volatilityWindow: 20,              // 波动率计算窗口
            volatilityThreshold: 2,           // 波动率突破阈值（标准差倍数）
            minVolatility: 0.005,             // 最小波动率要求
            takeProfit: 0.03,                  // 止盈3%
            stopLoss: 0.02,                    // 止损2%
            trailingStop: 0.015,               // 追踪止损1.5%
            positionSize: 0.01,                // 仓位比例1%
            ...config
        };
        
        this.priceHistory = [];
        this.volatilityHistory = [];
        this.position = null;
        this.entryPrice = 0;
        this.lastSignal = null;
    }

    // 计算历史波动率
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    // 检测波动率突破
    detectBreakout(currentVolatility) {
        if (this.volatilityHistory.length < this.config.volatilityWindow) return false;
        
        const avgVolatility = this.volatilityHistory.slice(-this.config.volatilityWindow)
            .reduce((a, b) => a + b, 0) / this.config.volatilityWindow;
        
        const stdDev = Math.sqrt(
            this.volatilityHistory.slice(-this.config.volatilityWindow)
                .reduce((a, b) => a + Math.pow(b - avgVolatility, 2), 0) / this.config.volatilityWindow
        );
        
        return currentVolatility > avgVolatility + this.config.volatilityThreshold * stdDev;
    }

    // 检测趋势方向
    detectTrend() {
        if (this.priceHistory.length < 5) return 0;
        const shortMA = this.priceHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const longMA = this.priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20;
        return shortMA > longMA ? 1 : shortMA < longMA ? -1 : 0;
    }

    onTick(tick) {
        const price = parseFloat(tick.close);
        this.priceHistory.push(price);
        
        // 保持窗口大小
        if (this.priceHistory.length > this.config.volatilityWindow * 2) {
            this.priceHistory.shift();
        }

        // 计算当前波动率
        const currentVolatility = this.calculateVolatility(this.priceHistory.slice(-this.config.volatilityWindow));
        this.volatilityHistory.push(currentVolatility);
        
        if (this.volatilityHistory.length > this.config.volatilityWindow * 2) {
            this.volatilityHistory.shift();
        }

        // 波动率不足时不交易
        if (currentVolatility < this.config.minVolatility) {
            return { action: 'hold', reason: `波动率不足: ${(currentVolatility * 100).toFixed(2)}% < ${(this.config.minVolatility * 100).toFixed(2)}%` };
        }

        // 检测波动率突破
        const isBreakout = this.detectBreakout(currentVolatility);
        const trend = this.detectTrend();

        const signals = [];

        // 有持仓时检查止盈止损
        if (this.position) {
            const profitRate = (price - this.entryPrice) / this.entryPrice;
            
            // 更新追踪止损
            if (profitRate > 0) {
                const newStopLoss = price * (1 - this.config.trailingStop);
                if (newStopLoss > this.position.stopLoss) {
                    this.position.stopLoss = newStopLoss;
                    signals.push({
                        action: 'update_stop',
                        stopLoss: newStopLoss,
                        reason: `追踪止损更新为 $${newStopLoss.toFixed(4)}`
                    });
                }
            }

            // 止损检查
            if (price <= this.position.stopLoss) {
                signals.push({
                    action: 'sell',
                    price,
                    size: this.position.size,
                    reason: `触发止损，亏损率 ${(profitRate * 100).toFixed(2)}%`
                });
                this.position = null;
                this.entryPrice = 0;
                return signals;
            }

            // 止盈检查
            if (profitRate >= this.config.takeProfit) {
                signals.push({
                    action: 'sell',
                    price,
                    size: this.position.size,
                    reason: `触发止盈，盈利率 ${(profitRate * 100).toFixed(2)}%`
                });
                this.position = null;
                this.entryPrice = 0;
                return signals;
            }
        }

        // 无持仓时寻找开仓机会
        if (!this.position && isBreakout && trend !== 0) {
            if (trend > 0) {
                // 上涨趋势开多
                signals.push({
                    action: 'buy',
                    price,
                    size: this.config.positionSize,
                    reason: `波动率突破，上涨趋势确认，开仓买入`
                });
                this.lastSignal = 'buy';
            } else {
                // 下跌趋势开空
                signals.push({
                    action: 'sell',
                    price,
                    size: this.config.positionSize,
                    reason: `波动率突破，下跌趋势确认，开仓做空`
                });
                this.lastSignal = 'sell';
            }
        }

        return signals.length > 0 ? signals : { action: 'hold', reason: `当前波动率 ${(currentVolatility * 100).toFixed(2)}%，趋势: ${trend > 0 ? '上涨' : trend < 0 ? '下跌' : '震荡'}` };
    }

    // 开仓回调
    onOrderFilled(order) {
        if (order.side === 'buy') {
            this.position = {
                side: 'long',
                entryPrice: order.price,
                size: order.size,
                stopLoss: order.price * (1 - this.config.stopLoss),
                takeProfit: order.price * (1 + this.config.takeProfit),
                entryTime: new Date().toISOString()
            };
            this.entryPrice = order.price;
            this.log(`波动率策略开多仓，价格 $${order.price}，数量 ${order.size}`);
        } else if (order.side === 'sell') {
            this.position = {
                side: 'short',
                entryPrice: order.price,
                size: order.size,
                stopLoss: order.price * (1 + this.config.stopLoss),
                takeProfit: order.price * (1 - this.config.takeProfit),
                entryTime: new Date().toISOString()
            };
            this.entryPrice = order.price;
            this.log(`波动率策略开空仓，价格 $${order.price}，数量 ${order.size}`);
        }
    }
}
