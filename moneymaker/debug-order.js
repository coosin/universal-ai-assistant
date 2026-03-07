// 调试下单问题
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function debugOrder() {
    console.log('🔍 ===== 调试下单问题 =====\n');
    
    // 1. 检查账户模式
    console.log('1️⃣ 检查账户配置...');
    try {
        const balance = await client.getBalance();
        console.log('   余额查询成功');
    } catch (e) {
        console.log('   余额查询失败:', e.message);
    }
    
    // 2. 获取 SOL-USDT 产品信息
    console.log('\n2️⃣ 获取产品信息...');
    try {
        const instruments = await client.request('GET', '/api/v5/public/instruments?instType=SPOT&instId=SOL-USDT');
        if (instruments.code === '0' && instruments.data.length > 0) {
            const inst = instruments.data[0];
            console.log('   产品信息:');
            console.log('   - 最小下单数量:', inst.minSz);
            console.log('   - 最小下单金额:', inst.minSz * inst.ctVal);
            console.log('   - 交易模式:', inst.state);
            console.log('   - 合约乘数:', inst.ctVal);
        }
    } catch (e) {
        console.log('   获取失败:', e.message);
    }
    
    // 3. 尝试小金额测试下单
    console.log('\n3️⃣ 尝试测试下单...');
    try {
        const ticker = await client.getTicker('SOL-USDT');
        const price = parseFloat(ticker.data[0].last);
        const size = 0.01; // 最小数量
        
        console.log(`   当前价格: $${price}`);
        console.log(`   尝试下单: 0.01 SOL @ $${price}`);
        console.log(`   订单金额: $${(0.01 * price).toFixed(4)}`);
        
        const result = await client.placeOrder(
            'SOL-USDT',
            'cash',
            'buy',
            'market',
            '0.01'
        );
        
        console.log('\n   响应:', JSON.stringify(result, null, 2));
        
    } catch (e) {
        console.log('\n   下单异常:', e.message);
    }
}

debugOrder().catch(console.error);
