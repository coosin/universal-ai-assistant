// 多线程并行执行框架
// 实现对话交互、后台监控、系统开发三模块独立运行，互不干扰
import cluster from 'cluster';
import os from 'os';

const NUM_WORKERS = os.cpus().length;

// 模块类型定义
const MODULE_TYPES = {
    INTERACTION: 'interaction',    // 对话交互模块（最高优先级）
    MONITORING: 'monitoring',      // 后台监控模块
    DEVELOPMENT: 'development'     // 系统开发模块
};

// 模块配置
const MODULE_CONFIG = {
    [MODULE_TYPES.INTERACTION]: {
        priority: 'highest',
        cpuLimit: 0.3, // 最多使用30% CPU资源
        memoryLimit: '512m',
        entry: '/home/cool/.openclaw/workspace/interaction-worker.js'
    },
    [MODULE_TYPES.MONITORING]: {
        priority: 'high',
        cpuLimit: 0.2,
        memoryLimit: '256m',
        entry: '/home/cool/.openclaw/workspace/monitoring-worker.js'
    },
    [MODULE_TYPES.DEVELOPMENT]: {
        priority: 'normal',
        cpuLimit: 0.4,
        memoryLimit: '1g',
        entry: '/home/cool/.openclaw/workspace/development-worker.js'
    }
};

class MultiThreadingFramework {
    constructor() {
        this.workers = new Map();
        this.messageQueue = [];
        this.running = false;
    }

    // 启动整个框架
    start() {
        if (cluster.isPrimary) {
            console.log('🚀 多线程执行框架启动，主进程 PID:', process.pid);
            this.running = true;
            
            // 启动所有工作模块
            for (const moduleType of Object.values(MODULE_TYPES)) {
                this.spawnWorker(moduleType);
            }

            // 监控工作进程
            cluster.on('exit', (worker, code, signal) => {
                console.log(`⚠️ 工作进程 ${worker.process.pid} 退出，代码: ${code}, 信号: ${signal}`);
                const moduleType = worker.process.env.MODULE_TYPE;
                // 自动重启异常退出的进程
                if (code !== 0 && this.running) {
                    console.log(`🔄 自动重启模块: ${moduleType}`);
                    setTimeout(() => this.spawnWorker(moduleType), 1000);
                }
            });

            // 处理进程信号
            process.on('SIGINT', () => this.stop());
            process.on('SIGTERM', () => this.stop());

        } else {
            // 工作进程执行对应模块
            const moduleType = process.env.MODULE_TYPE;
            this.runWorkerModule(moduleType);
        }
    }

    // 启动工作进程
    spawnWorker(moduleType) {
        const config = MODULE_CONFIG[moduleType];
        const worker = cluster.fork({
            MODULE_TYPE: moduleType,
            NODE_OPTIONS: `--max-old-space-size=${config.memoryLimit.replace('m', '')}`
        });
        
        worker.moduleType = moduleType;
        worker.startTime = Date.now();
        this.workers.set(worker.id, worker);

        // 消息处理
        worker.on('message', (message) => {
            this.handleWorkerMessage(worker, message);
        });

        console.log(`✅ 模块 ${moduleType} 启动，进程 PID: ${worker.process.pid}`);
        return worker;
    }

    // 运行工作模块
    runWorkerModule(moduleType) {
        const config = MODULE_CONFIG[moduleType];
        console.log(`📦 工作进程 ${process.pid} 加载模块: ${moduleType}`);
        
        // 动态加载对应模块
        try {
            const module = require(config.entry);
            module.start();
        } catch (error) {
            console.error(`❌ 模块 ${moduleType} 加载失败:`, error.message);
            process.exit(1);
        }
    }

    // 处理工作进程消息
    handleWorkerMessage(worker, message) {
        const { type, data } = message;
        
        switch (type) {
            case 'task_complete':
                console.log(`✅ 模块 ${worker.moduleType} 完成任务: ${data.taskId}`);
                break;
            case 'alert':
                console.log(`⚠️ [告警] 模块 ${worker.moduleType}: ${data.message}`);
                // 高优先级告警转发到交互模块
                if (data.level === 'critical') {
                    this.sendMessageToModule(MODULE_TYPES.INTERACTION, {
                        type: 'critical_alert',
                        data: data
                    });
                }
                break;
            case 'user_request':
                // 用户请求转发到对应模块处理
                this.sendMessageToModule(data.targetModule, {
                    type: 'user_request',
                    data: data.payload
                });
                break;
            default:
                // 放入消息队列
                this.messageQueue.push({
                    from: worker.moduleType,
                    type: type,
                    data: data,
                    timestamp: Date.now()
                });
        }
    }

    // 发送消息到指定模块
    sendMessageToModule(moduleType, message) {
        for (const worker of this.workers.values()) {
            if (worker.moduleType === moduleType) {
                worker.send(message);
                return true;
            }
        }
        console.error(`❌ 未找到目标模块: ${moduleType}`);
        return false;
    }

    // 广播消息到所有模块
    broadcastMessage(message) {
        for (const worker of this.workers.values()) {
            worker.send(message);
        }
    }

    // 获取系统状态
    getStatus() {
        const status = {
            mainProcess: process.pid,
            uptime: process.uptime(),
            workers: [],
            messageQueueLength: this.messageQueue.length
        };

        for (const worker of this.workers.values()) {
            status.workers.push({
                id: worker.id,
                pid: worker.process.pid,
                moduleType: worker.moduleType,
                startTime: worker.startTime,
                uptime: Date.now() - worker.startTime
            });
        }

        return status;
    }

    // 停止框架
    stop() {
        console.log('🛑 正在停止多线程执行框架...');
        this.running = false;

        // 优雅关闭所有工作进程
        for (const worker of this.workers.values()) {
            worker.send({ type: 'shutdown' });
            setTimeout(() => {
                if (!worker.isDead()) {
                    worker.kill('SIGTERM');
                }
            }, 5000);
        }

        setTimeout(() => {
            console.log('✅ 多线程执行框架已停止');
            process.exit(0);
        }, 6000);
    }
}

// 导出框架实例
export const multiThreadingFramework = new MultiThreadingFramework();

// 自动启动（如果是主进程）
if (require.main === module) {
    multiThreadingFramework.start();
}
