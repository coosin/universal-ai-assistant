// 交易机器人 V3 - 多策略自适应版本
// 整合策略引擎V2，支持自动行情识别与策略切换
import { OKXClient } from './okx-api.js';
import { StrategyEngineV2 } from './strategy-engine-v2.js';
import fs from 'fs';
import path from 'path';

// 配置
const CONFIG = {
    // 交易对配置
    tradingPairs: [
        {
            instId: 'SOL-USDT',
            minOrderSize: 0.01,
            active: true
        },
        {
            instId: 'DOGE-USDT',
            minOrderSize: 1,
            active: true
        }
    ],
    // API 配置
    api: {
        apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
        secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
        passphrase: 'Cool 095136',
        proxy: 'http://127.0.0.1:7890'
    },
    // 风控配置
    risk: {
        maxSingleTradeRatio: 0.1,  // 单笔交易最大仓位比例
        maxDailyDrawdown: 0.03,    // 单日最大回撤3%
        stopTradingThreshold: 0.05 // 总亏损5%停止交易
    },
    // 监控配置
    checkInterval: 30000,  // 每30秒检查一次行情
    logFile: path.join(process.cwd(), 'trading-v3.log'),
    maxRetries: 3,
    autoStrategySwitch: true // 自动切换策略
};

class TradingBotV3 {
    constructor() {
        this.client = new OKXClient(CONFIG.api);
        this.strategyEngine = new StrategyEngineV2({
            autoSwitch: CONFIG.autoStrategySwitch
        });
        this.running = false;
        this.stats = {
            checks: 0,
            trades: 0,
            totalProfit: 0,
            dailyProfit: 0,
            maxDrawdown: 0
        };
        this.portfolio = {
            balance: 0,
            positions: new Map()
        };
        this.priceHistory = new Map();
        this.volatilityHistory = new Map();
    }

    // 写日志
    log(message, level = 'INFO') {
        const logLine = `[${new Date().toLocaleString('zh-CN')}] [${level}] ${message}\n`;
        console.log(logLine.trim());
        fs.appendFileSync(CONFIG.logFile, logLine);
    }

    // 初始化账户信息
    async initPortfolio() {
        try {
            const balance = await this.client.request('GET', '/api/v5/account/balance');
            if (balance.code === '0' && balance.data) {
                this.portfolio.balance = parseFloat(balance.data[0].totalEq);
                this.log(`账户初始化完成，总权益: $${this.portfolio.balance.toFixed(2)}`);
            }

            // 获取当前持仓
            const positions = await this.client.request('GET', '/api/v5/account/positions?instType=SPOT');
            if (positions.code === '0' && positions.data) {
                for (const pos of positions.data) {
                    if (parseFloat(pos.pos) > 0) {
                        this.portfolio.positions.set(pos.instId, {
                            size: parseFloat(pos.pos),
                            avgPx: parseFloat(pos.avgPx),
                            upl: parseFloat(pos.upl),
                            uplRatio: parseFloat(pos.uplRatio)
                        });
                    }
                }
                this.log(`当前持仓数量: ${this.portfolio.positions.size} 个品种`);
            }
        } catch (error) {
            this.log(`账户初始化失败: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    // 获取最新价格
    async getPrice(instId) {
        for (let i = 0; i < CONFIG.maxRetries; i++) {
            try {
                const response = await this.client.request('GET', `/api/v5/market/ticker?instId=${instId}`);
                if (response.code === '0' && response.data && response.data.length > 0) {
                    const price = parseFloat(response.data[0].last);
                    
                    // 维护价格历史
                    if (!this.priceHistory.has(instId)) {
                        this.priceHistory.set(instId, []);
                    }
                    this.priceHistory.get(instId).push(price);
                    if (this.priceHistory.get(instId).length > 100) {
                        this.priceHistory.get(instId).shift();
                    }

                    return price;
                }
                throw new Error(`API 返回错误: ${response.msg}`);
            } catch (error) {
                this.log(`获取 ${instId} 价格失败 (尝试 ${i+1}/${CONFIG.maxRetries}): ${error.message}`, 'WARN');
                if (i === CONFIG.maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // 计算波动率
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    // 执行交易
    async executeTrade(instId, action, price, size, reason) {
        try {
            this.log(`📤 执行 ${action.toUpperCase()} ${instId}: 数量 ${size}, 当前价 $${price}, 原因: ${reason}`);
            
            // 调用交易API
            const response = await this.client.request('POST', '/api/v5/trade/order', {
                instId,
                tdMode: 'cash',
                side: action,
                ordType: 'market',
                sz: size.toString()
            });

            if (response.code === '0') {
                this.log(`✅ 交易成功: ${instId}, 订单ID: ${response.data[0].ordId}`);
                this.stats.trades++;
                
                // 更新持仓
                if (action === 'buy') {
                    this.portfolio.positions.set(instId, {
                        size,
                        avgPx: price,
                        upl: 0,
                        uplRatio: 0
                    });
                } else {
                    this.portfolio.positions.delete(instId);
                    const profit = (price - this.portfolio.positions.get(instId)?.avgPx || 0) * size;
                    this.stats.totalProfit += profit;
                    this.stats.dailyProfit += profit;
                    this.log(`💰 本次盈利: $${profit.toFixed(4)}, 总盈利: $${this.stats.totalProfit.toFixed(4)}`);
                }
                
                return true;
            } else {
                throw new Error(`交易失败: ${response.msg}`);
            }
        } catch (error) {
            this.log(`❌ 交易 ${instId} 失败: ${error.message}`, 'ERROR');
            return false;
        }
    }

    // 风控检查
    riskCheck(instId, action, size) {
        // 单日最大回撤检查
        if (this.stats.dailyProfit < -CONFIG.risk.maxDailyDrawdown * this.portfolio.balance) {
            this.log(`单日回撤超过限制 ${CONFIG.risk.maxDailyDrawdown * 100}%，禁止交易`, 'ERROR');
            return false;
        }

        // 总亏损检查
        if (this.stats.totalProfit < -CONFIG.risk.stopTradingThreshold * this.portfolio.balance) {
            this.log(`总亏损超过限制 ${CONFIG.risk.stopTradingThreshold * 100}%，停止所有交易`, 'ERROR');
            this.running = false;
            return false;
        }

        // 单笔仓位限制
        const maxSize = (this.portfolio.balance * CONFIG.risk.maxSingleTradeRatio) / size;
        if (size > maxSize) {
            this.log(`单笔仓位超过限制，最大允许: ${maxSize.toFixed(4)}`, 'ERROR');
            return false;
        }

        return true;
    }

    // 单次检查
    async check() {
        this.stats.checks++;
        this.log(`开始第 ${this.stats.checks} 次行情检查`);

        for (const pair of CONFIG.tradingPairs) {
            if (!pair.active) continue;
            const instId = pair.instId;

            try {
                const currentPrice = await this.getPrice(instId);
                const priceHistory = this.priceHistory.get(instId) || [];
                
                // 计算波动率
                const volatility = this.calculateVolatility(priceHistory.slice(-20));
                if (!this.volatilityHistory.has(instId)) {
                    this.volatilityHistory.set(instId, []);
                }
                this.volatilityHistory.get(instId).push(volatility);
                if (this.volatilityHistory.get(instId).length > 100) {
                    this.volatilityHistory.get(instId).shift();
                }

                // 获取策略信号
                const signal = this.strategyEngine.onTick(
                    { close: currentPrice },
                    priceHistory,
                    this.volatilityHistory.get(instId)
                );

                const position = this.portfolio.positions.get(instId);
                const profitRate = position ? (currentPrice - position.avgPx) / position.avgPx : 0;

                this.log(`${instId}: 当前价 $${currentPrice}, 波动率 ${(volatility * 100).toFixed(2)}%, 收益率 ${(profitRate * 100).toFixed(2)}%`);
                
                if (signal.reason) {
                    this.log(signal.reason);
                }

                // 执行信号
                if (signal.action === 'buy' && !position) {
                    const size = Math.max(pair.minOrderSize, 
                        (this.portfolio.balance * CONFIG.risk.maxSingleTradeRatio) / currentPrice);
                    if (this.riskCheck(instId, 'buy', size)) {
                        await this.executeTrade(instId, 'buy', currentPrice, size, signal.reason);
                    }
                } else if (signal.action === 'sell' && position) {
                    if (this.riskCheck(instId, 'sell', position.size)) {
                        await this.executeTrade(instId, 'sell', currentPrice, position.size, signal.reason);
                    }
                }

            } catch (error) {
                this.log(`处理 ${instId} 失败: ${error.message}`, 'ERROR');
            }
        }
    }

    // 启动机器人
    async start() {
        this.log('🚀 Coosin 自动交易机器人 V3 启动', 'INFO');
        
        // 初始化账户
        await this.initPortfolio();
        
        // 激活默认策略
        this.strategyEngine.activateStrategy('dynamic-threshold');
        
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
    const bot = new TradingBotV3();
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

export { TradingBotV3 };
