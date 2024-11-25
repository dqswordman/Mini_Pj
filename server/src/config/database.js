const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 初始化 Oracle 客户端
try {
    // 请根据你的实际安装路径修改
    oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });
} catch (err) {
    console.error('Oracle 客户端初始化失败：', err);
    process.exit(1);
}

// 数据库配置
const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTSTRING,
    connectionClass: 'thick'  // 显式使用 thick 模式
};

// 获取数据库连接
async function getConnection() {
    try {
        console.log('正在尝试连接数据库...');
        const connection = await oracledb.getConnection(dbConfig);
        console.log('数据库连接成功建立');
        return connection;
    } catch (err) {
        console.error('连接数据库时出错：', err);
        throw err;
    }
}

// 执行单个SQL语句
async function executeSQL(sql, params = [], options = {}) {
    let connection;
    try {
        connection = await getConnection();
        
        // 清理SQL语句
        sql = sql.trim();
        if (!sql) return;

        // 移除末尾的分号
        sql = sql.replace(/;$/, '');

        console.log('执行SQL:', sql.substring(0, 150) + (sql.length > 150 ? '...' : ''));
        
        const result = await connection.execute(sql, params, { 
            autoCommit: true,
            ...options 
        });
        console.log('SQL执行成功');
        return result;
    } catch (err) {
        console.error('执行SQL时出错：', err.message);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('连接已关闭');
            } catch (err) {
                console.error('关闭连接时出错：', err.message);
            }
        }
    }
}

// 验证SQL语句是否有效
function isValidStatement(stmt) {
    if (!stmt) return false;
    
    // 移除注释和空白
    stmt = stmt.replace(/--.*$/gm, '').trim();
    
    // 排除无效语句
    if (!stmt || stmt === '/') return false;
    
    // 验证基本SQL命令
    const validCommands = [
        'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'SELECT'
    ];
    
    const firstWord = stmt.split(' ')[0].toUpperCase();
    return validCommands.includes(firstWord);
}

// 处理SQL语句
function processSQLStatement(stmt) {
    // 移除注释和多余空白
    stmt = stmt.replace(/--.*$/gm, '').trim();
    
    // 移除末尾分号
    stmt = stmt.replace(/;$/, '');
    
    // 处理触发器语句
    if (stmt.toUpperCase().includes('CREATE OR REPLACE TRIGGER')) {
        const lines = stmt.split('\n');
        // 移除最后的/
        if (lines[lines.length - 1].trim() === '/') {
            lines.pop();
        }
        stmt = lines.join('\n');
    }
    
    return stmt;
}

// 初始化数据库
async function initDatabase() {
    console.log('开始数据库初始化...');
    
    try {
        const sqlPath = path.join(__dirname, 'database.sql');
        console.log('从以下位置读取SQL文件:', sqlPath);
        
        let sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('SQL文件读取成功');

        // 分割SQL语句
        const statements = [];
        let currentStatement = '';
        let inTrigger = false;

        sql.split('\n').forEach(line => {
            line = line.trim();
            
            // 跳过注释和空行
            if (!line || line.startsWith('--')) return;
            
            // 检查是否进入触发器定义
            if (line.toUpperCase().includes('CREATE OR REPLACE TRIGGER')) {
                inTrigger = true;
            }

            // 处理触发器结束
            if (inTrigger && line === '/') {
                inTrigger = false;
                statements.push(currentStatement);
                currentStatement = '';
                return;
            }

            // 累积当前语句
            if (currentStatement && !line.startsWith('CREATE')) {
                currentStatement += ' ';
            }
            currentStatement += line;

            // 检查普通语句是否结束
            if (!inTrigger && line.endsWith(';')) {
                statements.push(currentStatement.replace(/;$/, ''));
                currentStatement = '';
            }
        });

        // 添加最后一个语句（如果有）
        if (currentStatement.trim()) {
            statements.push(currentStatement.trim());
        }

        // 过滤和处理语句
        const validStatements = statements
            .filter(stmt => isValidStatement(stmt))
            .map(stmt => processSQLStatement(stmt));

        console.log(`找到 ${validStatements.length} 条有效的SQL语句等待执行`);

        // 执行语句
        for (let i = 0; i < validStatements.length; i++) {
            const stmt = validStatements[i];
            try {
                console.log(`执行语句 ${i + 1}/${validStatements.length}`);
                
                if (stmt.toUpperCase().startsWith('DROP')) {
                    try {
                        await executeSQL(stmt);
                    } catch (err) {
                        if (err.errorNum === 942 || err.errorNum === 2289) {
                            console.log('忽略DROP错误:', err.message);
                        }
                    }
                } else {
                    await executeSQL(stmt);
                }
            } catch (err) {
                if (err.errorNum === 942 || // 表或视图不存在
                    err.errorNum === 2289 || // 序列不存在
                    err.errorNum === 1418 || // 表只能有一个主键
                    err.errorNum === 2260) { // 表只能有一个主键
                    console.log('忽略错误:', err.message);
                } else {
                    console.error('执行语句时出错:', stmt);
                    throw err;
                }
            }
        }
        
        console.log('数据库初始化成功完成');
    } catch (err) {
        console.error('数据库初始化失败:', err);
        throw err;
    }
}

// 测试数据库连接
async function testConnection() {
    try {
        const connection = await getConnection();
        console.log('测试连接成功');
        await connection.close();
        return true;
    } catch (err) {
        console.error('测试连接失败:', err.message);
        return false;
    }
}

// 导出函数
module.exports = {
    getConnection,
    executeSQL,
    initDatabase,
    testConnection
};

// 如果直接运行此文件
if (require.main === module) {
    console.log('运行数据库初始化...');
    initDatabase()
        .then(() => {
            console.log('数据库初始化成功完成');
            process.exit(0);
        })
        .catch(err => {
            console.error('数据库初始化失败:', err);
            process.exit(1);
        });
}