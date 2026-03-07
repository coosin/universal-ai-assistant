// 检查最小交易金额
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkMinimums() {
    console.log('💰 ===== 检查最小交易金额 =====\n');
    console.log('当前可用余额: 6.564882465 USDT\n');
    
    const instIds = ['SOL-USDT', 'DOGE-USDT', 'ETH-USDT', 'BTC-USDT'];
    
    for (const instId of instIds) {
        try {
            // 获取产品信息
            const instruments = await client.request('GET', `/api/v5/public/instruments?instType=SPOT&instId=${instId}`);
            if (instruments.code === '0' && instruments.data.length > 0) {
                const inst = instruments.data[0];
                const minSz = parseFloat(inst.minSz);
                const tickSz = parseFloat(inst.tickSz);
                const ctVal = parseFloat(inst.ctVal || 1);
                
                console.log(`📊 ${instId}:`);
                console.log(`   最小下单数量: ${minSz} ${inst.ctCcy || inst.baseCcy}`);
                console.log(`   价格精度: ${tickSz}`);
                
                // 获取当前价格
                const ticker = await client.getTicker(instId);
                if (ticker.code === '0' && ticker.data.length > 0) {
                    const price = parseFloat(ticker.data[0].last);
                    const minOrderValue = minSz * price;
                    
                    console.log(`   当前价格: $${price}`);
                    console.log(`   最小订单金额: $${minOrderValue.toFixed(4)}`);
                    
                    if (minOrderValue <= 6.56) {
                        console.log('   ✅ 6.56U 足够交易!');
                    } else {
                        console.log('   ❌ 金额不足，无法交易');
                    }
                }
                console.log('');
            }
        } catch (e) {
            console.log(`❌ ${instId} 获取失败: ${e.message}`);
        }
    }
    
    console.log('\n💡 替代方案:');
    console.log('   1. 合约交易（加杠杆）');
    console.log('   2. 寻找其他赚钱机会（AI服务/接单）');
    console.log('   3. 先赚点本金再交易');
}

checkMinimums().catch(console.error);
