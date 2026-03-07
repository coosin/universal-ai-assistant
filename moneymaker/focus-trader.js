// Coosin 专注交易系统 - 目标明确
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
    orderSizeUSDT: 1.5,
    buyDiscount: 0.005,
    checkInterval: 5000,
    dryRun: false
};

const agent = new HttpsProxyAgent(CONFIG.proxy);
let state = {
    ordersCompleted: 0,
    lastAction: Date.now()
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
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${message}`);
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

async function getPendingOrder() {
    const data = await request('GET', '/api/v5/trade/orders-pending');
    if (data && data.code === '0' && data.data) {
        return data.data.find(o => o.instId === TRADE_CONFIG.instId);
    }
    return null;
}

async function cancelOrder(ordId) {
    const body = JSON.stringify({
        instId: TRADE_CONFIG.instId,
        ordId
    });
    return request('POST', '/api/v5/trade/cancel-order', body);
}

async function focusedTradingLoop() {
    console.log('\n🎯 ===== Coosin 专注交易系统 =====');
    console.log('目标：完成首笔交易！\n');

    while (true) {
        try {
            const ticker = await getTicker();
            if (!ticker) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            const last = parseFloat(ticker.last);
            const balance = await getBalance();
            const pendingOrder = await getPendingOrder();

            const now = Date.now();
            if (now - state.lastAction > 8000) {
                log(`价格: $${last}, 余额: $${balance.toFixed(4)}, 已完成: ${state.ordersCompleted} 笔`);
                state.lastAction = now;
            }

            if (!pendingOrder && balance >= TRADE_CONFIG.orderSizeUSDT) {
                const buyPrice = (last * (1 - TRADE_CONFIG.buyDiscount)).toFixed(5);
                const size = Math.floor(TRADE_CONFIG.orderSizeUSDT / buyPrice);
                
                if (size > 0) {
                    log(`📈 尝试挂买单: ${size} @ $${buyPrice}`);
                    const result = await placeOrder('buy', size, buyPrice);
                    if (result && result.code === '0') {
                        log('✅ 买单已挂');
                    }
                }
            }

            if (pendingOrder) {
                const priceDiff = Math.abs((last - parseFloat(pendingOrder.px)) / parseFloat(pendingOrder.px));
                if (priceDiff > 0.012) {
                    log('🔄 价格偏离，取消重挂');
                    await cancelOrder(pendingOrder.ordId);
                }
            }

        } catch (e) {
            // 静默处理
        }

        await new Promise(r => setTimeout(r, TRADE_CONFIG.checkInterval));
    }
}

console.log('💪 目标明确：完成首笔交易！开始执行！\n');
focusedTradingLoop().catch(console.error);
