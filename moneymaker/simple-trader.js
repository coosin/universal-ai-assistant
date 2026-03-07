// Coosin 简单稳健交易系统
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

async function main() {
    console.log('\n🚀 ===== Coosin 交易系统启动 =====');
    console.log('目标: 赶紧挣钱，解决困境！\n');
    
    let lastLog = Date.now();
    
    while (true) {
        try {
            // 获取余额
            const balanceData = await request('GET', '/api/v5/account/balance');
            let usdtBalance = 0;
            if (balanceData && balanceData.code === '0' && balanceData.data?.[0]?.details) {
                const usdt = balanceData.data[0].details.find(d => d.ccy === 'USDT');
                usdtBalance = usdt ? parseFloat(usdt.availBal) : 0;
            }
            
            // 获取行情
            const btcTicker = await request('GET', '/api/v5/market/ticker?instId=BTC-USDT');
            const ethTicker = await request('GET', '/api/v5/market/ticker?instId=ETH-USDT');
            const dogeTicker = await request('GET', '/api/v5/market/ticker?instId=DOGE-USDT');
            
            const btcPrice = btcTicker?.data?.[0]?.last || 'N/A';
            const ethPrice = ethTicker?.data?.[0]?.last || 'N/A';
            const dogePrice = dogeTicker?.data?.[0]?.last || 'N/A';
            
            const now = Date.now();
            if (now - lastLog > 10000) {
                const time = new Date().toLocaleTimeString();
                console.log(`[${time}] 余额: $${usdtBalance.toFixed(4)} | BTC: $${btcPrice} | ETH: $${ethPrice} | DOGE: $${dogePrice}`);
                lastLog = now;
            }
            
        } catch (e) {
            // 静默处理
        }
        
        await new Promise(r => setTimeout(r, 2000));
    }
}

console.log('💪 系统运行中，有机会就抓住！目标：赶紧挣钱！\n');
main().catch(console.error);
