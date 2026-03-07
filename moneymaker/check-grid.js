// 检查网格交易持仓和订单
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkGridTrading() {
    console.log('🔍 ===== 检查网格交易 =====\n');
    
    // 1. 检查 SWAP 持仓
    console.log('📈 永续合约持仓:');
    try {
        const positions = await client.request('GET', '/api/v5/account/positions?instType=SWAP');
        if (positions.code === '0') {
            if (positions.data && positions.data.length > 0) {
                console.log(`   ✅ 找到 ${positions.data.length} 个持仓:`);
                positions.data.forEach((pos, i) => {
                    console.log(`   ${i + 1}. ${pos.instId}`);
                    console.log(`      方向: ${pos.side}, 数量: ${pos.pos}`);
                    console.log(`      开仓价: ${pos.avgPx}, 未实现盈亏: ${pos.upl} USDT`);
                    console.log(`      强平价: ${pos.liqPx}`);
                });
            } else {
                console.log('   无 SWAP 持仓');
            }
        } else {
            console.log(`   ❌ ${positions.msg}`);
        }
    } catch (e) {
        console.log(`   ❌ ${e.message}`);
    }
    
    // 2. 检查所有活跃订单（可能包含网格订单）
    console.log('\n📋 所有活跃订单:');
    try {
        const orders = await client.request('GET', '/api/v5/trade/orders-pending');
        if (orders.code === '0') {
            if (orders.data && orders.data.length > 0) {
                console.log(`   ✅ 找到 ${orders.data.length} 个订单:`);
                orders.data.forEach((order, i) => {
                    console.log(`   ${i + 1}. ${order.instId} ${order.side} ${order.sz} @ ${order.px}`);
                    console.log(`      类型: ${order.ordType}, 状态: ${order.state}`);
                });
            } else {
                console.log('   无活跃订单');
            }
        }
    } catch (e) {
        console.log(`   ❌ ${e.message}`);
    }
    
    // 3. 检查订单历史（最近3天）
    console.log('\n📜 最近订单历史:');
    try {
        const history = await client.request('GET', '/api/v5/trade/orders-history?limit=20');
        if (history.code === '0') {
            if (history.data && history.data.length > 0) {
                console.log(`   最近 ${history.data.length} 笔历史订单:`);
                history.data.slice(0, 5).forEach((order, i) => {
                    console.log(`   ${i + 1}. ${order.instId} ${order.side} ${order.sz} @ ${order.avgPx || order.px}`);
                    console.log(`      状态: ${order.state}, 盈亏: ${order.fillPnl || 'N/A'}`);
                });
            } else {
                console.log('   无历史订单');
            }
        }
    } catch (e) {
        console.log(`   ❌ ${e.message}`);
    }
}

checkGridTrading().catch(console.error);
