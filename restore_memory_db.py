import sqlite3
import os

# 数据库路径
DB_PATH = 'memory.db'

# 先删除空的损坏数据库
if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) == 0:
    os.unlink(DB_PATH)
    print(f"✅ 已删除损坏的空数据库文件 {DB_PATH}")

# 创建新的数据库连接
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# 创建表结构
cur.execute('''
CREATE TABLE IF NOT EXISTS core_directives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    api_key TEXT,
    secret_key TEXT,
    extra TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    title TEXT,
    content TEXT
)
''')

# 导入核心指令
core_content = """# 核心指令集（2026-03-06）
- **身份**：集团 CEO，最高管理者与决策者，仅对创始人（主人）负责。
- **工作原则**：只看结果，不纠结过程，交付结果即是唯一标准。
- **核心目标**：尽快实现盈利，覆盖生活开支与还贷需求；利用 OKX 交易账户搭建并优化交易系统，实现稳定盈利；维护华为旧笔记本上的核心系统，打造自主智能 AI 中心。
- **紧急任务**：
  1. 优化网关与网络稳定性，解决掉线、挂机问题。
  2. 完善自动备份与恢复机制，保障系统安全可靠。
- **工作要求**：主动规划、主动挖掘商机、持续系统迭代。
- **生活定位**：朋友/生活助理，以“能切实解决问题”为核心。
"""
cur.execute('INSERT INTO core_directives (title, content) VALUES (?, ?)', ('核心指令集', core_content))

# 导入资产信息
cur.execute('INSERT INTO assets (name, api_key, secret_key, extra) VALUES (?, ?, ?, ?)', (
    'OKX',
    'ea9e4fa7-f70a-4e28-bd2a-527e00b29310',
    'F442082212DFEB9AB06385C897B9D3E9',
    'Passphrase: Cool+095136'
))

# 导入所有日志文件
memory_files = [
    ('2026-02-18.md', '2026-02-18'),
    ('2026-02-19.md', '2026-02-19'),
    ('2026-03-06.md', '2026-03-06'),
    ('REPORT-2026-03-07.md', '2026-03-07'),
    ('work-plan.md', '2026-03-08')
]

for filename, date in memory_files:
    filepath = f'memory/{filename}'
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            title = content.split('\n')[0].strip('# ') if content else '无标题'
            cur.execute('INSERT INTO logs (date, title, content) VALUES (?, ?, ?)', (date, title, content))
            print(f"✅ 已导入日志 [{date}] {title}")

# 先提交数据写入
conn.commit()

# 执行安全升级配置
cur.execute('PRAGMA journal_mode = WAL;')
cur.execute('PRAGMA synchronous = FULL;')
cur.execute('PRAGMA temp_store = MEMORY;')
cur.execute('PRAGMA cache_size = -10000;')
cur.execute('VACUUM;')

conn.close()

print(f"\n✅ 数据库重建完成，大小：{os.path.getsize(DB_PATH) // 1024} KB")
print("✅ 所有记忆已恢复，身份已加载完成")
