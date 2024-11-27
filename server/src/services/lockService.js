// src/services/lockService.js
const oracledb = require('oracledb');
const { executeQuery } = require('../config/database');

class LockService {
  // 检查员工未使用预订次数
  async checkUnusedBookingsCount(employeeId, period = 30) {
    try {
      const result = await executeQuery(`
        SELECT COUNT(*) as unused_count
        FROM Bookings b
        WHERE b.employee_id = :employeeId
        AND b.booking_status = 'Approved'
        AND b.end_time < CURRENT_TIMESTAMP
        AND b.end_time > CURRENT_TIMESTAMP - INTERVAL '${period}' DAY
        AND NOT EXISTS (
          SELECT 1 
          FROM RoomAccessLog al 
          WHERE al.booking_id = b.booking_id
        )
      `, [employeeId]);

      return result.rows[0].UNUSED_COUNT;
    } catch (error) {
      throw error;
    }
  }

  // 锁定员工
  async lockEmployee(employeeId, reason) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN');

      // 更新员工状态
      await connection.execute(`
        UPDATE Employees
        SET is_locked = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = :employeeId
      `, [employeeId]);

      // 记录锁定历史
      await connection.execute(`
        INSERT INTO UnlockRequests (
          employee_id,
          request_time,
          approval_status,
          approval_reason
        ) VALUES (
          :employeeId,
          CURRENT_TIMESTAMP,
          'Pending',
          :reason
        )
      `, {
        employeeId: employeeId,
        reason: reason
      });

      await connection.commit();
      return { success: true };
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
          console.error('Error closing connection:', err);
        }
      }
    }
  }

  // 解锁员工
  async unlockEmployee(employeeId, approverId, reason) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN');

      // 更新员工状态
      await connection.execute(`
        UPDATE Employees
        SET is_locked = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = :employeeId
      `, [employeeId]);

      // 更新解锁请求状态
      await connection.execute(`
        UPDATE UnlockRequests
        SET approval_status = 'Approved',
            approved_by = :approverId,
            approval_reason = :reason,
            approval_time = CURRENT_TIMESTAMP
        WHERE employee_id = :employeeId
        AND approval_status = 'Pending'
      `, {
        approverId: approverId,
        reason: reason,
        employeeId: employeeId
      });

      await connection.commit();
      return { success: true };
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
          console.error('Error closing connection:', err);
        }
      }
    }
  }

  // 获取锁定历史
  async getLockHistory(employeeId) {
    try {
      const result = await executeQuery(`
        SELECT 
          ur.employee_id,
          e.name as employee_name,
          ur.request_time,
          ur.approval_status,
          ur.approval_reason,
          ur.approved_by,
          e2.name as approver_name,
          ur.approval_time
        FROM UnlockRequests ur
        JOIN Employees e ON ur.employee_id = e.employee_id
        LEFT JOIN Employees e2 ON ur.approved_by = e2.employee_id
        WHERE ur.employee_id = :employeeId
        ORDER BY ur.request_time DESC
      `, [employeeId]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 获取所有待处理的解锁请求
  async getPendingUnlockRequests() {
    try {
      const result = await executeQuery(`
        SELECT 
          ur.employee_id,
          e.name as employee_name,
          e.email,
          d.department_name,
          ur.request_time,
          ur.approval_reason
        FROM UnlockRequests ur
        JOIN Employees e ON ur.employee_id = e.employee_id
        JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
        JOIN Departments d ON edp.department_id = d.department_id
        WHERE ur.approval_status = 'Pending'
        ORDER BY ur.request_time
      `);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 自动检查和锁定员工
  async autoCheckAndLock() {
    let connection;
    try {
        connection = await oracledb.getConnection();
        await connection.execute('BEGIN');

        // 获取需要锁定的员工
        const result = await connection.execute(`
            WITH UnusedBookings AS (
                SELECT 
                    b.employee_id,
                    COUNT(*) as unused_count
                FROM Bookings b
                WHERE b.booking_status = 'Approved'
                AND b.end_time < CURRENT_TIMESTAMP
                AND b.end_time > CURRENT_TIMESTAMP - INTERVAL '30' DAY
                AND NOT EXISTS (
                    SELECT 1 
                    FROM RoomAccessLog al 
                    WHERE al.booking_id = b.booking_id
                )
                GROUP BY b.employee_id
                HAVING COUNT(*) >= 3
            )
            SELECT 
                ub.employee_id,
                ub.unused_count,
                e.name as employee_name
            FROM UnusedBookings ub
            JOIN Employees e ON ub.employee_id = e.employee_id
            WHERE e.is_locked = 0
        `);

        const employeesToLock = result.rows || [];

        // 锁定员工
        for (const emp of employeesToLock) {
            await connection.execute(`
                UPDATE Employees
                SET is_locked = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = :employeeId
            `, [emp.EMPLOYEE_ID]);

            await connection.execute(`
                INSERT INTO UnlockRequests (
                    employee_id,
                    request_time,
                    approval_status,
                    approval_reason
                ) VALUES (
                    :employeeId,
                    CURRENT_TIMESTAMP,
                    'Pending',
                    :reason
                )
            `, {
                employeeId: emp.EMPLOYEE_ID,
                reason: `Automatically locked due to ${emp.UNUSED_COUNT} unused bookings in 30 days`
            });
        }

        await connection.commit();
        return employeesToLock;
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
                console.error('Error closing connection:', err);
            }
        }
    }
}
}

module.exports = new LockService();