import crypto from 'crypto';

// 多模型代理层 - 自动切换备用模型，避免限流
class MultiModelProxy {
    constructor() {
        // 模型优先级列表，按优先级排序
        this.models = [
            {
                id: 'ark/ark-code-latest',
                name: 'Ark Code Lateset',
                priority: 1,
                status: 'available',
                lastUsed: 0,
                usageCount: 0,
                limitReached: false
            },
            {
                id: 'cliproxy/claude-opus-4-1-20250805',
                name: 'Claude Opus',
                priority: 2,
                status: 'available',
                lastUsed: 0,
                usageCount: 0,
                limitReached: false
            },
            {
                id: 'cliproxy/gemini-3-pro',
                name: 'Gemini 3 Pro',
                priority: 3,
                status: 'available',
                lastUsed: 0,
                usageCount: 0,
                limitReached: false
            },
            {
                id: 'cliproxy/ds-v3',
                name: 'DeepSeek V3',
                priority: 4,
                status: 'available',
                lastUsed: 0,
                usageCount: 0,
                limitReached: false
            }
        ];
        
        this.rateLimits = {
            'ark/ark-code-latest': {
                requestsPerMinute: 60,
                tokensPerMinute: 100000
            },
            'default': {
                requestsPerMinute: 30,
                tokensPerMinute: 50000
            }
        };
        
        this.usage = new Map();
        this.fallbackThreshold = 3; // 失败3次自动降级
    }

    // 获取最优可用模型
    getBestModel() {
        // 先按优先级排序，过滤掉不可用的模型
        const availableModels = this.models
            .filter(m => m.status === 'available' && !m.limitReached)
            .sort((a, b) => a.priority - b.priority);
        
        if (availableModels.length === 0) {
            throw new Error('没有可用的模型');
        }
        
        // 选择最近最少使用的模型，避免单个模型被限流
        return availableModels.reduce((best, current) => {
            return current.lastUsed < best.lastUsed ? current : best;
        });
    }

    // 记录模型使用情况
    recordUsage(modelId, tokensUsed = 0) {
        const model = this.models.find(m => m.id === modelId);
        if (model) {
            model.lastUsed = Date.now();
            model.usageCount++;
            
            // 记录限流数据
            const now = Date.now();
            const minuteKey = Math.floor(now / 60000);
            
            if (!this.usage.has(modelId)) {
                this.usage.set(modelId, new Map());
            }
            
            const modelUsage = this.usage.get(modelId);
            if (!modelUsage.has(minuteKey)) {
                modelUsage.set(minuteKey, { requests: 0, tokens: 0 });
            }
            
            const minuteUsage = modelUsage.get(minuteKey);
            minuteUsage.requests++;
            minuteUsage.tokens += tokensUsed;
            
            // 检查是否达到限流
            const limits = this.rateLimits[modelId] || this.rateLimits.default;
            if (minuteUsage.requests >= limits.requestsPerMinute || 
                minuteUsage.tokens >= limits.tokensPerMinute) {
                model.limitReached = true;
                console.log(`⚠️ 模型 ${model.name} 达到限流阈值，暂时禁用`);
                
                // 1分钟后自动解禁
                setTimeout(() => {
                    model.limitReached = false;
                    console.log(`✅ 模型 ${model.name} 限流解除，恢复可用`);
                }, 60000);
            }
        }
    }

    // 标记模型失败
    markModelFailed(modelId) {
        const model = this.models.find(m => m.id === modelId);
        if (model) {
            model.failCount = (model.failCount || 0) + 1;
            console.log(`⚠️ 模型 ${model.name} 请求失败，失败次数: ${model.failCount}`);
            
            // 失败次数达到阈值，暂时禁用
            if (model.failCount >= this.fallbackThreshold) {
                model.status = 'unavailable';
                console.log(`❌ 模型 ${model.name} 失败次数过多，暂时禁用，10分钟后自动恢复`);
                
                // 10分钟后自动恢复
                setTimeout(() => {
                    model.status = 'available';
                    model.failCount = 0;
                    console.log(`✅ 模型 ${model.name} 恢复可用`);
                }, 10 * 60 * 1000);
            }
        }
    }

    // 标记模型成功
    markModelSuccess(modelId) {
        const model = this.models.find(m => m.id === modelId);
        if (model) {
            model.failCount = 0;
        }
    }

    // 生成模型状态报告
    getStatusReport() {
        return this.models.map(m => ({
            name: m.name,
            status: m.status,
            priority: m.priority,
            usageCount: m.usageCount,
            limitReached: m.limitReached,
            failCount: m.failCount || 0
        }));
    }
}

// 全局单例
export const modelProxy = new MultiModelProxy();

// 使用示例
/*
async function callModel(prompt) {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        const model = modelProxy.getBestModel();
        try {
            console.log(`使用模型: ${model.name}`);
            // 调用模型API的逻辑
            // const response = await callModelAPI(model.id, prompt);
            modelProxy.markModelSuccess(model.id);
            modelProxy.recordUsage(model.id, response.usage.total_tokens);
            return response;
        } catch (error) {
            console.log(`模型 ${model.name} 调用失败: ${error.message}`);
            modelProxy.markModelFailed(model.id);
            if (i === maxRetries - 1) {
                throw new Error('所有模型都调用失败');
            }
            // 等待1秒重试
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
*/
