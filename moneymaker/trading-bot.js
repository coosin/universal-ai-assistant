import { OKXClient } from './okx-api.js';
import fs from 'fs';
import path from 'path';

// 配置
const CONFIG = {
    // 交易对配置
    tradingPairs: [
        {
            instId: 'SOL-USDT',
            holdAmount: 0.057553924,
            buyPrice: 86.86,
            takeProfit: 0.02,  // +2% 止盈
            stopLoss: 0.03,    // -3% 止损
            active: true
        },
        {
            instId: 'DOGE-USDT',
            holdAmount: 15.987201623,
            buyPrice: 0.09317,
            takeProfit: 0.02,  // +2% 止盈
            stopLoss: 0.03,    // -3% 止损
            active: true
        }
    ],
    // API 配置
    api: {
        apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
        secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
        passphrase: 'Cool+095136',
        proxy: 'http://127.0.0.1:7890'
    },
    // 监控配置
    checkInterval: 30000,  // 每30秒检查一次行情
    logFile: path.join(process.cwd(), 'trading.log'),
    maxRetries: 3
};

class TradingBot {
    constructor() {
        this.client = new OKXClient(CONFIG.api);
        this.running = false;
        this.lastCheck = 0;
        this.stats = {
            checks: 0,
            trades: 0,
            profit: 0
        };
    }

    // 日志记录
    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleString('zh-CN');
        const logLine = `[${timestamp}] [${level}] ${message}\n`;
        console.log(logLine.trim());
        fs.appendFileSync(CONFIG.logFile, logLine);
    }

    // 获取最新价格
    async getPrice(instId) {
        for (let i = 0; i < CONFIG.maxRetries; i++) {
            try {
                const ticker = await this.client.getTicker(instId);
                if (ticker.code === '0' && ticker.data && ticker.data[0]) {
                    return parseFloat(ticker.data[0].last);
                }
            } catch (e) {
                this.log(`获取 ${instId} 价格失败 (尝试 ${i+1}/${CONFIG.maxRetries}): ${e.message}`, 'WARN');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        throw new Error(`获取 ${instId} 价格失败，已重试 ${CONFIG.maxRetries} 次`);
    }

    // 卖出下单
    async sell(instId, amount, price) {
        try {
            const order = await this.client.placeOrder(
                instId,
                'cash',
                'sell',
                'limit',
                amount.toString(),
                price.toString()
            );
            
            if (order.code === '0' && order.data && order.data[0]) {
                this.log(`卖出 ${instId} 订单提交成功: 价格 ${price}, 数量 ${amount}, 订单ID ${order.data[0].ordId}`, 'SUCCESS');
                return true;
            } else {
                this.log(`卖出 ${instId} 失败: ${order.msg}`, 'ERROR');
                return false;
            }
        } catch (e) {
            this.log(`卖出 ${instId} 异常: ${e.message}`, 'ERROR');
            return false;
        }
    }

    // 检查交易信号
    async checkTradingSignals() {
        this.stats.checks++;
        this.log(`开始第 ${this.stats.checks} 次行情检查`);

        for (const pair of CONFIG.tradingPairs) {
            if (!pair.active) continue;

            try {
                const currentPrice = await this.getPrice(pair.instId);
                const profitRate = (currentPrice - pair.buyPrice) / pair.buyPrice;
                
                this.log(`${pair.instId}: 当前价 $${currentPrice}, 成本价 $${pair.buyPrice}, 收益率 ${(profitRate * 100).toFixed(2)}%`);

                // 止盈检查
                if (profitRate >= pair.takeProfit) {
                    this.log(`${pair.instId} 达到止盈目标 (+${pair.takeProfit * 100}%)，执行卖出`, 'ALERT');
                    const sellPrice = (currentPrice * 0.999).toFixed(6); // 略低于当前价确保成交
                    const success = await this.sell(pair.instId, pair.holdAmount, sellPrice);
                    
                    if (success) {
                        const profit = (currentPrice - pair.buyPrice) * pair.holdAmount;
                        this.stats.profit += profit;
                        this.stats.trades++;
                        this.log(`${pair.instId} 卖出成功，盈利 $${profit.toFixed(4)} USDT`, 'SUCCESS');
                        pair.active = false; // 标记为已卖出
                    }
                }
                // 止损检查
                else if (profitRate <= -pair.stopLoss) {
                    this.log(`${pair.instId} 达到止损阈值 (-${pair.stopLoss * 100}%)，执行卖出`, 'ALERT');
                    const sellPrice = (currentPrice * 0.999).toFixed(6);
                    const success = await this.sell(pair.instId, pair.holdAmount, sellPrice);
                    
                    if (success) {
                        const loss = (pair.buyPrice - currentPrice) * pair.holdAmount;
                        this.stats.profit -= loss;
                        this.stats.trades++;
                        this.log(`${pair.instId} 止损卖出，亏损 $${loss.toFixed(4)} USDT`, 'WARN');
                        pair.active = false; // 标记为已卖出
                    }
                }

            } catch (e) {
                this.log(`检查 ${pair.instId} 失败: ${e.message}`, 'ERROR');
            }
        }

        // 检查是否所有持仓都已卖出
        const activePairs = CONFIG.tradingPairs.filter(p => p.active);
        if (activePairs.length === 0) {
            this.log('所有持仓已卖出，交易机器人停止运行', 'INFO');
            this.log(`最终统计: 检查 ${this.stats.checks} 次，交易 ${this.stats.trades} 次，总盈利 $${this.stats.profit.toFixed(4)} USDT`, 'INFO');
            this.stop();
        }
    }

    // 启动机器人
    async start() {
        if (this.running) {
            this.log('交易机器人已经在运行中', 'WARN');
            return;
        }

        this.running = true;
        this.log('🚀 Coosin 自动交易机器人启动', 'INFO');
        this.log(`监控品种: ${CONFIG.tradingPairs.filter(p => p.active).map(p => p.instId).join(', ')}`, 'INFO');
        this.log(`止盈: +${CONFIG.tradingPairs[0].takeProfit * 100}%, 止损: -${CONFIG.tradingPairs[0].stopLoss * 100}%`, 'INFO');
        this.log(`检查间隔: ${CONFIG.checkInterval / 1000} 秒`, 'INFO');

        // 立即执行一次检查
        await this.checkTradingSignals();

        // 定时检查
        this.interval = setInterval(async () => {
            if (this.running) {
                await this.checkTradingSignals();
            }
        }, CONFIG.checkInterval);
    }

    // 停止机器人
    stop() {
        this.running = false;
        if (this.interval) {
            clearInterval(this.interval);
        }
        this.log('🛑 交易机器人已停止', 'INFO');
        process.exit(0);
    }
}

// 启动机器人
const bot = new TradingBot();

// 处理退出信号
process.on('SIGINT', () => bot.stop());
process.on('SIGTERM', () => bot.stop());

// 启动
bot.start().catch(e => {
    console.error('机器人启动失败:', e);
    process.exit(1);
});
