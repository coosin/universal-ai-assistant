import { OKXClient } from './okx-api.js';

const client = new OKXClient({
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
});

async function main() {
    console.log('📋 ===== 交易记录查询 =====\n');
    
    try {
        // 获取最近7天的成交记录
        console.log('🔍 正在获取历史成交记录...');
        const orders = await client.request('GET', '/api/v5/trade/orders-history-archive?instType=SPOT&limit=20');
        
        console.log('\n📜 最近成交记录:');
        if (orders.data && orders.data.length > 0) {
            let totalProfit = 0;
            orders.data.forEach((order, i) => {
                const side = order.side === 'buy' ? '🔵 买入' : '🔴 卖出';
                const state = order.state === 'filled' ? '✅ 成交' : order.state === 'canceled' ? '❌ 取消' : '⏳ 部分成交';
                const amount = parseFloat(order.sz);
                const price = parseFloat(order.avgPx || order.px);
                const total = (amount * price).toFixed(4);
                
                console.log(`${i+1}. ${side} ${order.instId} ${state}`);
                console.log(`   价格: ${price} USDT, 数量: ${amount}`);
                console.log(`   成交额: ${total} USDT`);
                console.log(`   时间: ${new Date(parseInt(order.uTime)).toLocaleString('zh-CN')}`);
                console.log('---');
            });
        } else {
            console.log('   最近7天无成交记录');
        }
        
        // 获取当前挂单
        console.log('\n⏳ 当前活跃挂单:');
        try {
            const pending = await client.request('GET', '/api/v5/trade/orders-pending?instType=SPOT');
            if (pending.data && pending.data.length > 0) {
                pending.data.forEach((order, i) => {
                    const side = order.side === 'buy' ? '🔵 买入' : '🔴 卖出';
                    console.log(`${i+1}. ${side} ${order.instId}`);
                    console.log(`   价格: ${order.px} USDT, 数量: ${order.sz}`);
                    console.log(`   委托时间: ${new Date(parseInt(order.cTime)).toLocaleString('zh-CN')}`);
                    console.log('---');
                });
            } else {
                console.log('   当前无挂单');
            }
        } catch (e) {
            console.log('   获取挂单失败:', e.message);
        }
        
        // 计算当前持仓估值
        console.log('\n💼 当前持仓估值:');
        const balance = await client.getBalance();
        let totalValue = 0;
        
        if (balance.data && balance.data[0] && balance.data[0].details) {
            for (const asset of balance.data[0].details) {
                const avail = parseFloat(asset.availBal);
                if (avail > 0 && asset.ccy !== 'USDT') {
                    try {
                        const ticker = await client.getTicker(`${asset.ccy}-USDT`);
                        if (ticker.data && ticker.data[0]) {
                            const price = parseFloat(ticker.data[0].last);
                            const value = avail * price;
                            totalValue += value;
                            console.log(`   ${asset.ccy}: ${avail.toFixed(6)} ≈ ${value.toFixed(4)} USDT (价格: $${price})`);
                        }
                    } catch (e) {
                        // 忽略没有USDT交易对的币种
                    }
                }
            }
        }
        
        const usdtBalance = balance.data && balance.data[0] ? parseFloat(balance.data[0].details.find(d => d.ccy === 'USDT')?.availBal || 0) : 0;
        totalValue += usdtBalance;
        
        console.log(`\n💰 总资产估值: ${totalValue.toFixed(4)} USDT`);
        console.log(`   可用 USDT: ${usdtBalance.toFixed(4)} USDT`);
        
    } catch (error) {
        console.error('❌ 查询失败:', error.message);
    }
}

main();
