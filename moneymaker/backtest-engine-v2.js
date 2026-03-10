// 回测引擎V2 - 多策略回测框架
// 支持多策略并行回测、绩效分析、参数优化
import fs from 'fs';
import path from 'path';
import { StrategyFactory, StrategyCombination } from './strategy/strategy-factory.js';

export class BacktestEngineV2 {
    constructor(config = {}) {
        this.config = {
            initialCapital: 10000,          // 初始资金
            commission: 0.001,              // 交易手续费
            slippage: 0.002,                // 滑点
            startDate: null,
            endDate: null,
            ...config
        };
        
        this.results = new Map();
        this.optimizationResults = [];
    }

    // 加载历史数据
    loadHistoricalData(filePath) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            this.historicalData = data.map(item => ({
                timestamp: new Date(item.time).getTime(),
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close),
                volume: parseFloat(item.volume || 0)
            })).sort((a, b) => a.timestamp - b.timestamp);
            
            console.log(`✅ 加载历史数据成功，共 ${this.historicalData.length} 条记录`);
            return this.historicalData;
        } catch (error) {
            console.error(`❌ 加载历史数据失败: ${error.message}`);
            throw error;
        }
    }

    // 单策略回测
    async runBacktest(strategyType, strategyConfig = {}) {
        const strategy = StrategyFactory.createStrategy(strategyType, strategyConfig);
        const capital = this.config.initialCapital;
        let position = null;
        const trades = [];
        const equityCurve = [];
        let maxDrawdown = 0;
        let peakCapital = capital;
        
        console.log(`🚀 开始回测策略: ${strategyType}`);

        for (let i = 0; i < this.historicalData.length; i++) {
            const tick = this.historicalData[i];
            const signal = strategy.onTick({ close: tick.close });
            
            // 处理信号
            if (Array.isArray(signal)) {
                for (const s of signal) {
                    if (s.action === 'buy' && !position) {
                        // 模拟买入
                        const buyPrice = tick.close * (1 + this.config.slippage);
                        const size = (capital * 0.1) / buyPrice; // 10%仓位
                        const fee = buyPrice * size * this.config.commission;
                        
                        position = {
                            entryPrice: buyPrice,
                            size,
                            entryTime: tick.timestamp,
                            fee
                        };
                        
                        capital -= buyPrice * size + fee;
                        
                    } else if (s.action === 'sell' && position) {
                        // 模拟卖出
                        const sellPrice = tick.close * (1 - this.config.slippage);
                        const revenue = sellPrice * position.size;
                        const fee = revenue * this.config.commission;
                        const profit = revenue - fee - position.entryPrice * position.size - position.fee;
                        
                        trades.push({
                            entryTime: position.entryTime,
                            exitTime: tick.timestamp,
                            entryPrice: position.entryPrice,
                            exitPrice: sellPrice,
                            size: position.size,
                            profit,
                            profitRate: profit / (position.entryPrice * position.size)
                        });
                        
                        capital += revenue - fee;
                        position = null;
                    }
                }
            }

            // 更新权益曲线
            const currentEquity = capital + (position ? position.size * tick.close : 0);
            equityCurve.push({
                timestamp: tick.timestamp,
                equity: currentEquity
            });

            // 更新最大回撤
            if (currentEquity > peakCapital) {
                peakCapital = currentEquity;
            }
            const drawdown = (peakCapital - currentEquity) / peakCapital;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }

        // 计算绩效指标
        const totalReturn = (capital + (position ? position.size * this.historicalData[this.historicalData.length - 1].close : 0) - this.config.initialCapital) / this.config.initialCapital;
        const winTrades = trades.filter(t => t.profit > 0).length;
        const loseTrades = trades.filter(t => t.profit <= 0).length;
        const winRate = trades.length > 0 ? winTrades / trades.length : 0;
        const totalProfit = trades.reduce((sum, t) => sum + Math.max(t.profit, 0), 0);
        const totalLoss = trades.reduce((sum, t) => sum + Math.abs(Math.min(t.profit, 0)), 0);
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : Infinity;

        const result = {
            strategyType,
            strategyConfig,
            totalReturn,
            annualizedReturn: this.calculateAnnualizedReturn(totalReturn, this.historicalData.length),
            maxDrawdown,
            winRate,
            profitFactor,
            totalTrades: trades.length,
            winTrades,
            loseTrades,
            averageProfitPerTrade: trades.length > 0 ? trades.reduce((sum, t) => sum + t.profit, 0) / trades.length : 0,
            trades,
            equityCurve,
            peakCapital,
            finalCapital: capital + (position ? position.size * this.historicalData[this.historicalData.length - 1].close : 0)
        };

        this.results.set(strategyType, result);
        this.printResult(result);
        
        return result;
    }

    // 计算年化收益率
    calculateAnnualizedReturn(totalReturn, dataPoints) {
        // 假设每个数据点是1小时
        const years = dataPoints / (24 * 365);
        return years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : totalReturn;
    }

    // 打印回测结果
    printResult(result) {
        console.log(`\n📊 回测结果 - ${result.strategyType}`);
        console.log(`总收益率: ${(result.totalReturn * 100).toFixed(2)}%`);
        console.log(`年化收益率: ${(result.annualizedReturn * 100).toFixed(2)}%`);
        console.log(`最大回撤: ${(result.maxDrawdown * 100).toFixed(2)}%`);
        console.log(`胜率: ${(result.winRate * 100).toFixed(2)}%`);
        console.log(`盈亏比: ${result.profitFactor.toFixed(2)}`);
        console.log(`总交易次数: ${result.totalTrades}`);
        console.log(`盈利次数: ${result.winTrades}, 亏损次数: ${result.loseTrades}`);
        console.log(`平均每笔盈利: $${result.averageProfitPerTrade.toFixed(4)}`);
        console.log(`最终资金: $${result.finalCapital.toFixed(2)}`);
        console.log('----------------------------------------');
    }

    // 多策略并行回测
    async runAllStrategies() {
        const strategies = StrategyFactory.getAllStrategies();
        const results = [];
        
        for (const strategy of strategies) {
            try {
                const result = await this.runBacktest(strategy);
                results.push(result);
            } catch (error) {
                console.error(`策略 ${strategy} 回测失败: ${error.message}`);
            }
        }
        
        // 排名
        return results.sort((a, b) => b.totalReturn - a.totalReturn);
    }

    // 策略组合回测
    async runCombinationBacktest(combinationName) {
        const combination = StrategyCombination[combinationName];
        if (!combination) {
            throw new Error(`未知策略组合: ${combinationName}`);
        }
        
        let totalReturn = 0;
        let maxDrawdown = 0;
        const allTrades = [];
        
        for (const { type, weight } of combination) {
            const result = await this.runBacktest(type);
            totalReturn += result.totalReturn * weight;
            maxDrawdown = Math.max(maxDrawdown, result.maxDrawdown * weight);
            allTrades.push(...result.trades);
        }
        
        const combinedResult = {
            combinationName,
            totalReturn,
            maxDrawdown,
            totalTrades: allTrades.length,
            winRate: allTrades.filter(t => t.profit > 0).length / allTrades.length,
            expectedReturnToDrawdown: totalReturn / maxDrawdown
        };
        
        console.log(`\n📊 组合回测结果 - ${combinationName}`);
        console.log(`总收益率: ${(totalReturn * 100).toFixed(2)}%`);
        console.log(`最大回撤: ${(maxDrawdown * 100).toFixed(2)}%`);
        console.log(`收益回撤比: ${combinedResult.expectedReturnToDrawdown.toFixed(2)}`);
        console.log('----------------------------------------');
        
        return combinedResult;
    }

    // 参数优化
    async optimizeParameters(strategyType, paramRanges) {
        console.log(`🔧 开始优化策略 ${strategyType} 参数...`);
        
        const paramCombinations = this.generateParameterCombinations(paramRanges);
        console.log(`共生成 ${paramCombinations.length} 组参数组合`);
        
        const results = [];
        for (const params of paramCombinations) {
            try {
                const result = await this.runBacktest(strategyType, params);
                results.push({
                    params,
                    score: result.totalReturn / Math.max(result.maxDrawdown, 0.01), // 收益回撤比作为评分
                    ...result
                });
            } catch (error) {
                console.error(`参数组合 ${JSON.stringify(params)} 回测失败: ${error.message}`);
            }
        }
        
        // 按评分排序
        const sortedResults = results.sort((a, b) => b.score - a.score);
        this.optimizationResults = sortedResults;
        
        console.log(`\n🏆 最优参数组合:`);
        console.log(`参数: ${JSON.stringify(sortedResults[0].params)}`);
        console.log(`评分: ${sortedResults[0].score.toFixed(2)}`);
        console.log(`收益率: ${(sortedResults[0].totalReturn * 100).toFixed(2)}%`);
        console.log(`最大回撤: ${(sortedResults[0].maxDrawdown * 100).toFixed(2)}%`);
        
        return sortedResults[0];
    }

    // 生成参数组合
    generateParameterCombinations(paramRanges) {
        const keys = Object.keys(paramRanges);
        const combinations = [{}];
        
        for (const key of keys) {
            const range = paramRanges[key];
            const values = [];
            
            if (range.type === 'int') {
                for (let i = range.min; i <= range.max; i += range.step || 1) {
                    values.push(i);
                }
            } else if (range.type === 'float') {
                for (let i = range.min; i <= range.max; i += range.step || 0.01) {
                    values.push(parseFloat(i.toFixed(4)));
                }
            }
            
            const newCombinations = [];
            for (const combo of combinations) {
                for (const value of values) {
                    newCombinations.push({ ...combo, [key]: value });
                }
            }
            combinations.splice(0, combinations.length, ...newCombinations);
        }
        
        return combinations;
    }

    // 导出回测结果
    exportResults(filePath) {
        const exportData = {
            config: this.config,
            results: Object.fromEntries(this.results.entries()),
            optimizationResults: this.optimizationResults,
            exportTime: new Date().toISOString()
        };
        
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        console.log(`✅ 回测结果已导出到: ${filePath}`);
    }

    // 生成回测报告
    generateReport(outputDir) {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 生成Markdown报告
        let report = `# 交易策略回测报告\n\n`;
        report += `## 回测配置\n`;
        report += `- 初始资金: $${this.config.initialCapital}\n`;
        report += `- 手续费: ${(this.config.commission * 100).toFixed(2)}%\n`;
        report += `- 滑点: ${(this.config.slippage * 100).toFixed(2)}%\n`;
        report += `- 数据量: ${this.historicalData.length} 根K线\n\n`;
        
        report += `## 策略回测结果排名\n\n`;
        report += `| 策略 | 总收益率 | 年化收益率 | 最大回撤 | 胜率 | 盈亏比 | 交易次数 |\n`;
        report += `|------|----------|------------|----------|------|--------|----------|\n`;
        
        const sortedResults = Array.from(this.results.values()).sort((a, b) => b.totalReturn - a.totalReturn);
        for (const result of sortedResults) {
            report += `| ${result.strategyType} | ${(result.totalReturn * 100).toFixed(2)}% | ${(result.annualizedReturn * 100).toFixed(2)}% | ${(result.maxDrawdown * 100).toFixed(2)}% | ${(result.winRate * 100).toFixed(2)}% | ${result.profitFactor.toFixed(2)} | ${result.totalTrades} |\n`;
        }
        
        if (this.optimizationResults.length > 0) {
            report += `\n## 参数优化结果\n\n`;
            report += `最优参数组合: ${JSON.stringify(this.optimizationResults[0].params)}\n`;
            report += `最优评分: ${this.optimizationResults[0].score.toFixed(2)}\n`;
        }
        
        const reportPath = path.join(outputDir, 'backtest-report.md');
        fs.writeFileSync(reportPath, report);
        console.log(`📄 回测报告已生成: ${reportPath}`);
        
        return reportPath;
    }
}
