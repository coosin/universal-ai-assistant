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

class Dashboard {
    constructor() {
        this.client = new OKXClient(config);
    }

    async generate() {
        console.log('📊 生成交易系统状态看板...\n');
        
        const data = {
            timestamp: new Date().toLocaleString('zh-CN'),
            account: await this.getAccountData(),
            positions: await this.getPositionData(),
            market: await this.getMarketData(),
            system: await this.getSystemStatus()
        };

        // 打印看板
        console.log('='.repeat(60));
        console.log('🚀 Coosin 交易系统状态看板');
        console.log('='.repeat(60));
        console.log(`⏰ 生成时间: ${data.timestamp}`);
        console.log('');

        // 账户信息
        console.log('💼 账户信息:');
        console.log(`   总权益: ${data.account.totalEquity.toFixed(4)} USDT`);
        console.log(`   可用余额: ${data.account.available.toFixed(4)} USDT`);
        console.log(`   未实现盈亏: ${data.account.unrealizedPnL.toFixed(4)} USDT`);
        console.log(`   今日盈亏: ${data.account.dailyPnL >= 0 ? '+' : ''}${data.account.dailyPnL.toFixed(2)}%`);
        console.log('');

        // 持仓信息
        console.log('📈 当前持仓:');
        if (data.positions.length === 0) {
            console.log('   无持仓');
        } else {
            data.positions.forEach(pos => {
                console.log(`   - ${pos.symbol} ${pos.side}: ${pos.size} @ ${pos.avgPx}`);
                console.log(`     盈亏: ${pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} USDT (${pos.pnlRatio >= 0 ? '+' : ''}${pos.pnlRatio.toFixed(2)}%)`);
                console.log(`     保证金率: ${pos.marginRatio.toFixed(2)}%, 强平价: ${pos.liqPx}`);
            });
        }
        console.log('');

        // 行情信息
        console.log('📊 市场行情:');
        data.market.forEach(item => {
            console.log(`   ${item.symbol}: ${item.price} | 24h涨跌: ${item.change24h >= 0 ? '+' : ''}${item.change24h.toFixed(2)}% | 波动率: ${item.volatility.toFixed(2)}%`);
        });
        console.log('');

        // 系统状态
        console.log('⚙️ 系统状态:');
        console.log(`   行情监控: ${data.system.marketMonitor ? '✅ 运行中' : '❌ 未运行'}`);
        console.log(`   风控系统: ${data.system.riskMonitor ? '✅ 运行中' : '❌ 未运行'}`);
        console.log(`   交易策略: ${data.system.tradingStrategy ? '✅ 运行中' : '❌ 未运行'}`);
        console.log(`   网络延迟: ${data.system.network?.latency || 'N/A'}ms`);
        console.log('');
        console.log('='.repeat(60));

        // 保存到文件
        fs.writeFileSync(path.join(__dirname, 'dashboard.json'), JSON.stringify(data, null, 2));
        return data;
    }

    async getAccountData() {
        try {
            const res = await this.client.getBalance('USDT');
            if (res.code === '0' && res.data.length > 0) {
                const details = res.data[0].details.find(d => d.ccy === 'USDT');
                return {
                    totalEquity: parseFloat(res.data[0].totalEq),
                    available: parseFloat(details.availBal),
                    unrealizedPnL: parseFloat(res.data[0].upl || 0),
                    dailyPnL: ((parseFloat(res.data[0].totalEq) - 36) / 36) * 100 // 初始余额36USDT
                };
            }
        } catch (e) {}
        return { totalEquity: 0, available: 0, unrealizedPnL: 0, dailyPnL: 0 };
    }

    async getPositionData() {
        try {
            const res = await this.client.getPositions();
            if (res.code === '0') {
                return res.data
                    .filter(p => parseFloat(p.pos) > 0)
                    .map(p => ({
                        symbol: p.instId,
                        side: p.posSide || p.side, // 优先取posSide，区分多空方向
                        size: parseFloat(p.pos),
                        avgPx: parseFloat(p.avgPx),
                        pnl: parseFloat(p.upl),
                        pnlRatio: (parseFloat(p.upl) / (parseFloat(p.margin) || 1)) * 100,
                        marginRatio: parseFloat(p.mgnRatio) * 100,
                        liqPx: parseFloat(p.liqPx)
                    }));
            }
        } catch (e) {}
        return [];
    }

    async getMarketData() {
        const symbols = ['BTC-USDT-SWAP', 'ETH-USDT-SWAP', 'SOL-USDT-SWAP'];
        const data = [];
        for (const symbol of symbols) {
            try {
                const ticker = await this.client.getTicker(symbol);
                if (ticker.code === '0' && ticker.data.length > 0) {
                    const d = ticker.data[0];
                    const change = parseFloat(d.change24h || ((d.last - d.open24h) / d.open24h) * 100);
                    const volatility = ((parseFloat(d.high24h) - parseFloat(d.low24h)) / parseFloat(d.low24h)) * 100;
                    data.push({
                        symbol: symbol.split('-')[0],
                        price: parseFloat(d.last),
                        change24h: change,
                        volatility: volatility
                    });
                }
            } catch (e) {}
        }
        return data;
    }

    async getSystemStatus() {
        // 检查进程状态
        let marketMonitor = false, riskMonitor = false, tradingStrategy = false;
        try {
            const { execSync } = await import('child_process');
            const processes = execSync('ps aux | grep -E "(market-monitor|position-monitor|trading-strategy)" | grep -v grep').toString();
            marketMonitor = processes.includes('market-monitor');
            riskMonitor = processes.includes('position-monitor');
            tradingStrategy = processes.includes('trading-strategy');
        } catch (e) {}

        // 测试网络延迟
        let latency = 0;
        try {
            const start = Date.now();
            await this.client.request('GET', '/api/v5/public/time');
            latency = Date.now() - start;
        } catch (e) {}

        return {
            marketMonitor,
            riskMonitor,
            tradingStrategy,
            network: { latency }
        };
    }
}

// 直接运行生成看板
if (process.argv[1] === __filename) {
    const dashboard = new Dashboard();
    dashboard.generate().catch(console.error);
}

export { Dashboard };
