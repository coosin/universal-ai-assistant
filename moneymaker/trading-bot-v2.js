// 交易机器人 V2 - 支持动态阈值策略
import { OKXClient } from './okx-api.js';
import { DynamicThresholdStrategy } from './strategy/dynamic-threshold.js';
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
            active: true,
            strategy: new DynamicThresholdStrategy({
                baseTakeProfit: 0.02,
                baseStopLoss: 0.03
            })
        },
        {
            instId: 'DOGE-USDT',
            holdAmount: 15.987201623,
            buyPrice: 0.09317,
            active: true,
            strategy: new DynamicThresholdStrategy({
                baseTakeProfit: 0.02,
                baseStopLoss: 0.03
            })
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
    logFile: path.join(process.cwd(), 'trading-v2.log'),
    maxRetries: 3
};

class TradingBotV2 {
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

    // 写日志
    log(message, level = 'INFO') {
        const logLine = `[${new Date().toLocaleString('zh-CN')}] [${level}] ${message}\n`;
        console.log(logLine.trim());
        fs.appendFileSync(CONFIG.logFile, logLine);
    }

    // 获取最新价格
    async getPrice(instId) {
        for (let i = 0; i < CONFIG.maxRetries; i++) {
            try {
                const response = await this.client.request('GET', `/api/v5/market/ticker?instId=${instId}`);
                if (response.code === '0' && response.data && response.data.length > 0) {
                    return parseFloat(response.data[0].last);
                }
                throw new Error(`API 返回错误: ${response.msg}`);
            } catch (error) {
                this.log(`获取 ${instId} 价格失败 (尝试 ${i+1}/${CONFIG.maxRetries}): ${error.message}`, 'WARN');
                if (i === CONFIG.maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // 执行卖出
    async sell(instId, amount, price, reason) {
        try {
            this.log(`📤 执行卖出 ${instId}: 数量 ${amount}, 当前价 ${price}, 原因: ${reason}`);
            
            // 调用卖出API
            const response = await this.client.request('POST', '/api/v5/trade/order', {
                instId,
                tdMode: 'cash',
                side: 'sell',
                ordType: 'market',
                sz: amount.toString()
            });

            if (response.code === '0') {
                this.log(`✅ 卖出成功: ${instId}, 订单ID: ${response.data[0].ordId}`);
                this.stats.trades++;
                const profit = (price - CONFIG.tradingPairs.find(p => p.instId === instId).buyPrice) * amount;
                this.stats.profit += profit;
                this.log(`💰 本次盈利: $${profit.toFixed(4)}, 总盈利: $${this.stats.profit.toFixed(4)}`);
                return true;
            } else {
                throw new Error(`卖出失败: ${response.msg}`);
            }
        } catch (error) {
            this.log(`❌ 卖出 ${instId} 失败: ${error.message}`, 'ERROR');
            return false;
        }
    }

    // 单次检查
    async check() {
        this.stats.checks++;
        this.log(`开始第 ${this.stats.checks} 次行情检查`);

        for (const pair of CONFIG.tradingPairs) {
            if (!pair.active) continue;

            try {
                const currentPrice = await this.getPrice(pair.instId);
                const signal = pair.strategy.onTick({ close: currentPrice });
                
                const profitRate = (currentPrice - pair.buyPrice) / pair.buyPrice;
                this.log(`${pair.instId}: 当前价 $${currentPrice}, 成本价 $${pair.buyPrice}, 收益率 ${(profitRate * 100).toFixed(2)}%`);
                
                if (signal.reason) {
                    this.log(signal.reason);
                }

                const thresholds = signal.thresholds || {
                    takeProfit: pair.strategy?.config?.baseTakeProfit || 0.02,
                    stopLoss: pair.strategy?.config?.baseStopLoss || 0.03
                };

                // 止盈检查
                if (profitRate >= thresholds.takeProfit) {
                    this.log(`🎯 达到止盈阈值 +${(thresholds.takeProfit * 100).toFixed(2)}%`, 'INFO');
                    await this.sell(pair.instId, pair.holdAmount, currentPrice, '止盈触发');
                    pair.active = false;
                }

                // 止损检查
                if (profitRate <= -thresholds.stopLoss) {
                    this.log(`🛑 达到止损阈值 -${(thresholds.stopLoss * 100).toFixed(2)}%`, 'WARN');
                    await this.sell(pair.instId, pair.holdAmount, currentPrice, '止损触发');
                    pair.active = false;
                }

            } catch (error) {
                this.log(`处理 ${pair.instId} 失败: ${error.message}`, 'ERROR');
            }
        }

        this.lastCheck = Date.now();
    }

    // 启动机器人
    async start() {
        this.log('🚀 Coosin 自动交易机器人 V2 启动', 'INFO');
        this.running = true;

        while (this.running) {
            try {
                await this.check();
            } catch (error) {
                this.log(`检查循环异常: ${error.message}`, 'ERROR');
            }
            
            // 等待下次检查
            await new Promise(resolve => setTimeout(resolve, CONFIG.checkInterval));
        }
    }

    // 停止机器人
    stop() {
        this.log('🛑 交易机器人已停止', 'INFO');
        this.running = false;
    }
}

// 启动机器人
if (import.meta.url === `file://${process.argv[1]}`) {
    const bot = new TradingBotV2();
    bot.start().catch(error => {
        console.error('机器人启动失败:', error);
        process.exit(1);
    });

    // 优雅退出
    process.on('SIGINT', () => {
        bot.stop();
        process.exit(0);
    });
}

export { TradingBotV2 };
