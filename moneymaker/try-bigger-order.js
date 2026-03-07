// 尝试大一点的订单
import crypto from 'crypto';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136'
};

const proxy = 'http://127.0.0.1:7890';
const agent = new HttpsProxyAgent(proxy);

function sign(timestamp, method, requestPath, body = '') {
    const message = timestamp + method + requestPath + body;
    const hmac = crypto.createHmac('sha256', config.secretKey);
    return hmac.update(message).digest('base64');
}

async function tryOrder(instId, sz) {
    console.log(`🔄 尝试下单: ${instId}, 数量: ${sz}`);
    
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
        instId,
        tdMode: 'cash',
        side: 'buy',
        ordType: 'market',
        sz
    });
    
    const signature = sign(timestamp, 'POST', '/api/v5/trade/order', body);
    
    try {
        const response = await fetch('https://www.okx.com/api/v5/trade/order', {
            method: 'POST',
            headers: {
                'OK-ACCESS-KEY': config.apiKey,
                'OK-ACCESS-SIGN': signature,
                'OK-ACCESS-TIMESTAMP': timestamp,
                'OK-ACCESS-PASSPHRASE': config.passphrase,
                'Content-Type': 'application/json'
            },
            body,
            agent
        });
        
        const data = await response.json();
        
        if (data.code === '0') {
            console.log('✅ 下单成功!', JSON.stringify(data, null, 2));
            return true;
        } else {
            console.log('❌ 失败:', data.data?.[0]?.sMsg || data.msg);
            return false;
        }
    } catch (e) {
        console.log('❌ 异常:', e.message);
        return false;
    }
}

async function main() {
    console.log('🧪 ===== 尝试多个订单 =====\n');
    
    // 先查余额
    console.log('💰 当前余额:');
    const timestamp = new Date().toISOString();
    const signature = sign(timestamp, 'GET', '/api/v5/account/balance?ccy=USDT', '');
    
    const balanceResp = await fetch('https://www.okx.com/api/v5/account/balance?ccy=USDT', {
        method: 'GET',
        headers: {
            'OK-ACCESS-KEY': config.apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': config.passphrase
        },
        agent
    });
    
    const balanceData = await balanceResp.json();
    if (balanceData.code === '0' && balanceData.data.length > 0) {
        const usdt = balanceData.data[0].details?.find(d => d.ccy === 'USDT');
        console.log(`   USDT 可用: ${usdt?.availBal || 'N/A'}`);
        console.log(`   USDT 余额: ${usdt?.cashBal || 'N/A'}\n`);
    }
    
    // 尝试 DOGE（价格低，最小金额小）
    console.log('1️⃣ 尝试 DOGE-USDT, 数量: 100');
    await tryOrder('DOGE-USDT', '100');
    
    console.log('\n2️⃣ 尝试 DOGE-USDT, 数量: 50');
    await tryOrder('DOGE-USDT', '50');
}

main().catch(console.error);
