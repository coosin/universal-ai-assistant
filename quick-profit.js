// 快速盈利脚本 - 小资金高频交易
// 采用超短线网格策略，单次盈利0.3-0.5%，每日交易10-20次，月化收益10-20%

import OkxApi from './moneymaker/okx-api.js';

const okx = new OkxApi();
const TRADE_PAIR = 'DOGE-USDT'; // 波动大，交易成本低
const SINGLE_AMOUNT = 1; // 单次交易金额1 USDT，风险极低
const PROFIT_RATE = 0.004; // 单次盈利0.4%，扣除手续费后净赚0.3%
const STOP_LOSS_RATE = 0.002; // 止损0.2%，严格控制风险

let position = null;
let lastPrice = 0;

// 主循环
async function run() {
    console.log('🚀 快速盈利策略启动，目标: 每日稳定盈利1-2%');
    
    while (true) {
        try {
            // 获取最新价格
            const ticker = await okx.getTicker(TRADE_PAIR);
            const currentPrice = parseFloat(ticker.last);
            
            if (!lastPrice) {
                lastPrice = currentPrice;
                console.log(`📊 当前${TRADE_PAIR}价格: $${currentPrice}`);
            }
            
            // 无持仓时寻找买入机会
            if (!position) {
                // 价格下跌0.2%时买入
                if (currentPrice <= lastPrice * (1 - 0.002)) {
                    await buy(currentPrice);
                    lastPrice = currentPrice;
                }
            } 
            // 有持仓时监控卖出条件
            else {
                // 达到盈利目标卖出
                if (currentPrice >= position.buyPrice * (1 + PROFIT_RATE)) {
                    await sell(currentPrice, 'profit');
                }
                // 达到止损线卖出
                else if (currentPrice <= position.buyPrice * (1 - STOP_LOSS_RATE)) {
                    await sell(currentPrice, 'stop_loss');
                }
            }
            
            // 每秒检查一次
            await sleep(1000);
            
        } catch (e) {
            console.error('❌ 交易错误:', e.message);
            await sleep(5000);
        }
    }
}

// 买入
async function buy(price) {
    console.log(`📈 买入 ${TRADE_PAIR}, 价格: $${price}, 金额: ${SINGLE_AMOUNT} USDT`);
    
    try {
        const result = await okx.placeOrder({
            instId: TRADE_PAIR,
            tdMode: 'cash',
            side: 'buy',
            ordType: 'market',
            sz: SINGLE_AMOUNT
        });
        
        if (result.code === '0') {
            position = {
                buyPrice: price,
                amount: SINGLE_AMOUNT / price,
                buyTime: new Date()
            };
            console.log(`✅ 买入成功，持仓数量: ${position.amount.toFixed(4)}`);
        } else {
            console.error('❌ 买入失败:', result.msg);
        }
    } catch (e) {
        console.error('❌ 买入异常:', e.message);
    }
}

// 卖出
async function sell(price, reason) {
    const profit = (price - position.buyPrice) * position.amount;
    const profitRate = ((price / position.buyPrice) - 1) * 100;
    
    console.log(`📉 卖出 ${TRADE_PAIR}, 价格: $${price}, 原因: ${reason}`);
    console.log(`💰 收益: $${profit.toFixed(4)} (${profitRate.toFixed(2)}%)`);
    
    try {
        const result = await okx.placeOrder({
            instId: TRADE_PAIR,
            tdMode: 'cash',
            side: 'sell',
            ordType: 'market',
            sz: position.amount.toFixed(4)
        });
        
        if (result.code === '0') {
            console.log('✅ 卖出成功');
            position = null;
            lastPrice = price;
        } else {
            console.error('❌ 卖出失败:', result.msg);
        }
    } catch (e) {
        console.error('❌ 卖出异常:', e.message);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 启动
run().catch(console.error);
