// 网格交易策略 - 震荡行情获利
// 在一定价格区间内，高抛低吸，获取差价收益

import { BaseStrategy } from '../strategy-engine.js';

export class GridTradingStrategy extends BaseStrategy {
    constructor(config = {}) {
        super(config);
        this.name = 'grid-trading';
        this.description = '网格交易策略，适合震荡行情';
        
        // 默认配置
        this.config = {
            gridCount: 5,                    // 网格数量
            gridRange: 0.1,                  // 网格范围 (±10%)
            basePrice: 0,                    // 基础价格（动态计算）
            gridSpread: 0.02,                // 网格间距 2%
            takeProfitPerGrid: 0.01,         // 每个网格的止盈 1%
            maxActiveGrids: 10,              // 最大活动网格数
            trailingStop: 0.005,             // 追踪止损 0.5%
            ...config
        };
        
        this.grids = new Map();              // 网格订单
        this.position = null;                // 当前持仓
        this.lastPrice = 0;
        this.basePrice = 0;
    }

    // 计算网格价格
    calculateGridPrices(basePrice) {
        const prices = [];
        const gridSize = basePrice * this.config.gridSpread;
        
        // 向上网格
        for (let i = 1; i <= this.config.gridCount; i++) {
            prices.push(basePrice + gridSize * i);
        }
        
        // 向下网格
        for (let i = 1; i <= this.config.gridCount; i++) {
            prices.push(basePrice - gridSize * i);
        }
        
        return prices.sort((a, b) => a - b);
    }

    // 创建网格订单
    createGridOrders(price) {
        const gridPrices = this.calculateGridPrices(price);
        const orders = [];
        
        for (const gridPrice of gridPrices) {
            orders.push({
                type: 'limit',
                side: gridPrice > price ? 'sell' : 'buy',
                price: gridPrice,
                size: 0.01, // 固定网格交易量
                status: 'pending'
            });
        }
        
        return orders;
    }

    // 处理行情
    onTick(tick) {
        const price = parseFloat(tick.close);
        this.lastPrice = price;
        
        // 初始化基础价格
        if (this.basePrice === 0) {
            this.basePrice = price;
            this.log(`网格策略初始化，基础价格: $${price}`);
        }

        // 更新网格（如果价格波动超过一定范围）
        if (Math.abs(price - this.basePrice) / this.basePrice > 0.05) {
            this.basePrice = price;
            this.grids.clear();
            this.log(`网格策略重新初始化，基础价格更新为: $${price}`);
        }

        // 检查网格订单
        const signals = [];
        
        // 检查是否需要开仓
        if (!this.position && price < this.basePrice * (1 - this.config.gridRange / 2)) {
            signals.push({
                action: 'buy',
                price: price,
                size: 0.01,
                reason: `价格低于基础价 ${(this.basePrice * (1 - this.config.gridRange / 2)).toFixed(4)}，开仓买入`
            });
        }

        // 检查是否需要平仓
        if (this.position && price > this.basePrice * (1 + this.config.gridRange / 2)) {
            signals.push({
                action: 'sell',
                price: price,
                size: this.position.size,
                reason: `价格高于基础价 ${(this.basePrice * (1 + this.config.gridRange / 2)).toFixed(4)}，平仓止盈`
            });
        }

        return signals;
    }

    // 开仓
    onBuy(price, size) {
        this.position = {
            side: 'long',
            price,
            size,
            entryTime: new Date().toISOString(),
            takeProfit: price * (1 + this.config.takeProfitPerGrid),
            stopLoss: price * (1 - this.config.trailingStop)
        };
        
        this.log(`网格策略开仓: 价格 $${price}, 数量 ${size}, 止盈 $${this.position.takeProfit}, 止损 $${this.position.stopLoss}`);
    }

    // 平仓
    onSell(price, size) {
        if (this.position) {
            const profit = (price - this.position.price) * size;
            this.log(`网格策略平仓: 价格 $${price}, 数量 ${size}, 盈利 $${profit.toFixed(4)}`);
            this.position = null;
        }
    }

    // 更新止损
    updateStopLoss(currentPrice) {
        if (this.position) {
            const newStopLoss = currentPrice * (1 - this.config.trailingStop);
            if (newStopLoss > this.position.stopLoss) {
                this.position.stopLoss = newStopLoss;
                this.log(`网格策略追踪止损更新: $${this.position.stopLoss.toFixed(4)}`);
            }
        }
    }
}
