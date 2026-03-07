// Coosin 交易系统 - 完整演示

import CoosinTradingSystem from './index.js';

console.log('🚀 ====================================');
console.log('   Coosin 交易系统 - 演示');
console.log('   ====================================\n');

// 初始化交易系统
const system = new CoosinTradingSystem({
    initialCapital: 10000,
    okx: {
        apiKey: 'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
        secretKey: 'F442082212DFEB9AB06385C897B9D3E9',
        passphrase: 'cool+095136',
        baseURL: 'https://www.okx.com'
    },
    risk: {
        maxPositionPercent: 0.3,
        maxDailyLossPercent: 0.05,
        stopLossPercent: 0.02,
        takeProfitPercent: 0.05
    }
});

// 注册策略
system.registerBuiltinStrategies();

// 运行回测演示
(async () => {
    try {
        // 测试1: 均线交叉策略
        console.log('\n📊 ===== 演示1: 均线交叉策略回测 =====');
        await system.runBacktest('ma-cross', {
            shortPeriod: 5,
            longPeriod: 20
        }, 10000);

        console.log('\n✅ ===== 演示完成 =====');
        console.log('\n📁 系统文件结构:');
        console.log('   moneymaker/');
        console.log('   ├── index.js           # 主入口');
        console.log('   ├── strategy-engine.js # 策略引擎');
        console.log('   ├── backtest-engine.js # 回测框架');
        console.log('   ├── risk-manager.js    # 风控模块');
        console.log('   ├── okx-api.js         # OKX API 封装');
        console.log('   ├── demo.js            # 演示脚本');
        console.log('   ├── backup-system.sh   # 备份脚本');
        console.log('   └── monitor-gateway.sh # 监控脚本');
        
        console.log('\n🎯 下一步:');
        console.log('   1. 解决网络连接问题');
        console.log('   2. 获取真实历史数据');
        console.log('   3. 策略优化与参数调优');
        console.log('   4. 实盘模拟验证');
        console.log('   5. 小资金实盘运行\n');
        
    } catch (error) {
        console.error('❌ 演示出错:', error);
    }
})();
