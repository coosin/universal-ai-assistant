// 检查子账户
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

async function request(method, path, body = '') {
    const timestamp = new Date().toISOString();
    const signature = sign(timestamp, method, path, body);
    
    const response = await fetch('https://www.okx.com' + path, {
        method,
        headers: {
            'OK-ACCESS-KEY': config.apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': config.passphrase,
            'Content-Type': 'application/json'
        },
        ...(body && { body }),
        agent
    });
    
    return response.json();
}

async function checkSubaccount() {
    console.log('🔍 ===== 检查子账户和其他信息 =====\n');
    
    // 1. 检查子账户列表
    console.log('1️⃣ 子账户列表:');
    try {
        const subaccounts = await request('GET', '/api/v5/users/subaccount/list');
        console.log('响应:', JSON.stringify(subaccounts, null, 2));
    } catch (e) {
        console.log('   失败:', e.message);
    }
    
    // 2. 检查所有币种余额（更详细）
    console.log('\n2️⃣ 资产余额:');
    try {
        const assets = await request('GET', '/api/v5/asset/balances');
        console.log('响应:', JSON.stringify(assets, null, 2));
    } catch (e) {
        console.log('   失败:', e.message);
    }
    
    // 3. 检查资金划转
    console.log('\n3️⃣ 最近划转记录:');
    try {
        const transfers = await request('GET', '/api/v5/asset/transfers?limit=20');
        console.log('响应:', JSON.stringify(transfers, null, 2));
    } catch (e) {
        console.log('   失败:', e.message);
    }
}

checkSubaccount().catch(console.error);
