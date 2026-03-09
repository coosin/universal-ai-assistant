import crypto from 'crypto';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// OKX API 封装类
export class OKXClient {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.secretKey = config.secretKey;
        this.passphrase = config.passphrase || '';
        this.baseURL = config.baseURL || 'https://www.okx.com';
        this.proxy = config.proxy || 'http://127.0.0.1:7890';
        this.directDomains = []; // 国内节点当前无法直连，全部走代理
        this.proxyDomains = ['www.okx.com', 'aws.okx.com', 'hk.okx.com']; // 所有节点走代理
        
        // 初始化代理agent
        if (this.proxy) {
            this.proxyAgent = new HttpsProxyAgent(this.proxy, {
                rejectUnauthorized: false,
                timeout: 15000,
                keepAlive: true,
                keepAliveMsecs: 30000,
                maxSockets: 10,
                maxFreeSockets: 5
            });
            console.log(`[OKX] 代理已配置: ${this.proxy}，国内节点直连，海外节点走代理`);
        }
    }

    // 生成签名
    sign(timestamp, method, requestPath, body = '') {
        const message = timestamp + method + requestPath + body;
        const hmac = crypto.createHmac('sha256', this.secretKey);
        return hmac.update(message).digest('base64');
    }

    // 发送请求
    async request(method, requestPath, body = {}) {
        const timestamp = new Date().toISOString();
        const bodyStr = Object.keys(body).length > 0 ? JSON.stringify(body) : '';
        
        const signature = this.sign(timestamp, method, requestPath, bodyStr);
        
        const headers = {
            'OK-ACCESS-KEY': this.apiKey,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': this.passphrase,
            'Content-Type': 'application/json'
        };

        // 多端点轮询，基于测速结果优化优先级 (www最快，hk次之，aws最慢)
        const endpoints = ['https://www.okx.com', 'https://www.okx.com', 'https://hk.okx.com', 'https://hk.okx.com', 'https://aws.okx.com'];
        
        for (const endpoint of endpoints) {
            try {
                const url = endpoint + requestPath;
                // 智能选择agent：国内节点直连，海外节点走代理
                const useProxy = this.proxyDomains.some(domain => endpoint.includes(domain));
                const agent = useProxy ? this.proxyAgent : undefined;
                
                const options = {
                    method,
                    headers,
                    agent,
                    timeout: 10000, // 10秒超时
                    ...(method !== 'GET' && { body: bodyStr })
                };

                const mode = useProxy ? '代理' : '直连';
                console.log(`[OKX] 请求: ${method} ${url} (${mode})`);
                const response = await fetch(url, options);
                
                // 检查HTTP状态码
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    return data;
                } catch (e) {
                    throw new Error(`JSON解析失败: ${text.substring(0, 100)}...`);
                }
            } catch (error) {
                console.log(`[OKX] 端点 ${endpoint} 失败: ${error.message}`);
                // 失败后等待1秒再试下一个端点
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
        }
        
        throw new Error('所有 API 端点均不可用');
    }

    // 获取账户余额
    async getBalance(ccy = '') {
        let path = '/api/v5/account/balance';
        if (ccy) {
            path += `?ccy=${ccy}`;
        }
        return this.request('GET', path);
    }

    // 获取市场行情
    async getTicker(instId) {
        return this.request('GET', `/api/v5/market/ticker?instId=${instId}`);
    }

    // 获取K线数据
    async getCandles(instId, bar = '1m', limit = 100) {
        return this.request('GET', `/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`);
    }

    // 下单
    async placeOrder(instId, tdMode, side, ordType, sz, px = '') {
        const body = {
            instId,
            tdMode,
            side,
            ordType,
            sz
        };
        if (px) {
            body.px = px;
        }
        return this.request('POST', '/api/v5/trade/order', body);
    }

    // 获取持仓
    async getPositions(instId = '') {
        let path = '/api/v5/account/positions';
        if (instId) {
            path += `?instId=${instId}`;
        }
        return this.request('GET', path);
    }
}
