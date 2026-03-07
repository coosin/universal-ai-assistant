// 尝试简化版下单
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

async function tryOrder() {
    console.log('🔄 尝试简化版下单...\n');
    
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
        instId: 'SOL-USDT',
        tdMode: 'cash',
        side: 'buy',
        ordType: 'market',
        sz: '0.01'
    });
    
    const signature = sign(timestamp, 'POST', '/api/v5/trade/order', body);
    
    console.log('📤 请求详情:');
    console.log('   URL: https://www.okx.com/api/v5/trade/order');
    console.log('   Body:', body);
    
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
        console.log('\n📥 响应:', JSON.stringify(data, null, 2));
        
        if (data.code !== '0') {
            console.log('\n❌ 错误信息:', data.msg);
            console.log('\n💡 可能的原因:');
            console.log('   1. API 没有交易权限（opAuth: "0"）');
            console.log('   2. 需要在 OKX 网站开启"提币/交易"权限');
            console.log('   3. IP 白名单限制');
        }
        
    } catch (e) {
        console.log('\n❌ 请求异常:', e.message);
    }
}

tryOrder();
