// Coosin 回测引擎 - 策略验证框架

export class BacktestEngine {
    constructor(strategy, initialCapital = 10000) {
        this.strategy = strategy;
        this.initialCapital = initialCapital;
        this.capital = initialCapital;
        this.position = null;
        this.trades = [];
        this.equityCurve = [];
    }

    // 运行回测
    run(historicalData) {
        console.log('[Backtest] 开始回测...');
        console.log(`[Backtest] 初始资金: ${this.initialCapital}`);
        console.log(`[Backtest] 数据点数量: ${historicalData.length}`);

        for (let i = 0; i < historicalData.length; i++) {
            const tick = historicalData[i];
            this.processTick(tick, i);
        }

        // 结束时平掉所有持仓
        if (this.position) {
            const lastTick = historicalData[historicalData.length - 1];
            this.closePosition(parseFloat(lastTick.close), '回测结束');
        }

        const results = this.calculateResults();
        console.log('[Backtest] 回测完成');
        console.log(`[Backtest] 最终资金: ${results.finalCapital.toFixed(2)}`);
        console.log(`[Backtest] 总收益率: ${(results.totalReturn * 100).toFixed(2)}%`);
        console.log(`[Backtest] 交易次数: ${results.totalTrades}`);
        console.log(`[Backtest] 胜率: ${(results.winRate * 100).toFixed(2)}%`);

        return results;
    }

    // 处理单个行情点
    processTick(tick, index) {
        const signal = this.strategy.onTick(tick);
        
        if (signal) {
            const price = parseFloat(tick.close);
            
            if (signal.action === 'buy' && !this.position) {
                this.openPosition('long', price, signal.reason);
            } else if (signal.action === 'sell' && this.position) {
                this.closePosition(price, signal.reason);
            }
        }

        // 记录资金曲线
        this.equityCurve.push({
            timestamp: tick.timestamp || tick.time,
            equity: this.calculateCurrentEquity(parseFloat(tick.close))
        });
    }

    // 开仓
    openPosition(side, price, reason) {
        const size = this.calculatePositionSize(price);
        this.position = {
            side,
            entryPrice: price,
            size,
            reason,
            entryTime: new Date().toISOString()
        };
        console.log(`[Backtest] 开仓: ${side.toUpperCase()} @ ${price}, 数量: ${size.toFixed(4)}`);
    }

    // 平仓
    closePosition(price, reason) {
        if (!this.position) return;

        const pnl = this.calculatePnL(price);
        this.capital += pnl;

        this.trades.push({
            ...this.position,
            exitPrice: price,
            exitReason: reason,
            exitTime: new Date().toISOString(),
            pnl,
            pnlPercent: ((price - this.position.entryPrice) / this.position.entryPrice) * 100
        });

        console.log(`[Backtest] 平仓: ${price}, 盈亏: ${pnl.toFixed(2)} (${((pnl / this.initialCapital) * 100).toFixed(2)}%)`);

        this.position = null;
    }

    // 计算仓位大小
    calculatePositionSize(price) {
        // 简单策略：每次用 95% 资金买入
        return (this.capital * 0.95) / price;
    }

    // 计算当前盈亏
    calculatePnL(currentPrice) {
        if (!this.position) return 0;
        const priceDiff = currentPrice - this.position.entryPrice;
        return priceDiff * this.position.size;
    }

    // 计算当前权益
    calculateCurrentEquity(currentPrice) {
        if (!this.position) return this.capital;
        return this.capital + this.calculatePnL(currentPrice);
    }

    // 计算回测结果
    calculateResults() {
        const winningTrades = this.trades.filter(t => t.pnl > 0);
        const losingTrades = this.trades.filter(t => t.pnl <= 0);
        
        const totalPnL = this.capital - this.initialCapital;
        const totalReturn = totalPnL / this.initialCapital;
        
        const maxDrawdown = this.calculateMaxDrawdown();
        
        return {
            initialCapital: this.initialCapital,
            finalCapital: this.capital,
            totalPnL,
            totalReturn,
            totalTrades: this.trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: this.trades.length > 0 ? winningTrades.length / this.trades.length : 0,
            avgWin: winningTrades.length > 0 ? winningTrades.reduce((a, b) => a + b.pnl, 0) / winningTrades.length : 0,
            avgLoss: losingTrades.length > 0 ? losingTrades.reduce((a, b) => a + b.pnl, 0) / losingTrades.length : 0,
            maxDrawdown,
            trades: this.trades,
            equityCurve: this.equityCurve
        };
    }

    // 计算最大回撤
    calculateMaxDrawdown() {
        let peak = this.initialCapital;
        let maxDrawdown = 0;

        for (const point of this.equityCurve) {
            if (point.equity > peak) {
                peak = point.equity;
            }
            const drawdown = (peak - point.equity) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }

        return maxDrawdown;
    }
}

export default BacktestEngine;
