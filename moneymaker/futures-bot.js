import { OKXFuturesClient } from './okx-futures-api.js';
import fs from 'fs';
import path from 'path';

// 合约交易机器人 - 优先快速盈利
class FuturesTradingBot {
    constructor() {
        this.client = new OKXFuturesClient({
            apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
            secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
            passphrase: 'Cool+095136',
            proxy: 'http://127.0.0.1:7890'
        });
        
        this.config = {
            // 风险控制
            maxPositionUSDT: 2, // 单笔最大仓位2USDT
            leverage: 3, // 3倍杠杆
            takeProfit: 0.05, // 止盈5%
            stopLoss: 0.02, // 止损2%
            checkInterval: 15000, // 15秒检查一次行情
            maxDailyTrades: 5, // 每日最多交易5次
        };
        
        this.state = {
            dailyTrades: 0,
            lastTradeDate: null,
            currentPosition: null,
            running: true
        };
        
        this.logFile = path.join(process.cwd(), 'futures-trading.log');
        this.log('🚀 合约交易机器人启动，优先快速盈利');
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toLocaleString('zh-CN');
        const logLine = `[${timestamp}] [${level}] ${message}\n`;
        console.log(logLine.trim());
        fs.appendFileSync(this.logFile, logLine);
    }

    // 重置每日交易次数
    resetDailyTrades() {
        const today = new Date().toDateString();
        if (this.state.lastTradeDate !== today) {
            this.state.dailyTrades = 0;
            this.state.lastTradeDate = today;
            this.log('✅ 每日交易次数已重置');
        }
    }

    // 获取最新行情
    async getTicker(instId = 'ETH-USDT-SWAP') {
        try {
            const ticker = await this.client.getTicker(instId);
            if (ticker.code === '0' && ticker.data && ticker.data[0]) {
                return parseFloat(ticker.data[0].last);
            }
            throw new Error('获取行情失败');
        } catch (e) {
            this.log(`获取行情失败: ${e.message}`, 'WARN');
            return null;
        }
    }

    // 获取账户余额
    async getBalance() {
        try {
            const balance = await this.client.getBalance('USDT');
            if (balance.code === '0' && balance.data && balance.data[0]) {
                const usdt = balance.data[0].details.find(d => d.ccy === 'USDT');
                return usdt ? parseFloat(usdt.availBal) : 0;
            }
            return 0;
        } catch (e) {
            this.log(`获取余额失败: ${e.message}`, 'WARN');
            return 0;
        }
    }

    // 获取当前持仓
    async getPosition(instId = 'ETH-USDT-SWAP') {
        try {
            const positions = await this.client.getPositions(instId);
            if (positions.code === '0' && positions.data && positions.data.length > 0) {
                const pos = positions.data[0];
                if (parseFloat(pos.pos) > 0) {
                    return {
                        side: pos.posSide,
                        size: parseFloat(pos.pos),
                        avgPrice: parseFloat(pos.avgPx),
                        upl: parseFloat(pos.upl)
                    };
                }
            }
            return null;
        } catch (e) {
            this.log(`获取持仓失败: ${e.message}`, 'WARN');
            return null;
        }
    }

    // 计算技术指标 - 简单均线策略
    async calculateIndicators(instId = 'ETH-USDT-SWAP') {
        try {
            // 获取15分钟K线
            const candles = await this.client.request('GET', `/api/v5/market/candles?instId=${instId}&bar=15m&limit=30`);
            if (!candles.data || candles.data.length < 20) return null;
            
            const closes = candles.data.map(c => parseFloat(c[4])).reverse();
            
            // 计算5日均线和20日均线
            const ma5 = closes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
            const ma20 = closes.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
            const prevMa5 = closes.slice(1, 6).reduce((a, b) => a + b, 0) / 5;
            const prevMa20 = closes.slice(1, 21).reduce((a, b) => a + b, 0) / 20;
            
            // 计算RSI
            let gains = 0, losses = 0;
            for (let i = 1; i <= 14; i++) {
                const change = closes[i] - closes[i-1];
                if (change > 0) gains += change;
                else losses += Math.abs(change);
            }
            const rs = gains / (losses || 0.001);
            const rsi = 100 - (100 / (1 + rs));
            
            return { ma5, ma20, prevMa5, prevMa20, rsi, currentPrice: closes[0] };
        } catch (e) {
            this.log(`计算指标失败: ${e.message}`, 'WARN');
            return null;
        }
    }

    // 开仓
    async openPosition(side) {
        try {
            this.resetDailyTrades();
            if (this.state.dailyTrades >= this.config.maxDailyTrades) {
                this.log('⚠️ 今日交易次数已达上限，停止开仓', 'WARN');
                return false;
            }

            const balance = await this.getBalance();
            if (balance < this.config.maxPositionUSDT) {
                this.log(`⚠️ 余额不足，无法开仓: 可用 ${balance} USDT`, 'WARN');
                return false;
            }

            const currentPrice = await this.getTicker();
            if (!currentPrice) return false;

            // 计算仓位大小
            const positionValue = Math.min(this.config.maxPositionUSDT, balance * 0.2); // 最多用20%资金
            const size = (positionValue * this.config.leverage / currentPrice).toFixed(4);
            
            this.log(`🚀 准备开${side === 'long' ? '多' : '空'}单: BTC-USDT-SWAP, 价格 ${currentPrice}, 数量 ${size}`);

            // 设置杠杆
            await this.client.setLeverage('ETH-USDT-SWAP', this.config.leverage.toString(), 'cross');
            
            // 下单
            const order = await this.client.placeOrder(
                'ETH-USDT-SWAP',
                'cross',
                side === 'long' ? 'buy' : 'sell',
                side === 'long' ? 'long' : 'short',
                'market',
                size
            );

            if (order.code === '0' && order.data && order.data[0]) {
                this.state.dailyTrades++;
                this.state.currentPosition = {
                    side,
                    entryPrice: currentPrice,
                    size: parseFloat(size),
                    takeProfitPrice: side === 'long' ? 
                        currentPrice * (1 + this.config.takeProfit) : 
                        currentPrice * (1 - this.config.takeProfit),
                    stopLossPrice: side === 'long' ? 
                        currentPrice * (1 - this.config.stopLoss) : 
                        currentPrice * (1 + this.config.stopLoss)
                };
                this.log(`✅ 开${side === 'long' ? '多' : '空'}成功，订单ID: ${order.data[0].ordId}`, 'SUCCESS');
                this.log(`   止盈: ${this.state.currentPosition.takeProfitPrice.toFixed(2)}, 止损: ${this.state.currentPosition.stopLossPrice.toFixed(2)}`);
                return true;
            } else {
                this.log(`❌ 开仓失败: ${order.msg}`, 'ERROR');
                return false;
            }
        } catch (e) {
            this.log(`开仓异常: ${e.message}`, 'ERROR');
            return false;
        }
    }

    // 平仓
    async closePosition() {
        if (!this.state.currentPosition) return;

        try {
            this.log(`📤 准备平仓: ${this.state.currentPosition.side === 'long' ? '多' : '空'}单`);
            
            const result = await this.client.closePosition('ETH-USDT-SWAP', 'cross', this.state.currentPosition.side === 'long' ? 'long' : 'short');
            
            if (result.code === '0') {
                const currentPrice = await this.getTicker();
                const profit = this.state.currentPosition.side === 'long' ? 
                    (currentPrice - this.state.currentPosition.entryPrice) * this.state.currentPosition.size :
                    (this.state.currentPosition.entryPrice - currentPrice) * this.state.currentPosition.size;
                
                this.log(`✅ 平仓成功，盈利: ${profit.toFixed(4)} USDT`, profit > 0 ? 'SUCCESS' : 'WARN');
                this.state.currentPosition = null;
                return true;
            } else {
                this.log(`❌ 平仓失败: ${result.msg}`, 'ERROR');
                return false;
            }
        } catch (e) {
            this.log(`平仓异常: ${e.message}`, 'ERROR');
            return false;
        }
    }

    // 检查止盈止损
    async checkTakeProfitStopLoss() {
        if (!this.state.currentPosition) return;

        const currentPrice = await this.getTicker();
        if (!currentPrice) return;

        const pos = this.state.currentPosition;
        const profitRate = pos.side === 'long' ? 
            (currentPrice - pos.entryPrice) / pos.entryPrice :
            (pos.entryPrice - currentPrice) / pos.entryPrice;

        this.log(`当前价格: ${currentPrice}, 持仓${pos.side === 'long' ? '多' : '空'}, 收益率: ${(profitRate * 100).toFixed(2)}%`);

        // 止盈
        if (profitRate >= this.config.takeProfit) {
            this.log(`🎉 达到止盈目标 +${this.config.takeProfit * 100}%，执行平仓`, 'ALERT');
            await this.closePosition();
        }
        // 止损
        else if (profitRate <= -this.config.stopLoss) {
            this.log(`⚠️ 达到止损阈值 -${this.config.stopLoss * 100}%，执行平仓`, 'ALERT');
            await this.closePosition();
        }
    }

    // 主循环
    async run() {
        while (this.state.running) {
            try {
                // 检查是否有持仓
                const position = await this.getPosition();
                if (position) {
                    if (!this.state.currentPosition) {
                        this.state.currentPosition = {
                            side: position.side === 'long' ? 'long' : 'short',
                            entryPrice: position.avgPrice,
                            size: position.size
                        };
                        this.log(`检测到现有持仓: ${position.side === 'long' ? '多' : '空'}单，价格 ${position.avgPrice}`);
                    }
                    // 检查止盈止损
                    await this.checkTakeProfitStopLoss();
                } else {
                    // 无持仓，寻找开仓机会
                    this.state.currentPosition = null;
                    const indicators = await this.calculateIndicators();
                    if (indicators) {
                        const { ma5, ma20, prevMa5, prevMa20, rsi, currentPrice } = indicators;
                        
                        // 金叉做多：5日均线上穿20日均线，RSI < 70
                        if (ma5 > ma20 && prevMa5 <= prevMa20 && rsi < 70) {
                            this.log(`📈 发现做多信号: 5日均线上穿20日均线，RSI=${rsi.toFixed(1)}`, 'ALERT');
                            await this.openPosition('long');
                        }
                        // 死叉做空：5日均线下穿20日均线，RSI > 30
                        else if (ma5 < ma20 && prevMa5 >= prevMa20 && rsi > 30) {
                            this.log(`📉 发现做空信号: 5日均线下穿20日均线，RSI=${rsi.toFixed(1)}`, 'ALERT');
                            await this.openPosition('short');
                        }
                    }
                }

                // 等待下次检查
                await new Promise(resolve => setTimeout(resolve, this.config.checkInterval));
                
            } catch (e) {
                this.log(`主循环异常: ${e.message}`, 'ERROR');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    // 停止机器人
    stop() {
        this.state.running = false;
        this.log('🛑 合约交易机器人已停止');
        process.exit(0);
    }
}

// 启动机器人
const bot = new FuturesTradingBot();

// 处理退出信号
process.on('SIGINT', () => bot.stop());
process.on('SIGTERM', () => bot.stop());

// 启动
bot.run().catch(e => {
    console.error('机器人启动失败:', e);
    process.exit(1);
});
