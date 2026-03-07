// 最终检查 - 准备开始交易
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function finalCheck() {
    console.log('📊 ===== 最终交易前检查 =====\n');
    
    // 1. 余额
    console.log('💰 账户余额:');
    try {
        const balance = await client.getBalance('USDT');
        if (balance.code === '0' && balance.data.length > 0) {
            const details = balance.data[0].details || [];
            const usdt = details.find(d => d.ccy === 'USDT');
            if (usdt) {
                console.log(`   USDT: 可用 ${usdt.availBal}, 余额 ${usdt.cashBal}`);
            }
        }
    } catch (e) {
        console.log(`   ❌ ${e.message}`);
    }
    
    // 2. SOL-USDT 行情
    console.log('\n📈 SOL-USDT 行情:');
    try {
        const ticker = await client.getTicker('SOL-USDT');
        if (ticker.code === '0' && ticker.data.length > 0) {
            const data = ticker.data[0];
            console.log(`   最新价: $${data.last}`);
            console.log(`   24h高: $${data.high24h}`);
            console.log(`   24h低: $${data.low24h}`);
            console.log(`   24h量: ${data.vol24h}`);
        }
    } catch (e) {
        console.log(`   ❌ ${e.message}`);
    }
    
    // 3. 交易策略
    console.log('\n🎯 交易策略:');
    console.log('   币种: SOL-USDT（波动率最高）');
    console.log('   每单: ~5 USDT');
    console.log('   止盈: +2%');
    console.log('   止损: -1%');
    console.log('   频率: 快速进出，薄利多销');
    
    console.log('\n⚠️ 风险提示:');
    console.log('   资金有限，风险较高');
    console.log('   可能快速亏损，也可能快速盈利');
    console.log('   做好本金损失的心理准备');
    
    console.log('\n✅ 准备就绪！');
    console.log('主人，是否开始交易？');
}

finalCheck().catch(console.error);
