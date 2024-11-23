const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTSTRING
};

// 获取数据库连接
async function getConnection() {
  try {
    console.log('Attempting to connect to database...');
    const connection = await oracledb.getConnection(dbConfig);
    console.log('Database connection established successfully');
    return connection;
  } catch (err) {
    console.error('Error connecting to database:', err);
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

    console.log('Executing SQL:', sql.substring(0, 150) + (sql.length > 150 ? '...' : ''));
    
    const result = await connection.execute(sql, params, { 
      autoCommit: true,
      ...options 
    });
    console.log('SQL executed successfully');
    return result;
  } catch (err) {
    console.error('Error executing SQL:', err.message);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Connection closed');
      } catch (err) {
        console.error('Error closing connection:', err.message);
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
  console.log('Starting database initialization...');
  
  try {
    const sqlPath = path.join(__dirname, 'database.sql');
    console.log('Reading SQL file from:', sqlPath);
    
    let sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('SQL file read successfully');

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

    console.log(`Found ${validStatements.length} valid SQL statements to execute`);

    // 执行语句
    for (let i = 0; i < validStatements.length; i++) {
      const stmt = validStatements[i];
      try {
        console.log(`Executing statement ${i + 1}/${validStatements.length}`);
        
        if (stmt.toUpperCase().startsWith('DROP')) {
          try {
            await executeSQL(stmt);
          } catch (err) {
            if (err.errorNum === 942 || err.errorNum === 2289) {
              console.log('Ignoring DROP error:', err.message);
            }
          }
        } else {
          await executeSQL(stmt);
        }
      } catch (err) {
        if (err.errorNum === 942 || // table or view does not exist
            err.errorNum === 2289 || // sequence does not exist
            err.errorNum === 1418 || // table can have only one primary key
            err.errorNum === 2260) { // table can have only one primary key
          console.log('Ignoring error:', err.message);
        } else {
          console.error('Error executing statement:', stmt);
          throw err;
        }
      }
    }
    
    console.log('Database initialization completed successfully');
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  }
}

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await getConnection();
    console.log('Test connection successful');
    await connection.close();
    return true;
  } catch (err) {
    console.error('Test connection failed:', err.message);
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
  console.log('Running database initialization...');
  initDatabase()
    .then(() => {
      console.log('Database initialization completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}