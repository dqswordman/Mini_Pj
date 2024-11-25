const oracledb = require('oracledb');
require('dotenv').config();

// 初始化 Oracle 客户端配置
try {
    // 请根据你的实际安装路径修改
    oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });
} catch (err) {
    console.error('Oracle 客户端初始化失败：', err);
    process.exit(1);
}

async function testConnection() {
    let connection;
    try {
        // 从环境变量中读取 Oracle 连接配置
        connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECTSTRING,
            // 显式使用 thick 模式
            connectionClass: 'thick'
        });

        console.log('连接成功！');

        // 执行一个简单的查询
        const result = await connection.execute('SELECT 1 FROM DUAL');
        console.log('查询结果：', result.rows);

    } catch (err) {
        console.error('连接失败：', err);
        throw err;
    } finally {
        if (connection) {
            try {
                // 确保无论如何都关闭连接
                await connection.close();
                console.log('连接已关闭');
            } catch (err) {
                console.error('关闭连接时出错：', err);
            }
        }
    }
}

// 执行测试连接
testConnection()
    .then(() => {
        console.log('测试完成');
        process.exit(0);
    })
    .catch((err) => {
        console.error('测试失败：', err);
        process.exit(1);
    });