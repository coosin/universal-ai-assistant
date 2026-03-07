// 扫描适合小资金的交易对
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);

async function scanOpportunities() {
    console.log('🔍 ===== 扫描小资金交易机会 =====\n');
    
    // 主流小币种列表
    const targets = [
        'BTC-USDT', 'ETH-USDT', 
        'SOL-USDT', 'XRP-USDT', 'DOGE-USDT',
        'AVAX-USDT', 'MATIC-USDT', 'DOT-USDT',
        'LINK-USDT', 'ATOM-USDT', 'ADA-USDT'
    ];
    
    console.log(`📊 扫描 ${targets.length} 个交易对...\n`);
    
    const opportunities = [];
    
    for (const instId of targets) {
        try {
            const ticker = await client.getTicker(instId);
            if (ticker.code === '0' && ticker.data.length > 0) {
                const data = ticker.data[0];
                const last = parseFloat(data.last);
                const change24h = parseFloat(data.change24h || '0');
                const vol24h = parseFloat(data.vol24h || '0');
                const high24h = parseFloat(data.high24h);
                const low24h = parseFloat(data.low24h);
                
                const volatility = ((high24h - low24h) / low24h) * 100;
                
                opportunities.push({
                    instId,
                    last,
                    change24h,
                    volatility,
                    vol24h,
                    score: Math.abs(change24h) + volatility * 0.5
                });
            }
        } catch (e) {
            // 跳过失败的
        }
    }
    
    // 按机会分数排序
    opportunities.sort((a, b) => b.score - a.score);
    
    console.log('🔥 ===== 最适合小资金的交易对 =====\n');
    
    opportunities.slice(0, 5).forEach((opp, i) => {
        const changeSign = opp.change24h >= 0 ? '+' : '';
        const trend = opp.change24h >= 0 ? '📈' : '📉';
        
        console.log(`${i + 1}. ${trend} ${opp.instId}`);
        console.log(`   价格: $${opp.last.toLocaleString()}`);
        console.log(`   24h涨跌: ${changeSign}${opp.change24h.toFixed(2)}%`);
        console.log(`   24h波动率: ${opp.volatility.toFixed(2)}%`);
        console.log(`   机会评分: ${opp.score.toFixed(2)}`);
        console.log('');
    });
    
    console.log('💡 建议: 选择波动大、成交量高的币种');
    console.log('   快进快出，薄利多销，严格止损');
}

scanOpportunities().catch(console.error);
