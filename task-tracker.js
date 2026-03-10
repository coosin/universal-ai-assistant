// 任务跟踪系统 - CEO总负责制
// 自动跟踪所有任务进度、告警、汇报
import fs from 'fs';
import path from 'path';

class TaskTracker {
    constructor() {
        this.tasksFile = path.join(__dirname, 'tasks.json');
        this.loadTasks();
        this.startMonitoring();
    }

    // 加载任务数据
    loadTasks() {
        try {
            if (fs.existsSync(this.tasksFile)) {
                this.tasks = JSON.parse(fs.readFileSync(this.tasksFile, 'utf8'));
            } else {
                this.tasks = {
                    nextId: 1,
                    tasks: []
                };
                this.saveTasks();
            }
        } catch (error) {
            console.error('加载任务数据失败:', error.message);
            this.tasks = { nextId: 1, tasks: [] };
        }
    }

    // 保存任务数据
    saveTasks() {
        fs.writeFileSync(this.tasksFile, JSON.stringify(this.tasks, null, 2));
    }

    // 创建新任务
    createTask(taskData) {
        const taskId = `T${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(this.tasks.nextId).padStart(3, '0')}`;
        
        const task = {
            id: taskId,
            title: taskData.title,
            description: taskData.description || '',
            priority: taskData.priority || 'P2',
            department: taskData.department,
            assignee: taskData.assignee,
            createdAt: new Date().toISOString(),
            deadline: taskData.deadline,
            status: 'pending', // pending, in_progress, completed, blocked, cancelled
            progress: 0,
            updateHistory: [],
            remarks: taskData.remarks || ''
        };

        this.tasks.tasks.push(task);
        this.tasks.nextId++;
        this.saveTasks();

        console.log(`✅ 新任务创建: ${taskId} - ${task.title}`);
        return taskId;
    }

    // 更新任务进度
    updateTaskProgress(taskId, progress, status = 'in_progress', remarks = '') {
        const task = this.tasks.tasks.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`任务不存在: ${taskId}`);
        }

        task.progress = Math.min(100, Math.max(0, progress));
        task.status = status;
        
        if (progress >= 100) {
            task.status = 'completed';
            task.completedAt = new Date().toISOString();
        }

        task.updateHistory.push({
            timestamp: new Date().toISOString(),
            progress: task.progress,
            status: task.status,
            remarks
        });

        this.saveTasks();

        // 检查是否需要告警
        this.checkTaskAlert(task);
        
        return task;
    }

    // 阻塞任务
    blockTask(taskId, reason) {
        return this.updateTaskProgress(taskId, task.progress, 'blocked', `阻塞原因: ${reason}`);
    }

    // 取消任务
    cancelTask(taskId, reason) {
        const task = this.tasks.tasks.find(t => t.id === taskId);
        if (!task) throw new Error(`任务不存在: ${taskId}`);
        
        task.status = 'cancelled';
        task.remarks += `\n取消原因: ${reason}`;
        this.saveTasks();
        
        return task;
    }

    // 检查任务告警
    checkTaskAlert(task) {
        const now = new Date();
        const deadline = new Date(task.deadline);
        const timeLeft = deadline - now;
        const hoursLeft = timeLeft / (1000 * 60 * 60);

        // 高优先级任务告警
        if (task.priority === 'P0' || task.priority === 'P1') {
            // 剩余时间不足20%且进度低于80%
            const totalTime = deadline - new Date(task.createdAt);
            const timeUsedRatio = 1 - timeLeft / totalTime;
            
            if (timeUsedRatio > 0.8 && task.progress < 0.8) {
                console.log(`⚠️ [任务告警] 任务 ${task.id} 进度落后: 已用时间 ${(timeUsedRatio*100).toFixed(0)}%, 完成度 ${task.progress}%`);
                // 发送告警到交互模块
                this.sendAlert(`任务进度落后: ${task.title}`, `任务ID: ${task.id}\n当前进度: ${task.progress}%\n截止时间: ${task.deadline}\n请加快进度`);
            }

            // 距离截止时间不足24小时
            if (hoursLeft < 24 && task.progress < 100) {
                console.log(`⚠️ [任务告警] 任务 ${task.id} 即将到期，剩余 ${hoursLeft.toFixed(1)} 小时，当前进度 ${task.progress}%`);
            }
        }

        // 任务完成通知
        if (task.status === 'completed') {
            console.log(`✅ [任务完成] ${task.id} - ${task.title}`);
            if (task.priority === 'P0' || task.priority === 'P1') {
                this.sendAlert(`任务完成: ${task.title}`, `任务ID: ${task.id}\n完成时间: ${new Date().toLocaleString()}\n进度: 100%`);
            }
        }
    }

    // 发送告警
    sendAlert(title, content) {
        // 告警逻辑：写入日志，后续可扩展为消息通知
        const logMessage = `[${new Date().toLocaleString()}] ALERT: ${title}\n${content}\n`;
        fs.appendFileSync(path.join(__dirname, 'task-alerts.log'), logMessage);
    }

    // 获取任务列表
    getTasks(filter = {}) {
        let filtered = [...this.tasks.tasks];
        
        if (filter.priority) {
            filtered = filtered.filter(t => t.priority === filter.priority);
        }
        if (filter.status) {
            filtered = filtered.filter(t => t.status === filter.status);
        }
        if (filter.department) {
            filtered = filtered.filter(t => t.department === filter.department);
        }
        
        return filtered.sort((a, b) => {
            const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    // 生成任务报表
    generateReport(type = 'daily') {
        const now = new Date();
        let startDate;
        
        switch(type) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(0);
        }

        const periodTasks = this.tasks.tasks.filter(t => new Date(t.createdAt) >= startDate);
        const completed = periodTasks.filter(t => t.status === 'completed').length;
        const inProgress = periodTasks.filter(t => t.status === 'in_progress').length;
        const blocked = periodTasks.filter(t => t.status === 'blocked').length;
        const total = periodTasks.length;
        const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

        const report = {
            period: type,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            statistics: {
                totalTasks: total,
                completed: completed,
                inProgress: inProgress,
                blocked: blocked,
                completionRate: `${completionRate}%`
            },
            priorityBreakdown: {
                P0: periodTasks.filter(t => t.priority === 'P0').length,
                P1: periodTasks.filter(t => t.priority === 'P1').length,
                P2: periodTasks.filter(t => t.priority === 'P2').length,
                P3: periodTasks.filter(t => t.priority === 'P3').length
            },
            recentTasks: periodTasks.slice(-10).map(t => ({
                id: t.id,
                title: t.title,
                priority: t.priority,
                status: t.status,
                progress: t.progress,
                deadline: t.deadline
            }))
        };

        return report;
    }

    // 启动监控循环
    startMonitoring() {
        setInterval(() => {
            // 每小时检查所有任务
            this.tasks.tasks.forEach(task => {
                if (task.status !== 'completed' && task.status !== 'cancelled') {
                    this.checkTaskAlert(task);
                }
            });
        }, 60 * 60 * 1000); // 每小时执行一次

        console.log('🚀 任务跟踪系统已启动');
    }
}

// 导出单例
export const taskTracker = new TaskTracker();

// 初始化默认任务
const defaultTasks = [
    {
        title: '交易机器人V3实盘运行，监控SOL/DOGE行情',
        description: '7×24小时实时监控行情，自动执行交易策略',
        priority: 'P1',
        department: '交易运营部',
        assignee: '交易机器人V3',
        deadline: '2026-12-31',
        progress: 100,
        status: 'in_progress'
    },
    {
        title: '完成回测引擎V2开发与策略验证',
        description: '验证5套策略历史收益率与风险指标',
        priority: 'P1',
        department: '技术研发部',
        assignee: '研发工程师',
        deadline: '2026-03-12',
        progress: 60
    },
    {
        title: '新仓库universal-ai-assistant-pro初始化',
        description: '代码同步、配置迁移、环境搭建',
        priority: 'P1',
        department: '技术研发部',
        assignee: '研发工程师',
        deadline: '2026-03-11',
        progress: 90
    },
    {
        title: '每日生成交易报告',
        description: '统计当日盈亏、策略表现、交易明细',
        priority: 'P1',
        department: '交易运营部',
        assignee: '数据管理员',
        deadline: '2026-12-31',
        progress: 100,
        status: 'in_progress'
    }
];

// 导入默认任务（如果为空）
if (taskTracker.tasks.tasks.length === 0) {
    defaultTasks.forEach(task => taskTracker.createTask(task));
}
