// Coosin 波段交易系统 - 全权授权版
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
    instId: 'SOL-USDT',        // 波动最大的品种
    orderSizeUSDT: 5,          // 每次用 5 USDT
    takeProfitPercent: 0.04,   // 止盈 4%
    stopLossPercent: 0.02,     // 止损 2%
    buyDiscountPercent: 0.015,  // 挂单比现价低 1.5%
    checkInterval: 5000,        // 每 5 秒检查一次
    dryRun: false
};

const agent = new HttpsProxyAgent(CONFIG.proxy);
let state = {
    balance: 0,
    position: null,
    pendingOrder: null,
    totalPnL: 0,
    tradeCount: 0,
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
}

async function getBalance() {
    const data = await request('GET', '/api/v5/account/balance?ccy=USDT');
    if (data.code === '0' && data.data?.[0]?.details) {
        const usdt = data.data[0].details.find(d => d.ccy === 'USDT');
        return usdt ? parseFloat(usdt.availBal) : 0;
    }
    return 0;
}

async function getTicker() {
    const data = await request('GET', `/api/v5/market/ticker?instId=${TRADE_CONFIG.instId}`);
    return data.data?.[0];
}

async function getPendingOrder() {
    const data = await request('GET', '/api/v5/trade/orders-pending');
    if (data.code === '0' && data.data) {
        return data.data.find(o => o.instId === TRADE_CONFIG.instId);
    }
    return null;
}

async function getOrderDetail(ordId) {
    const data = await request('GET', `/api/v5/trade/order?instId=${TRADE_CONFIG.instId}&ordId=${ordId}`);
    return data.data?.[0];
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

function logStatus(message) {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${message}`);
}

async function tradingLoop() {
    console.log('\n🚀 ===== Coosin 波段交易系统启动 =====');
    console.log(`交易对: ${TRADE_CONFIG.instId}`);
    console.log(`每单金额: ~$${TRADE_CONFIG.orderSizeUSDT}`);
    console.log(`策略: 高抛低吸吃波段，快进快出`);
    console.log(`止盈: ${TRADE_CONFIG.takeProfitPercent * 100}%, 止损: ${TRADE_CONFIG.stopLossPercent * 100}%`);
    console.log('========================================\n');

    state.balance = await getBalance();
    logStatus(`初始余额: $${state.balance.toFixed(4)}`);
    console.log('');

    while (true) {
        try {
            const ticker = await getTicker();
            if (!ticker) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            const last = parseFloat(ticker.last);
            const high24h = parseFloat(ticker.high24h);
            const low24h = parseFloat(ticker.low24h);
            const vol24h = parseFloat(ticker.vol24h);

            // 检查挂单状态
            const pendingOrder = await getPendingOrder();

            if (!state.position && !pendingOrder) {
                // 无持仓无挂单 - 找机会挂单
                const buyPrice = (last * (1 - TRADE_CONFIG.buyDiscountPercent)).toFixed(2);
                const size = (TRADE_CONFIG.orderSizeUSDT / buyPrice).toFixed(4);

                const positionInRange = ((last - low24h) / (high24h - low24h)) * 100;

                logStatus(`价格: $${last}, 24h区间: $${low24h} - $${high24h}`);

                if (positionInRange < 40) {
                    // 位置偏低，考虑买入
                    if (!TRADE_CONFIG.dryRun) {
                        logStatus(`📈 位置 ${positionInRange.toFixed(1)}% 偏低，挂买单: ${size} @ $${buyPrice}`);
                        const result = await placeLimitOrder('buy', size, buyPrice);
                        if (result.code === '0') {
                            state.pendingOrder = {
                                ordId: result.data[0].ordId,
                                side: 'buy',
                                price: buyPrice,
                                size
                            };
                            logStatus('✅ 买单已挂');
                        } else {
                            logStatus(`❌ 挂单失败: ${result.data?.[0]?.sMsg || result.msg}`);
                        }
                    }
                } else {
                    logStatus(`⏳ 位置 ${positionInRange.toFixed(1)}%，等待更好机会...`);
                }

            } else if (pendingOrder) {
                // 有挂单 - 检查是否成交
                const orderDetail = await getOrderDetail(pendingOrder.ordId);

                if (orderDetail && parseFloat(orderDetail.accFillSz) > 0) {
                    // 部分或全部成交
                    const filledSize = parseFloat(orderDetail.accFillSz);
                    const avgPx = parseFloat(orderDetail.avgPx);

                    if (filledSize >= parseFloat(pendingOrder.size) * 0.9) {
                        // 全部成交
                        logStatus(`🎉 成交! 买入 ${filledSize} @ $${avgPx}`);
                        state.position = {
                            side: 'long',
                            entryPrice: avgPx,
                            size: filledSize,
                            takeProfit: avgPx * (1 + TRADE_CONFIG.takeProfitPercent),
                            stopLoss: avgPx * (1 - TRADE_CONFIG.stopLossPercent)
                        };
                        state.pendingOrder = null;
                        state.tradeCount++;
                    }
                } else {
                    logStatus(`⏳ 等待成交... (当前: $${last}, 挂单: $${pendingOrder.price})`);

                    // 如果价格偏离太远，取消旧单重新挂
                    const priceDiff = Math.abs((last - pendingOrder.price) / pendingOrder.price);
                    if (priceDiff > 0.03) {
                        logStatus('🔄 价格偏离太大，取消旧单重新挂');
                        await cancelOrder(pendingOrder.ordId);
                        state.pendingOrder = null;
                    }
                }

            } else if (state.position) {
                // 有持仓 - 检查止盈止损
                const unrealized = (last - state.position.entryPrice) / state.position.entryPrice;
                const unrealizedPnL = unrealized * state.position.size * state.position.entryPrice;
                const sign = unrealized >= 0 ? '+' : '';

                logStatus(`持仓中: 未实现 ${sign}${(unrealized * 100).toFixed(2)}% (${sign}$${unrealizedPnL.toFixed(4)})`);
                logStatus(`   现价: $${last}, 目标: $${state.position.takeProfit.toFixed(2)}, 止损: $${state.position.stopLoss.toFixed(2)}`);

                if (unrealized >= TRADE_CONFIG.takeProfitPercent) {
                    logStatus('🎯 触发止盈! 卖出!');

                    if (!TRADE_CONFIG.dryRun) {
                        const sellPrice = (last * 0.995).toFixed(2);
                        const result = await placeLimitOrder('sell', state.position.size, sellPrice);

                        if (result.code === '0') {
                            logStatus('✅ 卖单已挂');
                            state.totalPnL += unrealizedPnL;

                            const elapsed = (Date.now() - state.startTime) / 1000;
                            logStatus(`📊 总盈亏: $${state.totalPnL.toFixed(4)}, 交易次数: ${state.tradeCount}, 耗时: ${elapsed.toFixed(0)}s`);

                            state.position = null;
                        } else {
                            logStatus(`❌ 卖单失败: ${result.data?.[0]?.sMsg || result.msg}`);
                        }
                    }

                } else if (unrealized <= -TRADE_CONFIG.stopLossPercent) {
                    logStatus('🛑 触发止损! 卖出!');

                    if (!TRADE_CONFIG.dryRun) {
                        const sellPrice = (last * 0.995).toFixed(2);
                        const result = await placeLimitOrder('sell', state.position.size, sellPrice);

                        if (result.code === '0') {
                            logStatus('✅ 卖单已挂');
                            state.totalPnL += unrealizedPnL;

                            const elapsed = (Date.now() - state.startTime) / 1000;
                            logStatus(`📊 总盈亏: $${state.totalPnL.toFixed(4)}, 交易次数: ${state.tradeCount}, 耗时: ${elapsed.toFixed(0)}s`);

                            state.position = null;
                        } else {
                            logStatus(`❌ 卖单失败: ${result.data?.[0]?.sMsg || result.msg}`);
                        }
                    }
                }
            }

        } catch (e) {
            logStatus(`❌ 异常: ${e.message}`);
        }

        console.log('');
        await new Promise(r => setTimeout(r, TRADE_CONFIG.checkInterval));
    }
}

console.log('⚠️  主人: 全权授权已收到，有好机会我会自己抓住！\n');
tradingLoop().catch(console.error);
