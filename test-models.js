import fetch from 'node-fetch';
import fs from 'fs';

const OPENROUTER_API_KEY = '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';
const TEST_PROMPT = 'Hello, respond with "OK" if you receive this message.';

const MODELS_TO_TEST = [
    // OpenAI 系列
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    
    // Anthropic 系列
    { id: 'anthropic/claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'anthropic/claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'anthropic/claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    
    // Google 系列
    { id: 'google/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro' },
    { id: 'google/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash' },
    
    // 开源系列
    { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },
    { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B' },
    { id: 'mistralai/mistral-large-2', name: 'Mistral Large' },
    { id: 'qwen/qwen-2-72b-instruct', name: 'Qwen 2 72B' },
    { id: '01-ai/yi-large', name: 'Yi Large' },
    { id: 'deepseek/deepseek-v2', name: 'DeepSeek V2' }
];

async function testModel(model) {
    try {
        const startTime = Date.now();
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://coosin.ai',
                'X-Title': 'Coosin AI'
            },
            body: JSON.stringify({
                model: model.id,
                messages: [
                    { role: 'user', content: TEST_PROMPT }
                ],
                max_tokens: 10,
                temperature: 0
            }),
            timeout: 10000
        });

        const latency = Date.now() - startTime;
        
        if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content.trim();
            return {
                ...model,
                status: '✅ 可用',
                latency: `${latency}ms`,
                response: content
            };
        } else {
            const error = await response.json();
            return {
                ...model,
                status: '❌ 不可用',
                error: error.error?.message || `HTTP ${response.status}`
            };
        }
    } catch (error) {
        return {
            ...model,
            status: '❌ 不可用',
            error: error.message
        };
    }
}

async function main() {
    console.log('🧪 开始测试 OpenRouter 模型连通性...\n');
    console.log(`共 ${MODELS_TO_TEST.length} 个模型待测试\n`);

    const results = [];
    for (const model of MODELS_TO_TEST) {
        process.stdout.write(`测试 ${model.name}... `);
        const result = await testModel(model);
        process.stdout.write(`${result.status}\n`);
        results.push(result);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 测试结果汇总:');
    console.log('='.repeat(80));
    
    const available = results.filter(r => r.status === '✅ 可用');
    const unavailable = results.filter(r => r.status === '❌ 不可用');
    
    console.log(`\n✅ 可用模型 (${available.length} 个):`);
    available.forEach(r => {
        console.log(`  - ${r.name} (${r.id}) | 延迟: ${r.latency}`);
    });
    
    console.log(`\n❌ 不可用模型 (${unavailable.length} 个):`);
    unavailable.forEach(r => {
        console.log(`  - ${r.name} (${r.id}) | 原因: ${r.error}`);
    });

    // 保存可用模型列表
    const availableModels = available.map(r => ({
        id: r.id,
        name: r.name,
        latency: r.latency
    }));
    
    fs.writeFileSync('./available-models.json', JSON.stringify(availableModels, null, 2));
    console.log(`\n💾 可用模型列表已保存到 available-models.json`);
    
    console.log(`\n🎯 测试完成，共 ${available.length} 个模型可用。`);
}

main().catch(console.error);
