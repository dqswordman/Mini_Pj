// src/services/systemLogService.js
const { executeQuery } = require('../config/database');

class SystemLogService {
  // 获取系统日志
  async getLogs({ startDate, endDate, action, userId, page, pageSize }) {
    try {
      let query = `
        SELECT 
          sl.log_id,
          sl.action,
          sl.user_id,
          e.name as user_name,
          sl.timestamp,
          sl.details
        FROM SystemLogs sl
        JOIN Employees e ON sl.user_id = e.employee_id
        WHERE sl.timestamp BETWEEN :startDate AND :endDate
      `;

      const params = { startDate, endDate };

      if (action) {
        query += ` AND sl.action = :action`;
        params.action = action;
      }

      if (userId) {
        query += ` AND sl.user_id = :userId`;
        params.userId = userId;
      }

      query += ` ORDER BY sl.timestamp DESC`;

      // 添加分页
      const offset = (page - 1) * pageSize;
      query += ` OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`;
      params.offset = offset;
      params.pageSize = pageSize;

      const result = await executeQuery(query, params);

      // 获取总记录数
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM SystemLogs sl
        WHERE sl.timestamp BETWEEN :startDate AND :endDate
        ${action ? 'AND sl.action = :action' : ''}
        ${userId ? 'AND sl.user_id = :userId' : ''}
      `;

      const countResult = await executeQuery(countQuery, params);
      const totalCount = countResult.rows[0].TOTAL_COUNT;

      return {
        logs: result.rows,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // 获取日志统计
  async getLogStats(startDate, endDate, groupBy = 'action') {
    try {
      let query;
      
      switch (groupBy) {
        case 'action':
          query = `
            SELECT 
              action,
              COUNT(*) as count,
              COUNT(DISTINCT user_id) as unique_users,
              MIN(timestamp) as first_occurrence,
              MAX(timestamp) as last_occurrence
            FROM SystemLogs
            WHERE timestamp BETWEEN :startDate AND :endDate
            GROUP BY action
            ORDER BY count DESC
          `;
          break;

        case 'user':
          query = `
            SELECT 
              sl.user_id,
              e.name as user_name,
              COUNT(*) as action_count,
              COUNT(DISTINCT sl.action) as unique_actions,
              MIN(sl.timestamp) as first_action,
              MAX(sl.timestamp) as last_action
            FROM SystemLogs sl
            JOIN Employees e ON sl.user_id = e.employee_id
            WHERE sl.timestamp BETWEEN :startDate AND :endDate
            GROUP BY sl.user_id, e.name
            ORDER BY action_count DESC
          `;
          break;

        case 'date':
          query = `
            SELECT 
              TRUNC(timestamp) as log_date,
              COUNT(*) as action_count,
              COUNT(DISTINCT user_id) as unique_users,
              COUNT(DISTINCT action) as unique_actions
            FROM SystemLogs
            WHERE timestamp BETWEEN :startDate AND :endDate
            GROUP BY TRUNC(timestamp)
            ORDER BY log_date
          `;
          break;

        default:
          throw new Error('Invalid groupBy parameter');
      }

      const result = await executeQuery(query, { startDate, endDate });
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 创建日志记录
  async createLog({ action, userId, details }) {
    try {
      const result = await executeQuery(`
        INSERT INTO SystemLogs (
          action,
          user_id,
          details,
          timestamp
        ) VALUES (
          :action,
          :userId,
          :details,
          CURRENT_TIMESTAMP
        ) RETURNING log_id, timestamp INTO :log_id, :timestamp
      `, {
        action: action,
        userId: userId,
        details: details,
        log_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        timestamp: { type: oracledb.DATE, dir: oracledb.BIND_OUT }
      });

      return {
        logId: result.outBinds.log_id[0],
        action: action,
        userId: userId,
        details: details,
        timestamp: result.outBinds.timestamp[0]
      };
    } catch (error) {
      throw error;
    }
  }

  // 清理旧日志
  async cleanupOldLogs(retentionDays) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN');

      // 获取要删除的日志数量
      const countResult = await connection.execute(`
        SELECT COUNT(*) as count
        FROM SystemLogs
        WHERE timestamp < CURRENT_TIMESTAMP - :retentionDays
      `, [retentionDays]);

      const logsToDelete = countResult.rows[0].COUNT;

      // 删除旧日志
      if (logsToDelete > 0) {
        await connection.execute(`
          DELETE FROM SystemLogs
          WHERE timestamp < CURRENT_TIMESTAMP - :retentionDays
        `, [retentionDays]);
      }

      await connection.commit();

      return {
        deletedCount: logsToDelete,
        retentionDays: retentionDays
      };
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error(err);
        }
      }
    }
  }
}

module.exports = new SystemLogService();