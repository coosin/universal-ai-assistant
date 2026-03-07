// Coosin 风控模块 - 风险控制与资金管理

export class RiskManager {
    constructor(config = {}) {
        this.config = {
            maxPositionPercent: config.maxPositionPercent || 0.3, // 单品种最大仓位 30%
            maxDailyLossPercent: config.maxDailyLossPercent || 0.05, // 单日最大亏损 5%
            maxDrawdownPercent: config.maxDrawdownPercent || 0.15, // 最大回撤 15%
            stopLossPercent: config.stopLossPercent || 0.02, // 默认止损 2%
            takeProfitPercent: config.takeProfitPercent || 0.05, // 默认止盈 5%
            ...config
        };
        
        this.dailyPnL = 0;
        this.peakEquity = 0;
        this.tradesToday = [];
    }

    // 检查是否可以开仓
    canOpenPosition(positionValue, totalEquity) {
        const positionPercent = positionValue / totalEquity;
        
        if (positionPercent > this.config.maxPositionPercent) {
            console.log(`[Risk] 拒绝开仓: 仓位 ${(positionPercent * 100).toFixed(2)}% 超过上限 ${(this.config.maxPositionPercent * 100).toFixed(2)}%`);
            return false;
        }
        
        if (this.dailyPnL < -totalEquity * this.config.maxDailyLossPercent) {
            console.log('[Risk] 拒绝开仓: 单日亏损已达上限');
            return false;
        }
        
        const currentDrawdown = this.calculateDrawdown(totalEquity);
        if (currentDrawdown > this.config.maxDrawdownPercent) {
            console.log(`[Risk] 拒绝开仓: 回撤 ${(currentDrawdown * 100).toFixed(2)}% 超过上限`);
            return false;
        }
        
        return true;
    }

    // 计算止损价
    calculateStopLoss(entryPrice, side) {
        if (side === 'long') {
            return entryPrice * (1 - this.config.stopLossPercent);
        } else {
            return entryPrice * (1 + this.config.stopLossPercent);
        }
    }

    // 计算止盈价
    calculateTakeProfit(entryPrice, side) {
        if (side === 'long') {
            return entryPrice * (1 + this.config.takeProfitPercent);
        } else {
            return entryPrice * (1 - this.config.takeProfitPercent);
        }
    }

    // 检查是否触发止损止盈
    shouldClosePosition(position, currentPrice) {
        const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        
        if (position.stopLoss && currentPrice <= position.stopLoss) {
            return { action: 'stop-loss', reason: `触发止损: ${currentPrice} <= ${position.stopLoss}` };
        }
        
        if (position.takeProfit && currentPrice >= position.takeProfit) {
            return { action: 'take-profit', reason: `触发止盈: ${currentPrice} >= ${position.takeProfit}` };
        }
        
        return null;
    }

    // 记录交易
    recordTrade(trade) {
        this.tradesToday.push(trade);
        this.dailyPnL += trade.pnl;
        
        if (trade.equityAfter > this.peakEquity) {
            this.peakEquity = trade.equityAfter;
        }
    }

    // 计算当前回撤
    calculateDrawdown(currentEquity) {
        if (this.peakEquity === 0) {
            this.peakEquity = currentEquity;
            return 0;
        }
        return (this.peakEquity - currentEquity) / this.peakEquity;
    }

    // 重置每日数据
    resetDaily() {
        this.dailyPnL = 0;
        this.tradesToday = [];
    }

    // 获取风控状态
    getStatus() {
        return {
            dailyPnL: this.dailyPnL,
            peakEquity: this.peakEquity,
            tradesToday: this.tradesToday.length,
            config: this.config
        };
    }
}

export default RiskManager;
