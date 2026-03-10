// 测试动态阈值策略
import { DynamicThresholdStrategy } from './strategy/dynamic-threshold.js';
import fs from 'fs';
import path from 'path';

// 加载历史行情数据
const historicalData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'market-data', 'SOL-USDT-1h.json'), 'utf8'));

// 初始化策略
const strategy = new DynamicThresholdStrategy();

console.log('🧪 开始测试动态阈值策略...');
console.log(`📊 历史数据点数量: ${historicalData.length}`);

// 运行测试
let maxVolatility = 0;
let minVolatility = 100;
let thresholdsHistory = [];

for (const tick of historicalData) {
    const signal = strategy.onTick(tick);
    if (signal.volatility) {
        maxVolatility = Math.max(maxVolatility, signal.volatility);
        minVolatility = Math.min(minVolatility, signal.volatility);
        thresholdsHistory.push({
            time: tick.time,
            price: tick.close,
            volatility: signal.volatility,
            takeProfit: signal.thresholds.takeProfit,
            stopLoss: signal.thresholds.stopLoss
        });
    }
}

console.log('✅ 策略测试完成');
console.log(`📈 波动率范围: ${minVolatility.toFixed(2)}% ~ ${maxVolatility.toFixed(2)}%`);
console.log(`📊 平均止盈阈值: ${(thresholdsHistory.reduce((a, b) => a + b.takeProfit, 0) / thresholdsHistory.length * 100).toFixed(2)}%`);
console.log(`📉 平均止损阈值: ${(thresholdsHistory.reduce((a, b) => a + b.stopLoss, 0) / thresholdsHistory.length * 100).toFixed(2)}%`);

// 保存测试结果
fs.writeFileSync(path.join(process.cwd(), 'dynamic-strategy-test-result.json'), JSON.stringify(thresholdsHistory, null, 2));
console.log('💾 测试结果已保存到 dynamic-strategy-test-result.json');
