import fetch from 'node-fetch';

const ALIYUN_API_KEY = 'sk-8dea5bb877b44762a09f05fe152cc237';
const TEST_PROMPT = '你好，测试成功。';

const BAILIAN_MODELS = [
    { id: 'qwen-max', name: '通义千问 Max' },
    { id: 'qwen-plus', name: '通义千问 Plus' },
    { id: 'qwen-turbo', name: '通义千问 Turbo' },
    { id: 'deepseek-v3', name: 'DeepSeek V3 (百炼)' },
    { id: 'deepseek-r1', name: 'DeepSeek R1 (百炼)' }
];

async function testBailian(model) {
    try {
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ALIYUN_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model.id,
                messages: [{ role: 'user', content: TEST_PROMPT }],
                max_tokens: 20
            }),
            timeout: 10000
        });

        if (response.ok) {
            const data = await response.json();
            return {
                id: model.id,
                status: '✅ 可用',
                response: data.choices[0].message.content.trim()
            };
        } else {
            const error = await response.json();
            return { id: model.id, status: '❌ 失败', error: error.message || response.statusText };
        }
    } catch (e) {
        return { id: model.id, status: '❌ 异常', error: e.message };
    }
}

async function main() {
    console.log('🧪 正在测试阿里云百炼 API...');
    for (const model of BAILIAN_MODELS) {
        process.stdout.write(`测试 ${model.name}... `);
        const result = await testBailian(model);
        console.log(result.status + (result.status === '✅ 可用' ? ` (${result.response})` : ` [${result.error}]`));
    }
}

main();
