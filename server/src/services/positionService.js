// src/services/positionService.js
const oracledb = require('oracledb');
const { executeQuery } = require('../config/database');

class PositionService {
  async getAllPositions() {
    try {
      const result = await executeQuery(`
        SELECT 
          p.position_id,
          p.position_name,
          COUNT(edp.employee_id) as employee_count,
          (
            SELECT COUNT(*) 
            FROM AccessPermissions ap 
            WHERE ap.position_id = p.position_id
          ) as permission_count
        FROM Positions p
        LEFT JOIN EmployeeDepartmentPositions edp ON p.position_id = edp.position_id
        GROUP BY p.position_id, p.position_name
        ORDER BY p.position_name
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getPositionById(positionId) {
    try {
      const result = await executeQuery(`
        SELECT 
          p.position_id,
          p.position_name,
          COUNT(edp.employee_id) as employee_count,
          (
            SELECT COUNT(*) 
            FROM AccessPermissions ap 
            WHERE ap.position_id = p.position_id
          ) as permission_count
        FROM Positions p
        LEFT JOIN EmployeeDepartmentPositions edp ON p.position_id = edp.position_id
        WHERE p.position_id = :positionId
        GROUP BY p.position_id, p.position_name
      `, [positionId]);

      if (result.rows.length === 0) {
        throw new Error('Position not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getPositionEmployees(positionId) {
    try {
      const result = await executeQuery(`
        SELECT 
          e.employee_id,
          e.name,
          e.email,
          e.phone_number,
          d.department_name
        FROM Employees e
        JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
        JOIN Departments d ON edp.department_id = d.department_id
        WHERE edp.position_id = :positionId
        ORDER BY e.name
      `, [positionId]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getPositionPermissions(positionId) {
    try {
      const result = await executeQuery(`
        SELECT 
          permission_id,
          screen_name,
          access_level
        FROM AccessPermissions
        WHERE position_id = :positionId
        ORDER BY screen_name
      `, [positionId]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async createPosition(positionData) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN'); // 开始事务

      // 创建职位
      const result = await connection.execute(`
        INSERT INTO Positions (position_name) 
        VALUES (:positionName)
        RETURNING position_id INTO :position_id
      `, {
        positionName: positionData.positionName,
        position_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      });

      const positionId = result.outBinds.position_id[0];

      // 如果提供了权限配置，则添加权限
      if (positionData.permissions && positionData.permissions.length > 0) {
        for (const perm of positionData.permissions) {
          await connection.execute(`
            INSERT INTO AccessPermissions (position_id, screen_name, access_level)
            VALUES (:positionId, :screenName, :accessLevel)
          `, {
            positionId: positionId,
            screenName: perm.screenName,
            accessLevel: perm.accessLevel
          });
        }
      }

      await connection.commit();
      return this.getPositionById(positionId);
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

  async updatePosition(positionId, positionData) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN'); // 开始事务

      // 更新职位名称
      await connection.execute(`
        UPDATE Positions 
        SET position_name = :positionName
        WHERE position_id = :positionId
      `, {
        positionName: positionData.positionName,
        positionId: positionId
      });

      // 如果提供了权限配置，则更新权限
      if (positionData.permissions) {
        // 先删除现有权限
        await connection.execute(`
          DELETE FROM AccessPermissions
          WHERE position_id = :positionId
        `, [positionId]);

        // 添加新权限
        for (const perm of positionData.permissions) {
          await connection.execute(`
            INSERT INTO AccessPermissions (position_id, screen_name, access_level)
            VALUES (:positionId, :screenName, :accessLevel)
          `, {
            positionId: positionId,
            screenName: perm.screenName,
            accessLevel: perm.accessLevel
          });
        }
      }

      await connection.commit();
      return this.getPositionById(positionId);
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

  async deletePosition(positionId) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      
      // 检查是否有员工使用该职位
      const checkResult = await connection.execute(`
        SELECT COUNT(*) as count
        FROM EmployeeDepartmentPositions
        WHERE position_id = :positionId
      `, [positionId]);

      if (checkResult.rows[0].COUNT > 0) {
        throw new Error('Cannot delete position with existing employees');
      }

      await connection.execute('BEGIN'); // 开始事务

      // 删除相关的权限
      await connection.execute(`
        DELETE FROM AccessPermissions
        WHERE position_id = :positionId
      `, [positionId]);

      // 删除职位
      await connection.execute(`
        DELETE FROM Positions
        WHERE position_id = :positionId
      `, [positionId]);

      await connection.commit();
      return { message: 'Position deleted successfully' };
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

module.exports = new PositionService();