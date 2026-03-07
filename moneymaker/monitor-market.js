// Coosin 实时行情监控系统
import { OKXClient } from './okx-api.js';

const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: '',
    proxy: 'http://127.0.0.1:7890'
};

const client = new OKXClient(config);
const instruments = ['BTC-USDT', 'ETH-USDT'];

async function monitorOnce() {
    console.log('\n📊 ===== ' + new Date().toLocaleString() + ' =====');
    
    for (const instId of instruments) {
        try {
            const ticker = await client.getTicker(instId);
            if (ticker.code === '0' && ticker.data.length > 0) {
                const data = ticker.data[0];
                const last = parseFloat(data.last);
                const change24h = parseFloat(data.change24h || '0');
                const high24h = parseFloat(data.high24h);
                const low24h = parseFloat(data.low24h);
                
                const changeSign = change24h >= 0 ? '+' : '';
                const changeEmoji = change24h >= 0 ? '📈' : '📉';
                
                console.log(`${changeEmoji} ${instId}`);
                console.log(`   价格: $${last.toLocaleString()}`);
                console.log(`   24h: ${changeSign}${change24h.toFixed(2)}%`);
                console.log(`   24h高: $${high24h.toLocaleString()}`);
                console.log(`   24h低: $${low24h.toLocaleString()}`);
                console.log('');
            }
        } catch (e) {
            console.log(`❌ ${instId} 获取失败: ${e.message}`);
        }
    }
}

// 运行一次
monitorOnce().catch(console.error);
