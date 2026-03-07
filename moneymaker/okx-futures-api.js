import crypto from 'crypto';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// OKX 合约API 封装类
export class OKXFuturesClient {
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
            console.log(`[OKX Futures] 使用代理: ${this.proxy}`);
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
            'Content-Type': 'application/json',
            'x-simulated-trading': '0' // 0实盘 1模拟盘
        };

        const url = this.baseURL + requestPath;
        const options = {
            method,
            headers,
            agent: this.agent,
            ...(method !== 'GET' && { body: bodyStr })
        };

        try {
            console.log(`[OKX Futures] 请求: ${method} ${url}`);
            const response = await fetch(url, options);
            const data = await response.json();
            return data;
        } catch (error) {
            console.log(`[OKX Futures] 请求失败: ${error.message}`);
            throw error;
        }
    }

    // 获取合约行情
    async getTicker(instId) {
        return this.request('GET', `/api/v5/market/ticker?instId=${instId}`);
    }

    // 获取合约持仓
    async getPositions(instId = '') {
        let path = '/api/v5/account/positions?instType=SWAP';
        if (instId) {
            path += `&instId=${instId}`;
        }
        return this.request('GET', path);
    }

    // 设置杠杆倍数
    async setLeverage(instId, lever, mgnMode = 'cross') {
        return this.request('POST', '/api/v5/account/set-leverage', {
            instId,
            lever: lever.toString(),
            mgnMode
        });
    }

    // 合约下单
    async placeOrder(instId, tdMode, side, posSide, ordType, sz, px = '') {
        const body = {
            instId,
            tdMode,
            side,
            posSide,
            ordType,
            sz: sz.toString()
        };
        if (px) {
            body.px = px.toString();
        }
        return this.request('POST', '/api/v5/trade/order', body);
    }

    // 平仓
    async closePosition(instId, mgnMode = 'cross', posSide = 'net') {
        return this.request('POST', '/api/v5/trade/close-position', {
            instId,
            mgnMode,
            posSide
        });
    }

    // 获取账户余额
    async getBalance(ccy = '') {
        let path = '/api/v5/account/balance';
        if (ccy) {
            path += `?ccy=${ccy}`;
        }
        return this.request('GET', path);
    }

    // 获取未成交订单
    async getPendingOrders(instId = '') {
        let path = '/api/v5/trade/orders-pending?instType=SWAP';
        if (instId) {
            path += `&instId=${instId}`;
        }
        return this.request('GET', path);
    }

    // 撤销订单
    async cancelOrder(instId, ordId) {
        return this.request('POST', '/api/v5/trade/cancel-order', {
            instId,
            ordId
        });
    }
}
