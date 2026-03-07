// 专门检查 SOL 持仓
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

async function checkSolPosition() {
    console.log('🔍 ===== 专门检查 SOL 持仓 =====\n');
    
    // 1. 所有币种余额
    console.log('1️⃣ 所有币种余额:');
    const balance = await request('GET', '/api/v5/account/balance');
    if (balance && balance.code === '0' && balance.data?.[0]?.details) {
        balance.data[0].details.forEach(asset => {
            const cash = parseFloat(asset.cashBal);
            const avail = parseFloat(asset.availBal);
            const frozen = parseFloat(asset.frozenBal || '0');
            if (cash > 0.0001 || avail > 0.0001 || frozen > 0.0001) {
                console.log(`   - ${asset.ccy}: 可用=${avail}, 余额=${cash}, 冻结=${frozen}`);
            }
        });
    }
    
    // 2. SOL-USDT 持仓
    console.log('\n2️⃣ SOL-USDT 持仓:');
    const positions = await request('GET', '/api/v5/account/positions?instType=SPOT');
    console.log('响应:', JSON.stringify(positions, null, 2));
    
    // 3. 检查所有类型持仓
    console.log('\n3️⃣ 检查所有持仓类型:');
    for (const instType of ['SPOT', 'SWAP', 'FUTURES', 'OPTION']) {
        const pos = await request('GET', `/api/v5/account/positions?instType=${instType}`);
        if (pos && pos.code === '0' && pos.data && pos.data.length > 0) {
            console.log(`\n✅ ${instType} 找到 ${pos.data.length} 个持仓:`);
            pos.data.forEach(p => {
                console.log(`   - ${p.instId}: ${p.side} ${p.pos} @ ${p.avgPx}`);
            });
        }
    }
}

checkSolPosition().catch(console.error);
