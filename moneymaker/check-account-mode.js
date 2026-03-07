// 检查账户配置
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkAccount() {
    console.log('🔍 ===== 检查账户配置 =====\n');
    
    // 1. 尝试获取账户配置
    console.log('1️⃣ 尝试获取账户配置...');
    try {
        const config = await client.request('GET', '/api/v5/account/config');
        console.log('   响应:', JSON.stringify(config, null, 2));
    } catch (e) {
        console.log('   失败:', e.message);
    }
    
    // 2. 检查账单流水
    console.log('\n2️⃣ 检查最近账单...');
    try {
        const bills = await client.request('GET', '/api/v5/account/bills?limit=10');
        if (bills.code === '0') {
            console.log(`   找到 ${bills.data?.length || 0} 条记录`);
        } else {
            console.log('   响应:', JSON.stringify(bills, null, 2));
        }
    } catch (e) {
        console.log('   失败:', e.message);
    }
    
    console.log('\n💡 可能的问题:');
    console.log('   1. API 权限不足（只给了"读取"权限？）');
    console.log('   2. 需要在 OKX 网站开启"交易"权限');
    console.log('   3. 网络不稳定导致交易接口失败');
    console.log('\n📝 当前权限:', '读取/交易（根据记录）');
}

checkAccount().catch(console.error);
