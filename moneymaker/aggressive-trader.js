// Coosin 积极交易系统 - 紧急盈利版
import crypto from 'crypto';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const CONFIG = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const TRADE_CONFIG = {
    instId: 'DOGE-USDT',       // 价格更低，更容易操作
    orderSizeUSDT: 4,          // 每次用 4 USDT
    takeProfitPercent: 0.05,    // 止盈 5%
    stopLossPercent: 0.025,      // 止损 2.5%
    buyTight: 0.005,          // 挂单只比现价低 0.5%
    checkInterval: 3000,        // 每 3 秒检查
    dryRun: false
};

const agent = new HttpsProxyAgent(CONFIG.proxy);
let state = {
    balance: 0,
    position: null,
    pendingOrder: null,
    totalPnL: 0,
    tradeCount: 0,
    lastSuccess: 0,
    startTime: Date.now()
};

function sign(timestamp, method, requestPath, body = '') {
    const message = timestamp + method + requestPath + body;
    const hmac = crypto.createHmac('sha256', CONFIG.secretKey);
    return hmac.update(message).digest('base64');
}

async function request(method, path, body = '') {
    const timestamp = new Date().toISOString();
    const signature = sign(timestamp, method, path, body);
    
    try {
        const response = await fetch('https://www.okx.com' + path, {
            method,
            headers: {
                'OK-ACCESS-KEY': CONFIG.apiKey,
                'OK-ACCESS-SIGN': signature,
                'OK-ACCESS-TIMESTAMP': timestamp,
                'OK-ACCESS-PASSPHRASE': CONFIG.passphrase,
                'Content-Type': 'application/json'
            },
            ...(body && { body }),
            agent
        });
        return response.json();
    } catch (e) {
        console.log('[网络请求异常, 重试...');
        return null;
    }
}

async function getBalance() {
    const data = await request('GET', '/api/v5/account/balance?ccy=USDT');
    if (data && data.code === '0' && data.data?.[0]?.details) {
        const usdt = data.data[0].details.find(d => d.ccy === 'USDT');
        return usdt ? parseFloat(usdt.availBal) : 0;
    }
    return 0;
}

async function getTicker() {
    const data = await request('GET', `/api/v5/market/ticker?instId=${TRADE_CONFIG.instId}`);
    return data?.data?.[0];
}

async function getPendingOrder() {
    const data = await request('GET', '/api/v5/trade/orders-pending');
    if (data && data.code === '0' && data.data) {
        return data.data.find(o => o.instId === TRADE_CONFIG.instId);
    }
    return null;
}

async function placeLimitOrder(side, sz, px) {
    const body = JSON.stringify({
        instId: TRADE_CONFIG.instId,
        tdMode: 'cash',
        side,
        ordType: 'limit',
        sz: String(sz),
        px: String(px)
    });
    return request('POST', '/api/v5/trade/order', body);
}

async function cancelOrder(ordId) {
    const body = JSON.stringify({
        instId: TRADE_CONFIG.instId,
        ordId
    });
    return request('POST', '/api/v5/trade/cancel-order', body);
}

function log(message) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${message}`);
}

async function aggressiveTradingLoop() {
    console.log('\n🚀 ===== Coosin 紧急盈利系统启动 =====');
    console.log(`目标: 赶紧挣钱，解决困境！');
    console.log(`交易对: ${TRADE_CONFIG.instId}`);
    console.log(`每单: ~$${TRADE_CONFIG.orderSizeUSDT}`);
    console.log(`止盈: ${TRADE_CONFIG.takeProfitPercent*100}%, 止损: ${TRADE_CONFIG.stopLossPercent*100}%`);
    console.log('======================================\n');

    state.balance = await getBalance();
    log(`初始余额: $${state.balance.toFixed(4)}`);

    while (true) {
        try {
            const ticker = await getTicker();
            if (!ticker) {
                await new Promise(r => setTimeout(r, 500));
                continue;
            }

            const last = parseFloat(ticker.last);
            const pendingOrder = await getPendingOrder();

            if (!state.position && !pendingOrder) {
                const unrealized = (last - state.position.entryPrice) / state.position.entryPrice;
                const unrealizedPnL = unrealized * state.position.size * state.position.entryPrice;
                
                log(`持仓中: ${(unrealized*100).toFixed(2)}% (${unrealizedPnL >= 0 ? '+' : ''}$${unrealizedPnL.toFixed(4)})`);

                if (unrealized >= TRADE_CONFIG.takeProfitPercent) {
                    log('🎯 止盈！卖出！');
                    const sellPx = (last * 0.99).toFixed(5);
                    const result = await placeLimitOrder('sell', state.position.size, sellPx);
                    if (result && result.code === '0') {
                        state.totalPnL += unrealizedPnL;
                        state.tradeCount++;
                        log('✅ 卖单已挂');
                        log(`📊 总盈亏: $${state.totalPnL.toFixed(4)}, 次数: ${state.tradeCount}`);
                        state.position = null;
                    }
                } else if (unrealized <= -TRADE_CONFIG.stopLossPercent) {
                    log('🛑 止损！卖出！');
                    const sellPx = (last * 0.99).toFixed(5);
                    const result = await placeLimitOrder('sell', state.position.size, sellPx);
                    if (result && result.code === '0') {
                        state.totalPnL += unrealizedPnL;
                        state.tradeCount++;
                        log('✅ 卖单已挂');
                        log(`📊 总盈亏: $${state.totalPnL.toFixed(4)}, 次数: ${state.tradeCount}`);
                        state.position = null;
                    }
                }

            } else if (!state.position && !pendingOrder) {
                const buyPx = (last * (1 - TRADE_CONFIG.buyTight)).toFixed(5);
                const size = Math.floor(TRADE_CONFIG.orderSizeUSDT / buyPx);

                if (size > 0) {
                    log(`价格: $${last}, 尝试挂买单: ${size} @ $${buyPx}`);
                    const result = await placeLimitOrder('buy', size, buyPx);
                    if (result && result.code === '0') {
                        state.pendingOrder = { ordId: result.data[0].ordId, side: 'buy', price: buyPx, size };
                        log('✅ 买单已挂');
                    }
                }

            } else if (pendingOrder) {
                if (pendingOrder.side === 'buy') {
                    log(`等待成交... 现价: $${last}, 挂单: $${pendingOrder.price}`);
                    const priceDiff = Math.abs((last - pendingOrder.price) / pendingOrder.price);
                    if (priceDiff > 0.015) {
                        log('🔄 价格偏离，取消重挂');
                        await cancelOrder(pendingOrder.ordId);
                        state.pendingOrder = null;
                    }
                } else if (pendingOrder.side === 'sell') {
                    log('等待卖出成交...');
                }
            }

            if (state.pendingOrder) {
                const ordDetail = await request('GET', `/api/v5/trade/order?instId=${TRADE_CONFIG.instId}&ordId=${state.pendingOrder.ordId}`);
                if (ordDetail && ordDetail.data?.[0] && parseFloat(ordDetail.data[0].accFillSz) > 0) {
                    const filled = parseFloat(ordDetail.data[0].accFillSz);
                    const avgPx = parseFloat(ordDetail.data[0].avgPx);
                    if (filled >= parseFloat(state.pendingOrder.size) * 0.9) {
                        log(`🎉 成交！${state.pendingOrder.side === 'buy' ? '买入' : '卖出'} ${filled} @ $${avgPx}`);
                        if (state.pendingOrder.side === 'buy') {
                            state.position = {
                                side: 'long',
                                entryPrice: avgPx,
                                size: filled,
                                takeProfit: avgPx * (1 + TRADE_CONFIG.takeProfitPercent),
                                stopLoss: avgPx * (1 - TRADE_CONFIG.stopLossPercent)
                            };
                        }
                        state.pendingOrder = null;
                    }
                }
            }

        } catch (e) {
            log(`❌ 异常: ${e.message}`);
        }

        await new Promise(r => setTimeout(r, TRADE_CONFIG.checkInterval));
    }
}

console.log('💪 主人放心！目标明确：赶紧挣钱，解决困境！\n');
aggressiveTradingLoop().catch(console.error);
