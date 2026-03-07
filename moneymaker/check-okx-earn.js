// 检查 OKX 赚币和活动
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkOpportunities() {
    console.log('🔍 ===== 寻找盈利机会 =====\n');
    
    // 1. 检查当前余额
    console.log('💰 当前余额:');
    try {
        const balance = await client.getBalance();
        if (balance.code === '0' && balance.data.length > 0) {
            const details = balance.data[0].details || [];
            details.forEach(asset => {
                const cash = parseFloat(asset.cashBal);
                const avail = parseFloat(asset.availBal);
                if (cash > 0 || avail > 0) {
                    console.log(`   - ${asset.ccy}: 可用 ${avail}, 余额 ${cash}`);
                }
            });
        }
    } catch (e) {
        console.log(`   ❌ ${e.message}`);
    }
    
    // 2. 检查闪兑/小币交易
    console.log('\n📊 小额交易对分析:');
    console.log('   建议: 寻找低价格、高波动币种');
    console.log('   或者使用赚币功能（如果有的话）');
    
    // 3. 其他建议
    console.log('\n💡 其他零成本盈利方向:');
    console.log('   1. 验证 OpenRouter API - 尝试 AI 服务变现');
    console.log('   2. 检查 AWS 免费额度 - 云服务/算力变现');
    console.log('   3. 利用编程技能 - 接单/自动化脚本');
    console.log('   4. OKX 邀请返佣/活动');
    
    console.log('\n🔍 正在验证其他资产...');
}

checkOpportunities().catch(console.error);
