// 尝试限价单
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

async function getTicker(instId) {
    const timestamp = new Date().toISOString();
    const signature = sign(timestamp, 'GET', `/api/v5/market/ticker?instId=${instId}`, '');
    
    const response = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`, {
        method: 'GET',
        headers: {
            'OK-ACCESS-KEY': config.apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': config.passphrase
        },
        agent
    });
    
    const data = await response.json();
    return data.data?.[0];
}

async function tryLimitOrder() {
    console.log('🔄 尝试限价单...\n');
    
    const instId = 'DOGE-USDT';
    
    // 获取当前行情
    const ticker = await getTicker(instId);
    if (!ticker) {
        console.log('❌ 获取行情失败');
        return;
    }
    
    const last = parseFloat(ticker.last);
    const buyPrice = (last * 0.99).toFixed(5); // 比现价低 1%
    const sz = '50'; // 50 DOGE，约 4.67U
    
    console.log(`📊 ${instId} 行情:`);
    console.log(`   现价: $${last}`);
    console.log(`   限价买单: ${sz} @ $${buyPrice}`);
    console.log(`   订单金额: $${(parseFloat(sz) * parseFloat(buyPrice)).toFixed(4)}`);
    console.log('');
    
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
        instId,
        tdMode: 'cash',
        side: 'buy',
        ordType: 'limit',
        sz,
        px: buyPrice
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
        console.log('📥 响应:', JSON.stringify(data, null, 2));
        
        if (data.code === '0') {
            console.log('\n✅ 限价单提交成功!');
            console.log('   订单 ID:', data.data?.[0]?.ordId);
        } else {
            console.log('\n❌ 失败:', data.data?.[0]?.sMsg || data.msg);
        }
    } catch (e) {
        console.log('\n❌ 异常:', e.message);
    }
}

tryLimitOrder();
