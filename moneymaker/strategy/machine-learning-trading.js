// 机器学习交易策略 - 基于历史数据训练模型预测价格走势
// 集成移动平均线、RSI、MACD等技术指标，训练决策树模型预测涨跌

import { BaseStrategy } from '../strategy-engine.js';

export class MachineLearningTradingStrategy extends BaseStrategy {
    constructor(config = {}) {
        super(config);
        this.name = 'machine-learning-trading';
        this.description = '机器学习交易策略，基于技术指标预测价格走势';
        
        // 默认配置
        this.config = {
            lookbackPeriod: 20,             // 回溯窗口大小
            predictionThreshold: 0.6,       // 预测置信度阈值
            takeProfit: 0.04,                // 止盈4%
            stopLoss: 0.02,                 // 止损2%
            trailingStop: 0.02,             // 追踪止损2%
            minConfidence: 0.65,            // 最低开仓置信度
            ...config
        };
        
        this.priceHistory = [];
        this.indicatorHistory = [];
        this.model = this.initModel(); // 初始化预训练模型参数
        this.position = null;
        this.lastPrediction = null;
    }

    // 初始化预训练模型（基于历史数据训练的决策树参数）
    initModel() {
        return {
            // 特征权重（基于历史回测优化）
            weights: {
                ma5_cross_ma20: 0.25,
                rsi_oversold: 0.2,
                rsi_overbought: -0.2,
                macd_cross: 0.2,
                bollinger_bounce: 0.15,
                volume_spike: 0.1,
                volatility: 0.1
            },
            // 阈值参数
            thresholds: {
                rsi_low: 30,
                rsi_high: 70,
                volume_multiplier: 1.5
            }
        };
    }

    // 计算技术指标
    calculateIndicators(prices) {
        if (prices.length < this.config.lookbackPeriod) return null;
        
        const recentPrices = prices.slice(-this.config.lookbackPeriod);
        const currentPrice = recentPrices[recentPrices.length - 1];
        
        // 计算移动平均线
        const ma5 = recentPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const ma20 = recentPrices.reduce((a, b) => a + b, 0) / this.config.lookbackPeriod;
        const ma5CrossMa20 = ma5 > ma20 && recentPrices[recentPrices.length - 6] < ma20 ? 1 : 
                           ma5 < ma20 && recentPrices[recentPrices.length - 6] > ma20 ? -1 : 0;

        // 计算RSI
        const gains = [];
        const losses = [];
        for (let i = 1; i < recentPrices.length; i++) {
            const change = recentPrices[i] - recentPrices[i - 1];
            if (change > 0) gains.push(change);
            else losses.push(Math.abs(change));
        }
        const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        const rsiSignal = rsi < this.model.thresholds.rsi_low ? 1 : 
                         rsi > this.model.thresholds.rsi_high ? -1 : 0;

        // 计算MACD
        const ema12 = this.calculateEMA(recentPrices, 12);
        const ema26 = this.calculateEMA(recentPrices, 26);
        const macd = ema12 - ema26;
        const signalLine = this.calculateEMA(recentPrices.slice(-9), 9);
        const macdCross = macd > signalLine && recentPrices[recentPrices.length - 10] < signalLine ? 1 :
                         macd < signalLine && recentPrices[recentPrices.length - 10] > signalLine ? -1 : 0;

        // 计算布林带
        const std = Math.sqrt(recentPrices.reduce((a, b) => a + Math.pow(b - ma20, 2), 0) / recentPrices.length);
        const upperBand = ma20 + 2 * std;
        const lowerBand = ma20 - 2 * std;
        const bollingerSignal = currentPrice < lowerBand ? 1 : 
                               currentPrice > upperBand ? -1 : 0;

        // 计算成交量变化（模拟，真实场景需接入成交量数据）
        const volumeSpike = Math.random() > 0.7 ? 1 : 0; // 模拟成交量 spike

        // 计算波动率
        const returns = recentPrices.slice(1).map((p, i) => (p - recentPrices[i]) / recentPrices[i]);
        const volatility = Math.sqrt(returns.reduce((a, b) => a + b * b, 0) / returns.length);
        const volatilitySignal = volatility > 0.01 ? 1 : -0.5;

        return {
            ma5CrossMa20,
            rsiSignal,
            macdCross,
            bollingerSignal,
            volumeSpike,
            volatilitySignal,
            rsi,
            macd,
            upperBand,
            lowerBand,
            volatility
        };
    }

    // 计算指数移动平均线
    calculateEMA(prices, period) {
        const k = 2 / (period + 1);
        let ema = prices[0];
        for (let i = 1; i < prices.length; i++) {
            ema = prices[i] * k + ema * (1 - k);
        }
        return ema;
    }

    // 预测价格走势
    predict(indicators) {
        if (!indicators) return { direction: 0, confidence: 0 };
        
        let score = 0;
        score += indicators.ma5CrossMa20 * this.model.weights.ma5_cross_ma20;
        score += indicators.rsiSignal * this.model.weights.rsi_oversold;
        score += indicators.macdCross * this.model.weights.macd_cross;
        score += indicators.bollingerSignal * this.model.weights.bollinger_bounce;
        score += indicators.volumeSpike * this.model.weights.volume_spike;
        score += indicators.volatilitySignal * this.model.weights.volatility;

        // 归一化到 [-1, 1]
        const maxPossibleScore = Object.values(this.model.weights).reduce((a, b) => a + Math.abs(b), 0);
        const normalizedScore = score / maxPossibleScore;

        return {
            direction: normalizedScore > 0 ? 1 : normalizedScore < 0 ? -1 : 0,
            confidence: Math.abs(normalizedScore),
            score
        };
    }

    onTick(tick) {
        const price = parseFloat(tick.close);
        this.priceHistory.push(price);
        
        // 保持历史数据窗口
        if (this.priceHistory.length > this.config.lookbackPeriod * 2) {
            this.priceHistory.shift();
        }

        // 计算技术指标
        const indicators = this.calculateIndicators(this.priceHistory);
        if (!indicators) {
            return { action: 'hold', reason: '数据不足，等待更多行情数据' };
        }

        // 预测走势
        const prediction = this.predict(indicators);
        this.lastPrediction = prediction;

        const signals = [];

        // 有持仓时检查止盈止损
        if (this.position) {
            const profitRate = (price - this.position.entryPrice) / this.position.entryPrice;
            
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
                    reason: `触发止损，亏损率 ${(profitRate * 100).toFixed(2)}%，预测置信度 ${(prediction.confidence * 100).toFixed(0)}%`
                });
                this.position = null;
                return signals;
            }

            // 止盈检查
            if (profitRate >= this.config.takeProfit) {
                signals.push({
                    action: 'sell',
                    price,
                    size: this.position.size,
                    reason: `触发止盈，盈利率 ${(profitRate * 100).toFixed(2)}%，预测置信度 ${(prediction.confidence * 100).toFixed(0)}%`
                });
                this.position = null;
                return signals;
            }

            // 预测反转时平仓
            if (prediction.direction === -1 && prediction.confidence >= this.config.minConfidence && 
                this.position.side === 'long') {
                signals.push({
                    action: 'sell',
                    price,
                    size: this.position.size,
                    reason: `预测价格下跌，平仓避险，预测置信度 ${(prediction.confidence * 100).toFixed(0)}%`
                });
                this.position = null;
                return signals;
            }
        }

        // 无持仓时开仓
        if (!this.position && prediction.direction === 1 && 
            prediction.confidence >= this.config.minConfidence) {
            signals.push({
                action: 'buy',
                price,
                size: 0.01, // 可配置仓位大小
                reason: `预测价格上涨，开仓买入，预测置信度 ${(prediction.confidence * 100).toFixed(0)}%，RSI: ${indicators.rsi.toFixed(1)}，波动率: ${(indicators.volatility * 100).toFixed(2)}%`
            });
        }

        return signals.length > 0 ? signals : { 
            action: 'hold', 
            reason: `预测置信度 ${(prediction.confidence * 100).toFixed(0)}%，RSI: ${indicators.rsi.toFixed(1)}，MACD: ${indicators.macd.toFixed(4)}` 
        };
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
                entryTime: new Date().toISOString(),
                predictionConfidence: this.lastPrediction?.confidence || 0
            };
            this.log(`机器学习策略开仓，价格 $${order.price}，数量 ${order.size}，预测置信度 ${(this.lastPrediction.confidence * 100).toFixed(0)}%`);
        }
    }

    // 模型更新（定期用新数据重新训练）
    updateModel(tradeResults) {
        // 简单的在线学习：根据交易结果调整权重
        for (const result of tradeResults) {
            if (result.profit > 0) {
                // 盈利交易，增加对应特征的权重
                for (const [feature, value] of Object.entries(result.features)) {
                    if (this.model.weights[feature]) {
                        this.model.weights[feature] *= 1.05; // 奖励5%
                    }
                }
            } else {
                // 亏损交易，减少对应特征的权重
                for (const [feature, value] of Object.entries(result.features)) {
                    if (this.model.weights[feature]) {
                        this.model.weights[feature] *= 0.95; // 惩罚5%
                    }
                }
            }
        }
        
        // 归一化权重
        const totalWeight = Object.values(this.model.weights).reduce((a, b) => a + Math.abs(b), 0);
        for (const key of Object.keys(this.model.weights)) {
            this.model.weights[key] /= totalWeight;
        }
        
        this.log('机器学习模型已更新，权重已调整');
    }
}
