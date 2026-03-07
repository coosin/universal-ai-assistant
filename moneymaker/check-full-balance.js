// 检查完整账户信息
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkFullAccount() {
    console.log('🔍 ===== 完整账户信息 =====\n');
    
    // 1. 完整余额（所有币种）
    console.log('1️⃣ 所有币种余额:');
    try {
        const balance = await client.getBalance();
        if (balance.code === '0' && balance.data.length > 0) {
            const details = balance.data[0].details || [];
            console.log(`   共 ${details.length} 个币种\n`);
            
            let hasNonZero = false;
            details.forEach(asset => {
                const cash = parseFloat(asset.cashBal);
                const avail = parseFloat(asset.availBal);
                if (cash > 0.001 || avail > 0.001) {
                    console.log(`   - ${asset.ccy}`);
                    console.log(`     可用: ${avail}, 余额: ${cash}`);
                    console.log(`     冻结: ${asset.frozenBal || '0'}, 负债: ${asset.eqBal || '0'}`);
                    console.log('');
                    hasNonZero = true;
                }
            });
            
            if (!hasNonZero) {
                console.log('   (所有余额都小于 0.001)');
            }
        }
    } catch (e) {
        console.log('   ❌', e.message);
    }
    
    // 2. 账户配置
    console.log('\n2️⃣ 账户配置:');
    try {
        const config = await client.request('GET', '/api/v5/account/config');
        if (config.code === '0' && config.data.length > 0) {
            const cfg = config.data[0];
            console.log('   账户等级:', cfg.acctLv);
            console.log('   权限:', cfg.perm);
            console.log('   操作权限:', cfg.opAuth);
            console.log('   结算货币:', cfg.settleCcy);
            console.log('   账户模式:', cfg.posMode);
        }
    } catch (e) {
        console.log('   ❌', e.message);
    }
    
    // 3. 资金划转记录
    console.log('\n3️⃣ 最近资金记录:');
    try {
        const bills = await client.request('GET', '/api/v5/asset/bills?limit=10');
        if (bills.code === '0' && bills.data.length > 0) {
            console.log(`   找到 ${bills.data.length} 条记录\n`);
            bills.data.slice(0, 5).forEach((bill, i) => {
                console.log(`   ${i + 1}. ${bill.ctype || 'N/A'} ${bill.ccy}`);
                console.log(`      金额: ${bill.amt}, 余额: ${bill.bal}`);
                console.log(`      时间: ${bill.ts}`);
                console.log('');
            });
        }
    } catch (e) {
        console.log('   ❌', e.message);
    }
}

checkFullAccount().catch(console.error);
