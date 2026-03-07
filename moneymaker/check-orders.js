// 检查当前挂单和成交
import crypto from 'crypto';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const CONFIG = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const agent = new HttpsProxyAgent(CONFIG.proxy);

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

async function checkOrders() {
    console.log('🔍 ===== 检查挂单和成交 =====\n');
    
    // 1. 活跃订单
    console.log('1️⃣ 活跃挂单:');
    const pending = await request('GET', '/api/v5/trade/orders-pending');
    if (pending && pending.code === '0' && pending.data && pending.data.length > 0) {
        console.log(`   ✅ 找到 ${pending.data.length} 个挂单:\n`);
        pending.data.forEach((order, i) => {
            console.log(`   ${i + 1}. ${order.instId} ${order.side} ${order.sz} @ ${order.px}`);
            console.log(`      状态: ${order.state}, 时间: ${order.cTime}`);
            console.log('');
        });
    } else {
        console.log('   无活跃挂单\n');
    }
    
    // 2. 最近成交
    console.log('2️⃣ 最近成交 (过去7天):');
    const history = await request('GET', '/api/v5/trade/orders-history?limit=20');
    if (history && history.code === '0' && history.data && history.data.length > 0) {
        console.log(`   找到 ${history.data.length} 条记录\n`);
        history.data.slice(0, 5).forEach((order, i) => {
            const filled = parseFloat(order.accFillSz);
            if (filled > 0) {
                console.log(`   ${i + 1}. ${order.instId} ${order.side} ${filled} @ ${order.avgPx}`);
                console.log(`      状态: ${order.state}, 盈亏: ${order.fillPnl || 'N/A'}`);
                console.log('');
            }
        });
    } else {
        console.log('   最近无成交\n');
    }
    
    // 3. 余额
    console.log('3️⃣ 当前余额:');
    const balance = await request('GET', '/api/v5/account/balance');
    if (balance && balance.code === '0' && balance.data?.[0]?.details) {
        const usdt = balance.data[0].details.find(d => d.ccy === 'USDT');
        if (usdt) {
            console.log(`   USDT - 可用: ${usdt.availBal}, 余额: ${usdt.cashBal}, 冻结: ${usdt.frozenBal || '0'}`);
        }
    }
}

checkOrders().catch(console.error);
