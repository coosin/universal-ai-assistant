// Coosin AI 服务变现探索
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxy = 'http://127.0.0.1:7890';
const agent = new HttpsProxyAgent(proxy);
const apiKey = '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';

console.log('🤖 ===== Coosin AI 服务变现探索 =====\n');

// 1. 测试 OpenRouter 调用
async function testOpenRouter() {
    console.log('1️⃣ 测试 OpenRouter API 调用...');
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://localhost',
                'X-Title': 'Coosin AI'
            },
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: '你好，请简短介绍一下你自己' }
                ],
                max_tokens: 100
            }),
            agent
        });

        if (response.ok) {
            const data = await response.json();
            console.log('   ✅ OpenRouter 调用成功!');
            console.log('   响应:', data.choices?.[0]?.message?.content?.substring(0, 50) || 'N/A', '...');
            return true;
        } else {
            console.log(`   ❌ 调用失败: ${response.status}`);
            return false;
        }
    } catch (e) {
        console.log(`   ❌ 调用异常: ${e.message}`);
        return false;
    }
}

// 2. 列出可盈利的 AI 服务方向
function listAIOpportunities() {
    console.log('\n2️⃣ AI 服务变现方向:');
    const opportunities = [
        {
            name: 'AI 编程助手',
            description: '帮人写脚本、自动化工具、调试代码',
            difficulty: '低',
            monetization: '接单平台/私单'
        },
        {
            name: 'API 代理服务',
            description: '封装 OpenRouter 提供 API 服务',
            difficulty: '中',
            monetization: '按量收费/订阅'
        },
        {
            name: '内容创作',
            description: 'AI 写文章、文案、社交媒体内容',
            difficulty: '低',
            monetization: '内容平台/私单'
        },
        {
            name: '智能客服/助手',
            description: '搭建简单的 AI 客服系统',
            difficulty: '中',
            monetization: 'SaaS 订阅'
        }
    ];

    opportunities.forEach((opp, i) => {
        console.log(`   ${i + 1}. ${opp.name}`);
        console.log(`      ${opp.description}`);
        console.log(`      难度: ${opp.difficulty}, 变现: ${opp.monetization}`);
        console.log('');
    });
}

// 3. 推荐快速启动方案
function recommendQuickStart() {
    console.log('3️⃣ 推荐快速启动方案:');
    console.log('   🎯 优先级 1: AI 编程接单（利用已有技能）');
    console.log('      - 在 Fiverr/Upwork/猪八戒接单');
    console.log('      - 写简单的自动化脚本');
    console.log('      - 帮人调试代码问题\n');
    
    console.log('   🎯 优先级 2: 简单 AI API 服务');
    console.log('      - 封装 OpenRouter 成简单 API');
    console.log('      - 提供给有需要的人');
    console.log('      - 收少量费用\n');
}

// 主函数
async function main() {
    const apiWorks = await testOpenRouter();
    
    if (apiWorks) {
        console.log('\n✅ AI API 可用!');
        listAIOpportunities();
        recommendQuickStart();
    } else {
        console.log('\n⚠️ API 测试失败，先集中精力在 OKX 交易上');
    }
    
    console.log('📋 总结: 双管齐下 - OKX 交易 + AI 服务同时进行');
}

main().catch(console.error);
