// 获取历史行情数据
import { OKXClient } from './okx-api.js';
import fs from 'fs';
import path from 'path';

const client = new OKXClient({
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    proxy: 'http://127.0.0.1:7890'
});

async function fetchHistoricalData(instId, bar = '1H', limit = 100) {
    try {
        console.log(`正在获取 ${instId} ${bar} 历史数据...`);
        const response = await client.request('GET', `/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
        
        if (response.code === '0' && response.data) {
            const data = response.data.map(item => ({
                time: new Date(parseInt(item[0])).toISOString(),
                open: parseFloat(item[1]),
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4]),
                volume: parseFloat(item[5])
            })).reverse();
            
            console.log(`获取成功，共 ${data.length} 条数据`);
            return data;
        }
        
        throw new Error(`API 错误: ${response.msg}`);
    } catch (error) {
        console.error('获取历史数据失败:', error.message);
        throw error;
    }
}

// 主函数
async function main() {
    try {
        // 确保目录存在
        const marketDataDir = path.join(process.cwd(), 'market-data');
        if (!fs.existsSync(marketDataDir)) {
            fs.mkdirSync(marketDataDir, { recursive: true });
        }

        // 获取 SOL 和 DOGE 历史数据
        const solData = await fetchHistoricalData('SOL-USDT', '1H', 200);
        fs.writeFileSync(path.join(marketDataDir, 'SOL-USDT-1h.json'), JSON.stringify(solData, null, 2));
        
        const dogeData = await fetchHistoricalData('DOGE-USDT', '1H', 200);
        fs.writeFileSync(path.join(marketDataDir, 'DOGE-USDT-1h.json'), JSON.stringify(dogeData, null, 2));
        
        console.log('✅ 历史数据已保存到 market-data 目录');
    } catch (error) {
        console.error('❌ 数据获取失败:', error);
        process.exit(1);
    }
}

main();
