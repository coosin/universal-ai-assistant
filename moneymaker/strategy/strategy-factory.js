// 策略工厂 - 统一创建和管理所有交易策略
import { DynamicThresholdStrategy } from './dynamic-threshold.js';
import { GridTradingStrategy } from './grid-trading.js';
import { VolatilityTradingStrategy } from './volatility-trading.js';
import { MachineLearningTradingStrategy } from './machine-learning-trading.js';
import { ArbitrageTradingStrategy } from './arbitrage-trading.js';

export const StrategyFactory = {
    // 策略类型枚举
    StrategyType: {
        DYNAMIC_THRESHOLD: 'dynamic-threshold',
        GRID_TRADING: 'grid-trading',
        VOLATILITY_TRADING: 'volatility-trading',
        MACHINE_LEARNING: 'machine-learning',
        ARBITRAGE: 'arbitrage'
    },

    // 创建策略实例
    createStrategy(type, config = {}) {
        switch (type) {
            case this.StrategyType.DYNAMIC_THRESHOLD:
                return new DynamicThresholdStrategy(config);
            case this.StrategyType.GRID_TRADING:
                return new GridTradingStrategy(config);
            case this.StrategyType.VOLATILITY_TRADING:
                return new VolatilityTradingStrategy(config);
            case this.StrategyType.MACHINE_LEARNING:
                return new MachineLearningTradingStrategy(config);
            case this.StrategyType.ARBITRAGE:
                return new ArbitrageTradingStrategy(config);
            default:
                throw new Error(`未知策略类型: ${type}`);
        }
    },

    // 获取所有可用策略
    getAllStrategies() {
        return Object.values(this.StrategyType);
    },

    // 获取策略描述
    getStrategyDescription(type) {
        const descriptions = {
            [this.StrategyType.DYNAMIC_THRESHOLD]: '动态阈值策略，根据波动率自动调整止盈止损，适合大部分行情',
            [this.StrategyType.GRID_TRADING]: '网格交易策略，震荡行情自动高抛低吸，适合震荡市',
            [this.StrategyType.VOLATILITY_TRADING]: '波动率交易策略，捕捉趋势行情，适合趋势市',
            [this.StrategyType.MACHINE_LEARNING]: '机器学习策略，基于技术指标预测价格走势，智能决策',
            [this.StrategyType.ARBITRAGE]: '套利策略，跨市场/跨品种捕捉价差收益，低风险'
        };
        return descriptions[type] || '未知策略';
    },

    // 根据行情推荐最优策略
    recommendStrategy(marketRegime, volatility = 0, trendStrength = 0) {
        if (marketRegime === 'range' && volatility < 0.01) {
            return {
                type: this.StrategyType.GRID_TRADING,
                reason: '震荡行情+低波动率，网格策略收益稳定'
            };
        } else if (marketRegime === 'trend' && volatility > 0.01) {
            return {
                type: this.StrategyType.VOLATILITY_TRADING,
                reason: '趋势行情+高波动率，波动率策略捕捉趋势收益'
            };
        } else if (marketRegime === 'volatile' && volatility > 0.015) {
            return {
                type: this.StrategyType.MACHINE_LEARNING,
                reason: '高波动行情，机器学习策略自适应能力强'
            };
        } else {
            return {
                type: this.StrategyType.DYNAMIC_THRESHOLD,
                reason: '混合行情，动态阈值策略适应性强'
            };
        }
    },

    // 获取策略风险等级
    getRiskLevel(type) {
        const riskLevels = {
            [this.StrategyType.DYNAMIC_THRESHOLD]: '低风险',
            [this.StrategyType.GRID_TRADING]: '中低风险',
            [this.StrategyType.VOLATILITY_TRADING]: '中风险',
            [this.StrategyType.MACHINE_LEARNING]: '中高风险',
            [this.StrategyType.ARBITRAGE]: '极低风险'
        };
        return riskLevels[type] || '未知';
    },

    // 获取策略适用行情
    getSuitableMarket(type) {
        const suitableMarkets = {
            [this.StrategyType.DYNAMIC_THRESHOLD]: '所有行情',
            [this.StrategyType.GRID_TRADING]: '震荡行情',
            [this.StrategyType.VOLATILITY_TRADING]: '趋势行情',
            [this.StrategyType.MACHINE_LEARNING]: '高波动行情',
            [this.StrategyType.ARBITRAGE]: '跨市场价差行情'
        };
        return suitableMarkets[type] || '未知';
    }
};

// 预定义策略组合
export const StrategyCombination = {
    // 保守型组合：低风险稳定收益
    CONSERVATIVE: [
        { type: StrategyFactory.StrategyType.DYNAMIC_THRESHOLD, weight: 0.6 },
        { type: StrategyFactory.StrategyType.GRID_TRADING, weight: 0.4 }
    ],
    // 平衡型组合：风险收益均衡
    BALANCED: [
        { type: StrategyFactory.StrategyType.DYNAMIC_THRESHOLD, weight: 0.3 },
        { type: StrategyFactory.StrategyType.GRID_TRADING, weight: 0.2 },
        { type: StrategyFactory.StrategyType.VOLATILITY_TRADING, weight: 0.3 },
        { type: StrategyFactory.StrategyType.MACHINE_LEARNING, weight: 0.2 }
    ],
    // 进取型组合：高风险高收益
    AGGRESSIVE: [
        { type: StrategyFactory.StrategyType.VOLATILITY_TRADING, weight: 0.4 },
        { type: StrategyFactory.StrategyType.MACHINE_LEARNING, weight: 0.4 },
        { type: StrategyFactory.StrategyType.DYNAMIC_THRESHOLD, weight: 0.2 }
    ],
    // 套利型组合：极低风险
    ARBITRAGE: [
        { type: StrategyFactory.StrategyType.ARBITRAGE, weight: 0.7 },
        { type: StrategyFactory.StrategyType.DYNAMIC_THRESHOLD, weight: 0.3 }
    ]
};
