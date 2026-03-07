// 检查订单历史
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function checkHistory() {
    console.log('🔍 ===== 检查订单历史 =====\n');
    
    // 检查最近 3 个月的订单
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    const history = await client.request('GET', `/api/v5/trade/orders-history?limit=50&begin=${encodeURIComponent(threeMonthsAgo)}`);
    
    if (history && history.code === '0' && history.data && history.data.length > 0) {
        console.log(`✅ 找到 ${history.data.length} 条历史订单\n`);
        
        history.data.forEach((order, i) => {
            console.log(`${i + 1}. [${new Date(parseInt(order.cTime)).toLocaleString()}] ${order.instId}`);
            console.log(`   ${order.side} ${order.sz} @ ${order.px || order.avgPx || '市价'}`);
            console.log(`   状态: ${order.state}, 成交: ${order.accFillSz}`);
            if (order.fillPnl) {
                console.log(`   盈亏: ${order.fillPnl}`);
            }
            console.log('');
        });
    } else {
        console.log('📭 最近无订单历史 (或历史为空)');
        console.log('响应:', JSON.stringify(history, null, 2));
    }
}

checkHistory().catch(console.error);
