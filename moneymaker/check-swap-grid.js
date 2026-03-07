// 专门检查永续合约持仓和网格
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

async function checkSwapPositions() {
    console.log('🔍 ===== 检查永续合约持仓 =====\n');
    
    // 1. 检查所有 SWAP 持仓
    console.log('1️⃣ 永续合约持仓:');
    const positions = await request('GET', '/api/v5/account/positions?instType=SWAP');
    console.log('响应:', JSON.stringify(positions, null, 2));
    
    if (positions.code === '0' && positions.data && positions.data.length > 0) {
        console.log(`\n✅ 找到 ${positions.data.length} 个持仓:\n`);
        positions.data.forEach((pos, i) => {
            console.log(`${i + 1}. ${pos.instId}`);
            console.log(`   方向: ${pos.side}, 数量: ${pos.pos}`);
            console.log(`   开仓价: ${pos.avgPx}, 未实现盈亏: ${pos.upl}`);
            console.log(`   强平价: ${pos.liqPx}, 保证金: ${pos.mgn}`);
            console.log('');
        });
    } else {
        console.log('\n   无 SWAP 持仓\n');
    }
    
    // 2. 检查策略订单（网格）
    console.log('2️⃣ 检查策略/网格订单:');
    const algoOrders = await request('GET', '/api/v5/trade/orders-algo-pending');
    console.log('响应:', JSON.stringify(algoOrders, null, 2));
    
    if (algoOrders.code === '0' && algoOrders.data && algoOrders.data.length > 0) {
        console.log(`\n✅ 找到 ${algoOrders.data.length} 个策略订单:\n`);
    } else {
        console.log('\n   无活跃策略订单\n');
    }
    
    // 3. 检查所有活跃订单
    console.log('3️⃣ 所有活跃订单:');
    const pending = await request('GET', '/api/v5/trade/orders-pending');
    console.log('响应:', JSON.stringify(pending, null, 2));
}

checkSwapPositions().catch(console.error);
