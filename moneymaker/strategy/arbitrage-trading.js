// 套利交易策略 - 跨交易所/跨品种套利
// 监控多个交易所同一币种价差，低买高卖获取无风险收益
import { BaseStrategy } from '../strategy-engine.js';

export class ArbitrageTradingStrategy extends BaseStrategy {
    constructor(config = {}) {
        super(config);
        this.name = 'arbitrage-trading';
        this.description = '跨市场套利策略，捕捉价差收益';
        
        // 默认配置
        this.config = {
            minSpread: 0.005,               // 最小套利价差 0.5%
            maxSlippage: 0.002,              // 最大允许滑点 0.2%
            transactionFee: 0.001,           // 交易手续费 0.1%
            maxPositionSize: 0.01,           // 单笔套利最大仓位
            checkInterval: 1000,             // 价差检查间隔 1秒
            cooldownPeriod: 30000,           // 套利后冷却时间 30秒
            ...config
        };
        
        this.exchangeClients = new Map();     // 多交易所客户端
        this.lastArbitrageTime = 0;
        this.activeArbitrages = new Set();
        this.statistics = {
            totalOpportunities: 0,
            successfulArbitrages: 0,
            failedArbitrages: 0,
            totalProfit: 0
        };
    }

    // 添加交易所客户端
    addExchange(name, client) {
        this.exchangeClients.set(name, client);
        this.log(`已添加交易所: ${name}`);
    }

    // 获取多个交易所的价格
    async getPrices(symbol) {
        const prices = new Map();
        const promises = [];
        
        for (const [name, client] of this.exchangeClients.entries()) {
            promises.push(
                client.getTicker(symbol)
                    .then(price => prices.set(name, price))
                    .catch(error => this.log(`获取 ${name} ${symbol} 价格失败: ${error.message}`, 'WARN'))
            );
        }
        
        await Promise.allSettled(promises);
        return prices;
    }

    // 寻找套利机会
    findArbitrageOpportunity(prices) {
        if (prices.size < 2) return null;
        
        const priceEntries = Array.from(prices.entries());
        let maxSpread = 0;
        let bestOpportunity = null;
        
        // 找出最大价差
        for (let i = 0; i < priceEntries.length; i++) {
            for (let j = i + 1; j < priceEntries.length; j++) {
                const [exchangeA, priceA] = priceEntries[i];
                const [exchangeB, priceB] = priceEntries[j];
                
                const spread = Math.abs(priceA - priceB) / Math.min(priceA, priceB);
                
                if (spread > maxSpread && spread >= this.config.minSpread) {
                    maxSpread = spread;
                    const buyExchange = priceA < priceB ? exchangeA : exchangeB;
                    const sellExchange = priceA < priceB ? exchangeB : exchangeA;
                    const buyPrice = Math.min(priceA, priceB);
                    const sellPrice = Math.max(priceA, priceB);
                    
                    // 计算预期收益
                    const expectedProfit = (sellPrice * (1 - this.config.transactionFee) - 
                                          buyPrice * (1 + this.config.transactionFee)) / buyPrice;
                    
                    // 扣除滑点后仍有利润
                    if (expectedProfit > this.config.maxSlippage) {
                        bestOpportunity = {
                            buyExchange,
                            sellExchange,
                            symbol: 'SOL-USDT', // 当前仅支持SOL
                            buyPrice,
                            sellPrice,
                            spread,
                            expectedProfit,
                            size: Math.min(this.config.maxPositionSize, 0.01)
                        };
                    }
                }
            }
        }
        
        return bestOpportunity;
    }

    // 执行套利交易
    async executeArbitrage(opportunity) {
        const { buyExchange, sellExchange, symbol, buyPrice, sellPrice, size, expectedProfit } = opportunity;
        
        // 冷却时间检查
        if (Date.now() - this.lastArbitrageTime < this.config.cooldownPeriod) {
            this.log(`套利冷却中，跳过本次机会: ${(expectedProfit * 100).toFixed(2)}%`, 'INFO');
            return false;
        }
        
        // 防止重复执行
        const key = `${buyExchange}-${sellExchange}-${symbol}-${Date.now()}`;
        if (this.activeArbitrages.has(key)) {
            return false;
        }
        this.activeArbitrages.add(key);
        
        try {
            this.statistics.totalOpportunities++;
            this.log(`发现套利机会: ${buyExchange} 买 $${buyPrice}, ${sellExchange} 卖 $${sellPrice}, 预期收益 ${(expectedProfit * 100).toFixed(2)}%`);
            
            const buyClient = this.exchangeClients.get(buyExchange);
            const sellClient = this.exchangeClients.get(sellExchange);
            
            // 执行买入
            const buyResult = await buyClient.placeOrder({
                symbol,
                side: 'buy',
                type: 'market',
                size
            });
            
            if (!buyResult.success) {
                throw new Error(`买入失败: ${buyResult.error}`);
            }
            
            // 执行卖出
            const sellResult = await sellClient.placeOrder({
                symbol,
                side: 'sell',
                type: 'market',
                size
            });
            
            if (!sellResult.success) {
                throw new Error(`卖出失败: ${sellResult.error}`);
            }
            
            // 计算实际收益
            const actualProfit = (sellResult.averagePrice * (1 - this.config.transactionFee) - 
                                buyResult.averagePrice * (1 + this.config.transactionFee)) * size;
            
            this.statistics.successfulArbitrages++;
            this.statistics.totalProfit += actualProfit;
            this.lastArbitrageTime = Date.now();
            
            this.log(`✅ 套利成功，实际收益 $${actualProfit.toFixed(4)}，累计收益 $${this.statistics.totalProfit.toFixed(4)}`);
            return true;
            
        } catch (error) {
            this.statistics.failedArbitrages++;
            this.log(`❌ 套利失败: ${error.message}`, 'ERROR');
            return false;
        } finally {
            this.activeArbitrages.delete(key);
        }
    }

    // 三角套利机会识别
    findTriangularArbitrageOpportunity(prices) {
        // 三角套利逻辑（示例：SOL/USDT, BTC/SOL, BTC/USDT）
        if (!prices.has('SOL-USDT') || !prices.has('BTC-USDT') || !prices.has('BTC-SOL')) {
            return null;
        }
        
        const solUsdt = prices.get('SOL-USDT');
        const btcUsdt = prices.get('BTC-USDT');
        const btcSol = prices.get('BTC-SOL');
        
        // 计算交叉汇率
        const impliedSolUsdt = btcUsdt / btcSol;
        const spread = Math.abs(solUsdt - impliedSolUsdt) / Math.min(solUsdt, impliedSolUsdt);
        
        if (spread >= this.config.minSpread) {
            return {
                type: 'triangular',
                spread,
                path: 'USDT → SOL → BTC → USDT',
                expectedProfit: spread - 3 * this.config.transactionFee
            };
        }
        
        return null;
    }

    async onTick(tick) {
        // 套利策略需要高频检查，这里仅做示例
        // 实际运行时需要独立线程/进程执行
        const signals = [];
        
        // 当前仅支持单交易所交易，套利功能预留扩展
        // 后续接入多交易所API后可自动执行
        
        return {
            action: 'hold',
            reason: '套利策略运行中，等待跨交易所价差机会',
            arbitrageStats: this.statistics
        };
    }

    // 获取策略统计
    getStatistics() {
        const winRate = this.statistics.totalOpportunities > 0 ? 
            (this.statistics.successfulArbitrages / this.statistics.totalOpportunities * 100).toFixed(2) : 0;
        
        return {
            ...this.statistics,
            winRate: `${winRate}%`,
            averageProfitPerArbitrage: this.statistics.successfulArbitrages > 0 ? 
                (this.statistics.totalProfit / this.statistics.successfulArbitrages).toFixed(4) : 0
        };
    }
}
