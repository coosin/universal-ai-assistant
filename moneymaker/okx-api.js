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
        
        // 设置代理
        if (this.proxy) {
            this.agent = new HttpsProxyAgent(this.proxy, {
                rejectUnauthorized: false,
                timeout: 15000
            });
            console.log(`[OKX] 使用代理: ${this.proxy}`);
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

        // 只用 www.okx.com（aws.okx.com 不稳定）
        const endpoints = ['https://www.okx.com'];
        
        for (const endpoint of endpoints) {
            try {
                const url = endpoint + requestPath;
                const options = {
                    method,
                    headers,
                    agent: this.agent,
                    ...(method !== 'GET' && { body: bodyStr })
                };

                console.log(`[OKX] 请求: ${method} ${url}`);
                const response = await fetch(url, options);
                const data = await response.json();
                return data;
            } catch (error) {
                console.log(`[OKX] 端点 ${endpoint} 失败: ${error.message}`);
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

    // 获取订单信息
    async getOrder(instId, ordId) {
        return this.request('GET', `/api/v5/trade/order?instId=${instId}&ordId=${ordId}`);
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

export default OKXClient;
