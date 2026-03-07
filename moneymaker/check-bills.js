// 检查账单历史
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkBills() {
    console.log('📜 ===== 账单历史 =====\n');
    
    try {
        const bills = await client.request('GET', '/api/v5/account/bills?limit=20');
        if (bills.code === '0' && bills.data.length > 0) {
            console.log(`最近 ${bills.data.length} 条记录:\n`);
            bills.data.slice(0, 10).forEach((bill, i) => {
                console.log(`${i + 1}. [${bill.billType}] ${bill.ccy}`);
                console.log(`   金额: ${bill.adjBal}, 余额: ${bill.bal}`);
                console.log(`   时间: ${bill.ts}`);
                console.log('');
            });
        }
    } catch (e) {
        console.log('获取失败:', e.message);
    }
    
    console.log('\n💡 重要发现:');
    console.log('   账户结算货币: USDC');
    console.log('   我们的余额: USDT');
    console.log('   可能需要先把 USDT 换成 USDC，或者用 USDC 交易');
}

checkBills().catch(console.error);
