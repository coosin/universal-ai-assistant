// 检查所有余额
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkAll() {
    console.log('🔍 ===== 检查所有余额 =====\n');
    
    const balance = await client.getBalance();
    if (balance.code === '0' && balance.data?.[0]?.details) {
        console.log('📊 所有币种余额:\n');
        balance.data[0].details.forEach(asset => {
            const cash = parseFloat(asset.cashBal);
            const avail = parseFloat(asset.availBal);
            const frozen = parseFloat(asset.frozenBal || '0');
            if (cash > 0.000001 || avail > 0.000001 || frozen > 0.000001) {
                console.log(`   ${asset.ccy}:`);
                console.log(`     可用: ${avail}`);
                console.log(`     余额: ${cash}`);
                console.log(`     冻结: ${frozen}`);
                console.log('');
            }
        });
    }
}

checkAll().catch(console.error);
