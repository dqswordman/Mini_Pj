const { executeQuery } = require('../config/database');

class PermissionService {
  // 获取所有权限配置
  async getAllPermissions() {
    try {
      const result = await executeQuery(`
        SELECT 
          ap.permission_id,
          ap.screen_name,
          ap.access_level,
          p.position_id,
          p.position_name
        FROM AccessPermissions ap
        JOIN Positions p ON ap.position_id = p.position_id
        ORDER BY p.position_name, ap.screen_name
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 获取特定职位的权限
  async getPermissionsByPosition(positionId) {
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

  // 批量更新职位权限
  async updatePositionPermissions(positionId, permissions) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN');

      // 删除现有权限
      await connection.execute(`
        DELETE FROM AccessPermissions
        WHERE position_id = :positionId
      `, [positionId]);

      // 添加新的权限
      for (const perm of permissions) {
        await connection.execute(`
          INSERT INTO AccessPermissions (position_id, screen_name, access_level)
          VALUES (:positionId, :screenName, :accessLevel)
        `, {
          positionId: positionId,
          screenName: perm.screenName,
          accessLevel: perm.accessLevel
        });
      }

      await connection.commit();
      return await this.getPermissionsByPosition(positionId);
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

  // 检查用户是否有特定权限
  async checkPermission(employeeId, screenName, requiredLevel) {
    try {
      const result = await executeQuery(`
        SELECT ap.access_level
        FROM Employees e
        JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
        JOIN AccessPermissions ap ON edp.position_id = ap.position_id
        WHERE e.employee_id = :employeeId 
        AND ap.screen_name = :screenName
      `, [employeeId, screenName]);

      if (result.rows.length === 0) {
        return false;
      }

      const accessLevel = result.rows[0].ACCESS_LEVEL;
      const accessLevels = ['Read', 'Write', 'Delete'];
      const userLevelIndex = accessLevels.indexOf(accessLevel);
      const requiredLevelIndex = accessLevels.indexOf(requiredLevel);

      return userLevelIndex >= requiredLevelIndex;
    } catch (error) {
      throw error;
    }
  }

  // 获取可用的屏幕列表
  async getAvailableScreens() {
    try {
      const result = await executeQuery(`
        SELECT DISTINCT screen_name
        FROM AccessPermissions
        ORDER BY screen_name
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 获取特定用户的所有权限
  async getUserPermissions(employeeId) {
    try {
      const result = await executeQuery(`
        SELECT DISTINCT
          ap.screen_name,
          ap.access_level
        FROM Employees e
        JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
        JOIN AccessPermissions ap ON edp.position_id = ap.position_id
        WHERE e.employee_id = :employeeId
        ORDER BY ap.screen_name
      `, [employeeId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PermissionService();