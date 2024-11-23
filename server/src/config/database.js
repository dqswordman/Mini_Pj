const oracledb = require('oracledb');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

try {
  console.log('Initializing Oracle Client...');
  oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient' });
  oracledb.thin = false; // 使用 OCI 客户端库
  console.log('Oracle Client initialized successfully.');
} catch (err) {
  console.error('Error initializing Oracle client:', err);
  process.exit(1);
}

oracledb.autoCommit = true; // 启用自动提交

const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTSTRING,
};

const initialize = async () => {
  try {
    console.log('Step 1: Initializing connection pool...');
    await oracledb.createPool({
      ...dbConfig,
      poolAlias: 'default',
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 2,
    });
    console.log('Connection pool initialized.');

    console.log('Step 2: Initializing tables...');
    await initializeTables();
    console.log('Database initialization completed successfully.');
  } catch (err) {
    console.error('Error during database initialization:', err);
    process.exit(1);
  }
};

const initializeTables = async () => {
  let connection;
  try {
    const sqlFilePath = path.resolve(__dirname, 'database.sql');
    console.log('Checking SQL file path...');
    console.log('SQL file path:', sqlFilePath);

    await fs.access(sqlFilePath);
    console.log('SQL file found.');

    const sqlFile = await fs.readFile(sqlFilePath, 'utf8');
    if (!sqlFile.trim()) {
      throw new Error('SQL file is empty.');
    }
    console.log('SQL file loaded.');

    connection = await oracledb.getConnection();
    console.log('Database connection established.');

    // 设置 PL/SQL 警告模式
    await connection.execute("ALTER SESSION SET PLSQL_WARNINGS='ENABLE:ALL'");

    console.log('Parsing SQL statements...');
    const statements = parseSQLStatements(sqlFile);
    console.log(`Parsed ${statements.length} SQL statements.`);

    for (const [index, sql] of statements.entries()) {
      const sqlToExecute = sql.trim();
      if (!sqlToExecute) {
        // 跳过空的 SQL 语句
        console.log(`Skipping empty SQL statement at index ${index + 1}.`);
        continue;
      }
      console.log(`Executing SQL statement ${index + 1}/${statements.length}:`);
      console.log(sqlToExecute);
      try {
        await connection.execute(sqlToExecute);
        console.log('SQL executed successfully.');
      } catch (err) {
        handleSQLError(err, sqlToExecute);
      }
    }

    console.log('All SQL statements executed.');
  } catch (err) {
    console.error('Error initializing tables:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('Database connection closed.');
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
};

const parseSQLStatements = (sqlFile) => {
  const statements = [];
  let currentStatement = '';
  let inPlsqlBlock = false;
  const lines = sqlFile.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('--')) continue; // 跳过空行和注释

    if (trimmedLine === '/' || trimmedLine === ';') continue; // 跳过仅包含 '/' 或 ';' 的行

    // 检测 PL/SQL 块的开始
    if (/^CREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|PACKAGE|PACKAGE\s+BODY|TRIGGER|TYPE|TYPE\s+BODY)/i.test(trimmedLine) ||
        /^BEGIN$/i.test(trimmedLine)) {
      inPlsqlBlock = true;
    }

    currentStatement += line + '\n';

    // 检测 PL/SQL 块的结束
    if (inPlsqlBlock && /^END;$/i.test(trimmedLine)) {
      inPlsqlBlock = false;
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }
      currentStatement = '';
      // 跳过后续的斜杠（如果有）
      while (i + 1 < lines.length) {
        let nextLine = lines[i + 1].trim();
        if (nextLine === '/') {
          i++; // 跳过斜杠
        } else {
          break;
        }
      }
    } else if (!inPlsqlBlock && trimmedLine.endsWith(';')) {
      if (currentStatement.trim()) {
        // 对于非 PL/SQL 语句，去除末尾的分号
        currentStatement = currentStatement.trim().replace(/;$/, '').trim();
        statements.push(currentStatement);
      }
      currentStatement = '';
    }
  }

  if (currentStatement.trim() !== '') {
    statements.push(currentStatement.trim());
  }

  return statements;
};

const handleSQLError = (err, sql) => {
  console.error('Error executing SQL:', sql);
  console.error('Error details:', err.message);

  switch (err.errorNum) {
    case 955: // 对象已存在
      console.log('Object already exists, skipping...');
      break;
    case 1913: // 序列已存在
      console.log('Sequence already exists, skipping...');
      break;
    case 942: // 表或视图不存在
      console.log('Table or view does not exist, skipping...');
      break;
    case 1031: // 权限不足
      console.log('Insufficient privileges, skipping...');
      break;
    case 4080:
    case 4081: // 触发器已存在
      console.log('Trigger already exists, skipping...');
      break;
    default:
      throw err; // 重新抛出未处理的错误
  }
};

const closePoolAndExit = async () => {
  try {
    console.log('Closing database connection pool...');
    if (!oracledb.getPool('default')) {
      console.log('No database pool to close.');
      return;
    }
    const pool = oracledb.getPool('default');
    await pool.close(10);
    console.log('Database pool closed successfully.');
  } catch (err) {
    console.error('Error closing database pool:', err);
    throw err;
  }
};

process.on('SIGTERM', closePoolAndExit);
process.on('SIGINT', closePoolAndExit);
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// 开始数据库初始化
initialize();

// 导出函数（如果在其他地方需要）
module.exports = {
  initialize,
  closePoolAndExit,
};
