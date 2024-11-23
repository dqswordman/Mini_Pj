const oracledb = require('oracledb');

// 通用 SQL 执行函数
async function executeQuery(sql, binds = [], opts = {}) {
  let connection;
  try {
    // 获取数据库连接
    connection = await oracledb.getConnection();

    // 执行 SQL
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT, // 默认输出格式
      autoCommit: opts.autoCommit !== undefined ? opts.autoCommit : true, // 默认自动提交
      ...opts,
    });

    // 返回执行结果
    return result;
  } catch (err) {
    console.error('Error executing SQL:', err);
    throw err;
  } finally {
    // 关闭连接
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr);
      }
    }
  }
}

// 开始事务
async function startTransaction() {
  const connection = await oracledb.getConnection();
  try {
    await connection.execute('BEGIN');
    return connection; // 返回连接以便后续操作
  } catch (err) {
    console.error('Error starting transaction:', err);
    throw err;
  }
}

// 提交事务
async function commitTransaction(connection) {
  if (connection) {
    try {
      await connection.commit();
      console.log('Transaction committed successfully');
    } catch (err) {
      console.error('Error committing transaction:', err);
      throw err;
    } finally {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr);
      }
    }
  }
}

// 回滚事务
async function rollbackTransaction(connection) {
  if (connection) {
    try {
      await connection.rollback();
      console.log('Transaction rolled back successfully');
    } catch (err) {
      console.error('Error rolling back transaction:', err);
      throw err;
    } finally {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr);
      }
    }
  }
}

module.exports = {
  executeQuery,
  startTransaction,
  commitTransaction,
  rollbackTransaction,
};
