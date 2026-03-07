// 取消刚才的订单
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

async function cancelOrder() {
    console.log('❌ 取消刚才的 DOGE 订单...\n');
    
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
        instId: 'DOGE-USDT',
        ordId: '3364797425834074112'
    });
    
    const signature = sign(timestamp, 'POST', '/api/v5/trade/cancel-order', body);
    
    try {
        const response = await fetch('https://www.okx.com/api/v5/trade/cancel-order', {
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
        console.log('响应:', JSON.stringify(data, null, 2));
        
        if (data.code === '0') {
            console.log('\n✅ 订单已取消');
        } else {
            console.log('\n❌ 取消失败:', data.msg);
        }
    } catch (e) {
        console.log('\n❌ 异常:', e.message);
    }
}

cancelOrder();
