import { OKXClient } from './okx-api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const config = {
    apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
    passphrase: 'Cool+095136',
    baseURL: 'https://www.okx.com',
    proxy: 'http://127.0.0.1:7890'
};

async function main() {
    console.log('🚀 Coosin OKX 交易系统测试（代理版）\n');
    
    const client = new OKXClient(config);
    
    // 测试1: 获取 BTC/USDT 行情（公开接口）
    console.log('📊 测试1: 获取 BTC-USDT 行情...');
    try {
        const ticker = await client.getTicker('BTC-USDT');
        if (ticker.code === '0') {
            console.log('   ✅ 成功!');
            console.log(`   最新价: ${ticker.data[0].last}`);
            console.log(`   24h涨跌: ${ticker.data[0].change24h}%`);
            
            // 保存行情数据
            const dataPath = path.join(__dirname, 'market-data.json');
            const marketData = {
                timestamp: new Date().toISOString(),
                btcusdt: ticker.data[0]
            };
            fs.writeFileSync(dataPath, JSON.stringify(marketData, null, 2));
            console.log('   📝 行情数据已保存');
        } else {
            console.log(`   ❌ 失败: ${ticker.msg}`);
        }
    } catch (e) {
        console.log(`   ❌ 错误: ${e.message}`);
    }
    
    // 测试2: 获取 ETH/USDT 行情
    console.log('\n📊 测试2: 获取 ETH-USDT 行情...');
    try {
        const ticker = await client.getTicker('ETH-USDT');
        if (ticker.code === '0') {
            console.log('   ✅ 成功!');
            console.log(`   最新价: ${ticker.data[0].last}`);
            console.log(`   24h涨跌: ${ticker.data[0].change24h}%`);
        } else {
            console.log(`   ❌ 失败: ${ticker.msg}`);
        }
    } catch (e) {
        console.log(`   ❌ 错误: ${e.message}`);
    }
    
    // 测试3: 获取账户余额（需要认证）
    console.log('\n💰 测试3: 获取账户余额...');
    try {
        const balance = await client.getBalance();
        if (balance.code === '0') {
            console.log('   ✅ 认证成功!');
            if (balance.data && balance.data.length > 0) {
                const details = balance.data[0].details || [];
                console.log(`   资产数量: ${details.length}`);
                details.forEach(asset => {
                    if (parseFloat(asset.cashBal) > 0 || parseFloat(asset.availBal) > 0) {
                        console.log(`   - ${asset.ccy}: 可用 ${asset.availBal}, 余额 ${asset.cashBal}`);
                    }
                });
            }
        } else {
            console.log(`   ❌ 失败: ${balance.msg}`);
        }
    } catch (e) {
        console.log(`   ❌ 错误: ${e.message}`);
    }
    
    // 测试4: 获取当前持仓
    console.log('\n📈 测试4: 获取当前持仓...');
    try {
        const positions = await client.getPositions();
        if (positions.code === '0') {
            console.log('   ✅ 成功!');
            if (positions.data && positions.data.length > 0) {
                console.log(`   持仓数量: ${positions.data.length}`);
                positions.data.forEach(pos => {
                    console.log(`   - ${pos.instId}: ${pos.side} ${pos.pos} @ ${pos.avgPx}`);
                });
            } else {
                console.log('   当前无持仓');
            }
        } else {
            console.log(`   ❌ 失败: ${positions.msg}`);
        }
    } catch (e) {
        console.log(`   ❌ 错误: ${e.message}`);
    }
    
    console.log('\n✅ OKX API 测试完成');
}

main().catch(console.error);
