// 分析市场波动率
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
}

async function analyzeVolatility() {
    console.log('📊 ===== 市场波动率分析 =====\n');
    
    const instruments = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'DOGE-USDT'];
    
    for (const instId of instruments) {
        console.log(`🔍 ${instId}:`);
        
        // 获取行情
        const ticker = await request('GET', `/api/v5/market/ticker?instId=${instId}`);
        if (ticker.code === '0' && ticker.data?.[0]) {
            const t = ticker.data[0];
            const last = parseFloat(t.last);
            const high24h = parseFloat(t.high24h);
            const low24h = parseFloat(t.low24h);
            const change24h = parseFloat(t.change24h || '0');
            const volatility = ((high24h - low24h) / low24h) * 100;
            
            const changeSign = change24h >= 0 ? '+' : '';
            const trend = change24h >= 0 ? '📈' : '📉';
            
            console.log(`   ${trend} 现价: $${last.toLocaleString()}`);
            console.log(`   24h涨跌: ${changeSign}${change24h.toFixed(2)}%`);
            console.log(`   24h波动: ${volatility.toFixed(2)}% (${low24h} - ${high24h})`);
            console.log(`   24h量: ${t.vol24h?.substring(0, 8)}...`);
            
            if (volatility > 5) {
                console.log('   🔥 波动很大，适合吃波段！');
            } else if (volatility > 3) {
                console.log('   ⚡ 波动中等，可以操作');
            } else {
                console.log('   🐢 波动较小');
            }
        }
        console.log('');
    }
    
    console.log('💡 ===== 波段策略建议 =====');
    console.log('1. 高波动品种（BTC/ETH/SOL）适合做波段');
    console.log('2. 关键支撑/压力位挂单，高抛低吸');
    console.log('3. 快进快出，不恋战，及时止盈止损');
    console.log('4. 当前波动大，是好机会！');
}

analyzeVolatility().catch(console.error);
