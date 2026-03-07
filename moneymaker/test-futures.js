import { OKXFuturesClient } from './okx-futures-api.js';

const client = new OKXFuturesClient({
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
});

async function main() {
    console.log('🚀 Coosin 合约交易系统测试\n');
    
    try {
        // 测试1：获取BTC-USDT永续合约行情
        console.log('📊 测试1: 获取BTC-USDT永续合约行情...');
        const ticker = await client.getTicker('BTC-USDT-SWAP');
        if (ticker.code === '0' && ticker.data && ticker.data[0]) {
            console.log(`   ✅ 成功! 最新价: $${ticker.data[0].last}`);
            console.log(`   24h涨跌: ${ticker.data[0].change24h}%`);
        } else {
            console.log('   ❌ 获取行情失败');
            return;
        }

        // 测试2：获取合约账户余额
        console.log('\n💰 测试2: 获取合约账户余额...');
        const balance = await client.getBalance('USDT');
        if (balance.code === '0' && balance.data && balance.data[0]) {
            const usdtBal = balance.data[0].details.find(d => d.ccy === 'USDT');
            if (usdtBal) {
                console.log(`   ✅ 成功! 可用余额: ${usdtBal.availBal} USDT`);
                console.log(`   总余额: ${usdtBal.cashBal} USDT`);
            } else {
                console.log('   ❌ 未找到USDT余额');
            }
        } else {
            console.log('   ❌ 获取余额失败');
        }

        // 测试3：检查合约权限
        console.log('\n🔑 测试3: 检查合约交易权限...');
        try {
            const positions = await client.getPositions();
            if (positions.code === '0') {
                console.log('   ✅ 合约API权限正常');
                console.log(`   当前持仓数量: ${positions.data ? positions.data.length : 0}`);
            } else {
                console.log(`   ⚠️ 合约权限可能未开通: ${positions.msg}`);
            }
        } catch (e) {
            console.log(`   ❌ 合约API访问失败: ${e.message}`);
        }

        // 测试4：测试设置杠杆
        console.log('\n⚙️ 测试4: 测试设置杠杆倍数...');
        try {
            const leverage = await client.setLeverage('BTC-USDT-SWAP', '3', 'cross');
            if (leverage.code === '0') {
                console.log('   ✅ 杠杆设置成功，当前杠杆倍数: 3倍');
            } else {
                console.log(`   ⚠️ 杠杆设置失败: ${leverage.msg}`);
            }
        } catch (e) {
            console.log(`   ❌ 杠杆设置异常: ${e.message}`);
        }

        console.log('\n✅ 合约API测试完成');
        console.log('\n📝 下一步操作建议:');
        console.log('1. 先在OKX官网开通合约交易权限');
        console.log('2. 划转少量USDT到合约账户（建议1-2U测试）');
        console.log('3. 先用最小仓位测试交易，验证系统稳定性');
        console.log('4. 严格遵守风险控制规则，杠杆不超过5倍');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

main();
