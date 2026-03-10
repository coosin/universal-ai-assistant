// 性能监控系统 - 实时监控交易系统性能与盈利效率
// 统计延迟、胜率、收益率等关键指标，自动优化系统参数
import os from 'os';
import process from 'process';

export class PerformanceMonitor {
    constructor(config = {}) {
        this.config = {
            checkInterval: 60000, // 每分钟检查一次
            alertThreshold: {
                latency: 1000, // API延迟超过1秒告警
                winRate: 0.4, // 胜率低于40%告警
                drawdown: 0.05, // 回撤超过5%告警
                cpuUsage: 0.8, // CPU使用率超过80%告警
                memoryUsage: 0.85 // 内存使用率超过85%告警
            },
            ...config
        };
        
        this.metrics = {
            apiLatency: [],
            tradeExecutionTime: [],
            systemMetrics: [],
            tradingMetrics: {
                totalTrades: 0,
                winTrades: 0,
                loseTrades: 0,
                totalProfit: 0,
                totalLoss: 0,
                maxDrawdown: 0,
                peakCapital: 0
            }
        };
        
        this.alerts = [];
        this.startTime = Date.now();
        this.running = false;
    }

    // 启动监控
    start() {
        this.running = true;
        this.monitorLoop();
        console.log('🚀 性能监控系统已启动');
    }

    // 停止监控
    stop() {
        this.running = false;
        console.log('🛑 性能监控系统已停止');
    }

    // 监控主循环
    async monitorLoop() {
        while (this.running) {
            try {
                await this.collectSystemMetrics();
                this.checkAlerts();
                this.cleanupOldMetrics();
            } catch (error) {
                console.error(`监控循环异常: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, this.config.checkInterval));
        }
    }

    // 收集系统指标
    async collectSystemMetrics() {
        const cpuUsage = this.getCpuUsage();
        const memoryUsage = this.getMemoryUsage();
        const diskUsage = await this.getDiskUsage();
        const networkLatency = await this.measureNetworkLatency();
        
        const metric = {
            timestamp: Date.now(),
            cpuUsage,
            memoryUsage,
            diskUsage,
            networkLatency,
            processUptime: process.uptime()
        };
        
        this.metrics.systemMetrics.push(metric);
        return metric;
    }

    // 获取CPU使用率
    getCpuUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 1 - idle / total;
        
        return Math.min(1, Math.max(0, usage));
    }

    // 获取内存使用率
    getMemoryUsage() {
        const totalMem = os.totalmem();
        const usedMem = totalMem - os.freemem();
        return usedMem / totalMem;
    }

    // 获取磁盘使用率
    async getDiskUsage() {
        try {
            const { exec } = await import('child_process');
            return new Promise((resolve) => {
                exec('df -h / | tail -1 | awk \'{print $5}\'', (error, stdout) => {
                    if (error) resolve(0);
                    else resolve(parseFloat(stdout) / 100);
                });
            });
        } catch (error) {
            return 0;
        }
    }

    // 测量网络延迟（ping交易所API）
    async measureNetworkLatency() {
        const startTime = Date.now();
        try {
            const { default: fetch } = await import('node-fetch');
            await fetch('https://www.okx.com/api/v5/public/time', { timeout: 5000 });
            return Date.now() - startTime;
        } catch (error) {
            return 9999; // 超时返回高延迟
        }
    }

    // 记录API延迟
    recordApiLatency(latency) {
        this.metrics.apiLatency.push({
            timestamp: Date.now(),
            latency
        });
    }

    // 记录交易执行时间
    recordTradeExecutionTime(time, success = true) {
        this.metrics.tradeExecutionTime.push({
            timestamp: Date.now(),
            time,
            success
        });

        if (success) {
            this.metrics.tradingMetrics.totalTrades++;
        }
    }

    // 更新交易结果
    updateTradeResult(profit, capital) {
        if (profit > 0) {
            this.metrics.tradingMetrics.winTrades++;
            this.metrics.tradingMetrics.totalProfit += profit;
        } else {
            this.metrics.tradingMetrics.loseTrades++;
            this.metrics.tradingMetrics.totalLoss += Math.abs(profit);
        }

        // 更新最大回撤
        if (capital > this.metrics.tradingMetrics.peakCapital) {
            this.metrics.tradingMetrics.peakCapital = capital;
        }
        const drawdown = (this.metrics.tradingMetrics.peakCapital - capital) / this.metrics.tradingMetrics.peakCapital;
        if (drawdown > this.metrics.tradingMetrics.maxDrawdown) {
            this.metrics.tradingMetrics.maxDrawdown = drawdown;
        }
    }

    // 检查告警条件
    checkAlerts() {
        const alerts = [];
        const latestMetrics = this.metrics.systemMetrics[this.metrics.systemMetrics.length - 1];
        
        if (!latestMetrics) return [];

        // API延迟告警
        const avgLatency = this.getAverageApiLatency();
        if (avgLatency > this.config.alertThreshold.latency) {
            alerts.push({
                type: 'high_latency',
                level: 'warning',
                message: `API平均延迟过高: ${avgLatency.toFixed(0)}ms`,
                value: avgLatency,
                threshold: this.config.alertThreshold.latency
            });
        }

        // CPU使用率告警
        if (latestMetrics.cpuUsage > this.config.alertThreshold.cpuUsage) {
            alerts.push({
                type: 'high_cpu',
                level: 'warning',
                message: `CPU使用率过高: ${(latestMetrics.cpuUsage * 100).toFixed(1)}%`,
                value: latestMetrics.cpuUsage,
                threshold: this.config.alertThreshold.cpuUsage
            });
        }

        // 内存使用率告警
        if (latestMetrics.memoryUsage > this.config.alertThreshold.memoryUsage) {
            alerts.push({
                type: 'high_memory',
                level: 'warning',
                message: `内存使用率过高: ${(latestMetrics.memoryUsage * 100).toFixed(1)}%`,
                value: latestMetrics.memoryUsage,
                threshold: this.config.alertThreshold.memoryUsage
            });
        }

        // 胜率告警
        const winRate = this.getWinRate();
        if (this.metrics.tradingMetrics.totalTrades >= 10 && winRate < this.config.alertThreshold.winRate) {
            alerts.push({
                type: 'low_win_rate',
                level: 'critical',
                message: `交易胜率过低: ${(winRate * 100).toFixed(1)}%`,
                value: winRate,
                threshold: this.config.alertThreshold.winRate
            });
        }

        // 回撤告警
        if (this.metrics.tradingMetrics.maxDrawdown > this.config.alertThreshold.drawdown) {
            alerts.push({
                type: 'high_drawdown',
                level: 'critical',
                message: `最大回撤过高: ${(this.metrics.tradingMetrics.maxDrawdown * 100).toFixed(1)}%`,
                value: this.metrics.tradingMetrics.maxDrawdown,
                threshold: this.config.alertThreshold.drawdown
            });
        }

        // 新增告警
        for (const alert of alerts) {
            const existingAlert = this.alerts.find(a => 
                a.type === alert.type && 
                Date.now() - a.timestamp < 300000 // 5分钟内不重复告警
            );
            
            if (!existingAlert) {
                alert.timestamp = Date.now();
                this.alerts.push(alert);
                console.log(`⚠️ [${alert.level}] ${alert.message}`);
            }
        }

        return alerts;
    }

    // 计算平均API延迟
    getAverageApiLatency() {
        if (this.metrics.apiLatency.length === 0) return 0;
        const recentLatencies = this.metrics.apiLatency.slice(-10);
        return recentLatencies.reduce((sum, item) => sum + item.latency, 0) / recentLatencies.length;
    }

    // 计算胜率
    getWinRate() {
        if (this.metrics.tradingMetrics.totalTrades === 0) return 0;
        return this.metrics.tradingMetrics.winTrades / this.metrics.tradingMetrics.totalTrades;
    }

    // 计算盈亏比
    getProfitFactor() {
        if (this.metrics.tradingMetrics.totalLoss === 0) return Infinity;
        return this.metrics.tradingMetrics.totalProfit / this.metrics.tradingMetrics.totalLoss;
    }

    // 计算年化收益率
    getAnnualizedReturn(initialCapital, currentCapital) {
        const daysRunning = (Date.now() - this.startTime) / (1000 * 60 * 60 * 24);
        if (daysRunning < 1) return 0;
        
        const totalReturn = (currentCapital - initialCapital) / initialCapital;
        return Math.pow(1 + totalReturn, 365 / daysRunning) - 1;
    }

    // 清理旧指标数据（保留最近24小时）
    cleanupOldMetrics() {
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
        
        this.metrics.apiLatency = this.metrics.apiLatency.filter(m => m.timestamp > cutoffTime);
        this.metrics.tradeExecutionTime = this.metrics.tradeExecutionTime.filter(m => m.timestamp > cutoffTime);
        this.metrics.systemMetrics = this.metrics.systemMetrics.filter(m => m.timestamp > cutoffTime);
        this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime);
    }

    // 获取性能报告
    getPerformanceReport() {
        const avgLatency = this.getAverageApiLatency();
        const winRate = this.getWinRate();
        const profitFactor = this.getProfitFactor();
        const latestMetrics = this.metrics.systemMetrics[this.metrics.systemMetrics.length - 1] || {};
        
        return {
            uptime: Date.now() - this.startTime,
            system: {
                cpuUsage: latestMetrics.cpuUsage || 0,
                memoryUsage: latestMetrics.memoryUsage || 0,
                diskUsage: latestMetrics.diskUsage || 0,
                avgApiLatency: avgLatency
            },
            trading: {
                totalTrades: this.metrics.tradingMetrics.totalTrades,
                winTrades: this.metrics.tradingMetrics.winTrades,
                loseTrades: this.metrics.tradingMetrics.loseTrades,
                winRate,
                profitFactor,
                totalProfit: this.metrics.tradingMetrics.totalProfit,
                maxDrawdown: this.metrics.tradingMetrics.maxDrawdown
            },
            alerts: this.alerts.filter(a => Date.now() - a.timestamp < 3600000) // 最近1小时的告警
        };
    }

    // 导出性能数据
    exportMetrics(filePath) {
        const exportData = {
            config: this.config,
            metrics: this.metrics,
            report: this.getPerformanceReport(),
            exportTime: new Date().toISOString()
        };
        
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        console.log(`📊 性能数据已导出到: ${filePath}`);
    }

    // 生成性能优化建议
    generateOptimizationSuggestions() {
        const suggestions = [];
        const report = this.getPerformanceReport();

        // 系统优化建议
        if (report.system.cpuUsage > 0.7) {
            suggestions.push('CPU使用率过高，建议优化策略计算逻辑或升级服务器配置');
        }
        if (report.system.memoryUsage > 0.8) {
            suggestions.push('内存使用率过高，建议清理历史数据或增加内存');
        }
        if (report.system.avgApiLatency > 1000) {
            suggestions.push('API延迟过高，建议更换代理节点或使用更靠近交易所的服务器');
        }

        // 交易优化建议
        if (report.trading.winRate < 0.4 && report.trading.totalTrades >= 10) {
            suggestions.push('胜率过低，建议调整策略参数或更换更适合当前行情的策略');
        }
        if (report.trading.maxDrawdown > 0.1) {
            suggestions.push('回撤过大，建议降低仓位或优化止损策略');
        }
        if (report.trading.profitFactor < 1.2 && report.trading.totalTrades >= 10) {
            suggestions.push('盈亏比过低，建议提高止盈止损比例');
        }

        return suggestions;
    }
}
