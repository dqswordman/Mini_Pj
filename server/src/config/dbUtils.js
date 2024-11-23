const { executeSQL } = require('./database');

// 通用查询函数
async function query(sql, params = []) {
  try {
    const result = await executeSQL(sql, params);
    return result.rows;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

// 通用插入函数
async function insert(tableName, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, index) => `:${index + 1}`);

  const sql = `
    INSERT INTO ${tableName} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
  `;

  try {
    const result = await executeSQL(sql, values);
    return result;
  } catch (err) {
    console.error('Insert error:', err);
    throw err;
  }
}

// 通用更新函数
async function update(tableName, data, whereClause, whereParams = []) {
  const setClause = Object.keys(data)
    .map((col, index) => `${col} = :${index + 1}`)
    .join(', ');

  const sql = `
    UPDATE ${tableName}
    SET ${setClause}
    WHERE ${whereClause}
  `;

  try {
    const result = await executeSQL(sql, [...Object.values(data), ...whereParams]);
    return result;
  } catch (err) {
    console.error('Update error:', err);
    throw err;
  }
}

// 通用删除函数
async function remove(tableName, whereClause, whereParams = []) {
  const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;

  try {
    const result = await executeSQL(sql, whereParams);
    return result;
  } catch (err) {
    console.error('Delete error:', err);
    throw err;
  }
}

module.exports = {
  query,
  insert,
  update,
  remove
};