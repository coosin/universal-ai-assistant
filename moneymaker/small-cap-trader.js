// Coosin 小资金交易系统 - 正式版
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
    instId: 'DOGE-USDT',      // 选价格低、波动好的
    orderSize: 4,              // 每次用 4 USDT
    takeProfit: 0.03,         // 止盈 3%
    stopLoss: 0.015,          // 止损 1.5%
    checkInterval: 3000,       // 每 3 秒检查一次
    dryRun: false            // true = 只监控不交易
};

const agent = new HttpsProxyAgent(CONFIG.proxy);
let state = {
    balance: 0,
    position: null,
    pendingOrder: null,
    totalPnL: 0,
    tradeCount: 0
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

async function placeLimitOrder(side, sz, px) {
    const body = JSON.stringify({
        instId: TRADE_CONFIG.instId,
        tdMode: 'cash',
        side,
        ordType: 'limit',
        sz: String(sz),
        px: String(px)
    });
    
    const data = await request('POST', '/api/v5/trade/order', body);
    return data;
}

async function cancelOrder(ordId) {
    const body = JSON.stringify({
        instId: TRADE_CONFIG.instId,
        ordId
    });
    return request('POST', '/api/v5/trade/cancel-order', body);
}

async function tradingLoop() {
    console.log('\n🚀 ===== Coosin 小资金交易系统启动 =====');
    console.log(`交易对: ${TRADE_CONFIG.instId}`);
    console.log(`每单金额: ~$${TRADE_CONFIG.orderSize}`);
    console.log(`止盈: ${TRADE_CONFIG.takeProfit * 100}%, 止损: ${TRADE_CONFIG.stopLoss * 100}%`);
    console.log('========================================\n');

    state.balance = await getBalance();
    console.log(`💰 初始余额: $${state.balance.toFixed(4)}\n`);

    while (true) {
        try {
            const ticker = await getTicker();
            if (!ticker) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            const last = parseFloat(ticker.last);
            const time = new Date().toLocaleTimeString();
            const pendingOrder = await getPendingOrder();

            if (!state.position && !pendingOrder) {
                // 无持仓，无挂单 - 尝试挂限价买单
                const buyPrice = (last * 0.995).toFixed(5);
                const size = (TRADE_CONFIG.orderSize / buyPrice).toFixed(0);
                
                console.log(`[${time}] 价格: $${last}`);
                
                if (!TRADE_CONFIG.dryRun) {
                    console.log(`   📈 挂限价买单: ${size} @ $${buyPrice}`);
                    const result = await placeLimitOrder('buy', size, buyPrice);
                    if (result.code === '0') {
                        state.pendingOrder = { ordId: result.data[0].ordId, side: 'buy', price: buyPrice };
                        console.log('   ✅ 订单已挂');
                    } else {
                        console.log('   ❌ 挂单失败:', result.data?.[0]?.sMsg || result.msg);
                    }
                }

            } else if (pendingOrder) {
                // 有挂单 - 检查是否成交
                console.log(`[${time}] 等待成交...`);

            } else if (state.position) {
                // 有持仓 - 检查止盈止损
                const unrealized = (last - state.position.price) / state.position.price;
                const sign = unrealized >= 0 ? '+' : '';
                console.log(`[${time}] 价格: $${last}, 未实现: ${sign}${(unrealized * 100).toFixed(2)}%`);
                
                if (unrealized >= TRADE_CONFIG.takeProfit) {
                    console.log('   🎯 触发止盈!');
                } else if (unrealized <= -TRADE_CONFIG.stopLoss) {
                    console.log('   🛑 触发止损!');
                }
            }

        } catch (e) {
            console.log('循环异常:', e.message);
        }

        await new Promise(r => setTimeout(r, TRADE_CONFIG.checkInterval));
    }
}

console.log('⚠️  主人: 这是简化版，先监控和挂单测试。完整的持仓管理需要更多开发。\n');
tradingLoop().catch(console.error);
