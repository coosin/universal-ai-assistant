// 检查所有类型的持仓
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkAllPositions() {
    console.log('📊 ===== 检查所有持仓 =====\n');
    
    // 1. 现货持仓 (已在余额中显示)
    console.log('💰 现货余额:');
    try {
        const balance = await client.getBalance();
        if (balance.code === '0' && balance.data.length > 0) {
            const details = balance.data[0].details || [];
            let hasNonZero = false;
            details.forEach(asset => {
                const cash = parseFloat(asset.cashBal);
                const avail = parseFloat(asset.availBal);
                if (cash > 0.01 || avail > 0.01) {
                    console.log(`   - ${asset.ccy}: 可用 ${avail}, 余额 ${cash}`);
                    hasNonZero = true;
                }
            });
            if (!hasNonZero) {
                console.log('   (无大额余额)');
            }
        }
    } catch (e) {
        console.log(`   ❌ 获取失败: ${e.message}`);
    }
    
    // 2. 合约持仓
    console.log('\n📈 合约持仓:');
    try {
        // 检查所有合约类型
        const instTypes = ['SWAP', 'FUTURES', 'OPTION'];
        
        for (const instType of instTypes) {
            console.log(`\n  [${instType}]`);
            try {
                const positions = await client.request('GET', `/api/v5/account/positions?instType=${instType}`);
                if (positions.code === '0') {
                    if (positions.data && positions.data.length > 0) {
                        console.log(`    ✅ 找到 ${positions.data.length} 个持仓:`);
                        positions.data.forEach((pos, i) => {
                            console.log(`    ${i + 1}. ${pos.instId}`);
                            console.log(`       方向: ${pos.side}, 数量: ${pos.pos}`);
                            console.log(`       开仓价: ${pos.avgPx}, 现价: ${pos.upl}`);
                            console.log(`       未实现盈亏: ${pos.upl} USDT`);
                        });
                    } else {
                        console.log('    无持仓');
                    }
                } else {
                    console.log(`    ❌ ${positions.msg}`);
                }
            } catch (e) {
                console.log(`    ❌ 请求失败: ${e.message}`);
            }
        }
    } catch (e) {
        console.log(`   ❌ 获取失败: ${e.message}`);
    }
    
    // 3. 订单历史
    console.log('\n📋 活跃订单:');
    try {
        const orders = await client.request('GET', '/api/v5/trade/orders-pending');
        if (orders.code === '0') {
            if (orders.data && orders.data.length > 0) {
                console.log(`   ✅ 找到 ${orders.data.length} 个活跃订单:`);
                orders.data.forEach((order, i) => {
                    console.log(`   ${i + 1}. ${order.instId} ${order.side} ${order.sz} @ ${order.px}`);
                });
            } else {
                console.log('   无活跃订单');
            }
        }
    } catch (e) {
        console.log(`   ❌ 获取失败: ${e.message}`);
    }
}

checkAllPositions().catch(console.error);
