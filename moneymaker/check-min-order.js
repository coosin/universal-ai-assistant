// 检查最小订单要求
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkMinOrder() {
    console.log('🔍 ===== 检查最小订单要求 =====\n');
    
    const instIds = ['SOL-USDT', 'DOGE-USDT', 'XRP-USDT', 'ADA-USDT', 'MATIC-USDT'];
    
    for (const instId of instIds) {
        try {
            const instruments = await client.request('GET', `/api/v5/public/instruments?instType=SPOT&instId=${instId}`);
            if (instruments.code === '0' && instruments.data.length > 0) {
                const inst = instruments.data[0];
                const ticker = await client.getTicker(instId);
                const price = ticker.data?.[0]?.last ? parseFloat(ticker.data[0].last) : 0;
                const minSz = parseFloat(inst.minSz);
                const minOrderValue = minSz * price;
                
                console.log(`📊 ${instId}:`);
                console.log(`   价格: $${price}`);
                console.log(`   最小数量: ${minSz}`);
                console.log(`   最小订单金额: $${minOrderValue.toFixed(4)}`);
                
                if (minOrderValue <= 6.56) {
                    console.log('   ✅ 6.56U 足够!');
                } else {
                    console.log('   ❌ 金额不足');
                }
                console.log('');
            }
        } catch (e) {
            console.log(`❌ ${instId}:`, e.message);
        }
    }
    
    console.log('💡 提示: 可能需要找价格更低的币种，或者增加资金');
}

checkMinOrder().catch(console.error);
