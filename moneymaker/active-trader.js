// Coosin 积极交易系统 - 主动挂单
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
    instId: 'DOGE-USDT',
    orderSize: 3,
    buyDiscount: 0.008,
    checkInterval: 4000,
    dryRun: false
};

const agent = new HttpsProxyAgent(CONFIG.proxy);
let state = {
    pendingOrder: null,
    lastLog: 0
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
        return null;
    }
}

function log(message) {
    const now = Date.now();
    if (now - state.lastLog > 5000) {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ${message}`);
        state.lastLog = now;
    }
}

async function placeOrder(side, sz, px) {
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

async function getPendingOrder() {
    const data = await request('GET', '/api/v5/trade/orders-pending');
    if (data && data.code === '0' && data.data) {
        return data.data.find(o => o.instId === TRADE_CONFIG.instId);
    }
    return null;
}

async function getBalance() {
    const data = await request('GET', '/api/v5/account/balance?ccy=USDT');
    if (data && data.code === '0' && data.data?.[0]?.details) {
        const usdt = data.data[0].details.find(d => d.ccy === 'USDT');
        return usdt ? parseFloat(usdt.availBal) : 0;
    }
    return 0;
}

async function activeTradingLoop() {
    console.log('\n🚀 ===== Coosin 积极交易系统启动 =====');
    console.log('目标: 赶紧挣钱，解决困境！\n');

    while (true) {
        try {
            const ticker = await request('GET', `/api/v5/market/ticker?instId=${TRADE_CONFIG.instId}`);
            if (!ticker || !ticker.data?.[0]) {
                await new Promise(r => setTimeout(r, 500));
                continue;
            }

            const last = parseFloat(ticker.data[0].last);
            const pendingOrder = await getPendingOrder();
            const balance = await getBalance();

            if (!pendingOrder && !state.pendingOrder) {
                if (balance >= TRADE_CONFIG.orderSize) {
                    const buyPrice = (last * (1 - TRADE_CONFIG.buyDiscount)).toFixed(5);
                    const size = Math.floor(TRADE_CONFIG.orderSize / buyPrice);
                    if (size > 0) {
                        log(`价格: $${last}, 挂买单: ${size} @ $${buyPrice}`);
                        if (!TRADE_CONFIG.dryRun) {
                            const result = await placeOrder('buy', size, buyPrice);
                            if (result && result.code === '0') {
                                state.pendingOrder = { ordId: result.data[0].ordId, side: 'buy', price: buyPrice, size };
                                log('✅ 买单已挂');
                            }
                        }
                    }
                } else {
                    log(`余额不足: $${balance.toFixed(4)}`);
                }
            } else if (pendingOrder) {
                const priceDiff = Math.abs((last - parseFloat(pendingOrder.px)) / parseFloat(pendingOrder.px));
                if (priceDiff > 0.015) {
                    log('🔄 价格偏离，取消重挂');
                    await cancelOrder(pendingOrder.ordId);
                    state.pendingOrder = null;
                }
            }

        } catch (e) {
            // 静默处理
        }

        await new Promise(r => setTimeout(r, TRADE_CONFIG.checkInterval));
    }
}

console.log('💪 主人放心！主动出击，有机会就抓住！\n');
activeTradingLoop().catch(console.error);
