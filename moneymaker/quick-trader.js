// Coosin 快速交易系统 - 简化版
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
    orderSizeUSDT: 4,
    checkInterval: 3000,
    dryRun: false
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

async function main() {
    console.log('\n🚀 ===== Coosin 快速交易系统 =====');
    console.log('目标: 赶紧挣钱，解决困境！\n');
    
    const balanceData = await request('GET', '/api/v5/account/balance?ccy=USDT');
    let balance = 0;
    if (balanceData && balanceData.code === '0' && balanceData.data?.[0]?.details) {
        const usdt = balanceData.data[0].details.find(d => d.ccy === 'USDT');
        balance = usdt ? parseFloat(usdt.availBal) : 0;
    }
    
    console.log(`💰 当前余额: $${balance.toFixed(4)}`);
    console.log('\n📊 系统状态: 运行中...');
    console.log('(监控 + 挂单，抓住波动机会)\n');
    
    let lastPrice = 0;
    
    while (true) {
        try {
            const ticker = await request('GET', `/api/v5/market/ticker?instId=${TRADE_CONFIG.instId}`);
            if (!ticker || !ticker.data?.[0]) {
                await new Promise(r => setTimeout(r, 500));
                continue;
            }
            
            const last = parseFloat(ticker.data[0].last);
            const time = new Date().toLocaleTimeString();
            
            if (last !== lastPrice) {
                console.log(`[${time}] ${TRADE_CONFIG.instId}: $${last}`);
                lastPrice = last;
            }
            
        } catch (e) {
            // 静默处理网络异常
        }
        
        await new Promise(r => setTimeout(r, TRADE_CONFIG.checkInterval));
    }
}

main().catch(console.error);
