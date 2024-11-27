// src/services/employeeService.js
const bcrypt = require('bcrypt');
const oracledb = require('oracledb');

class EmployeeService {
  async getAllEmployees() {
    let connection;
    try {
      connection = await oracledb.getConnection();
      
      const result = await connection.execute(`
        SELECT 
          e.employee_id,
          e.name,
          e.email,
          e.phone_number,
          e.is_locked,
          d.department_id,
          d.department_name,
          p.position_id,
          p.position_name
        FROM Employees e
        LEFT JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
        LEFT JOIN Departments d ON edp.department_id = d.department_id
        LEFT JOIN Positions p ON edp.position_id = p.position_id
      `);
      return result.rows;
    } catch (error) {
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

  async getEmployeeById(employeeId) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      
      const result = await connection.execute(`
        SELECT 
          e.employee_id,
          e.name,
          e.email,
          e.phone_number,
          e.is_locked,
          d.department_id,
          d.department_name,
          p.position_id,
          p.position_name
        FROM Employees e
        LEFT JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
        LEFT JOIN Departments d ON edp.department_id = d.department_id
        LEFT JOIN Positions p ON edp.position_id = p.position_id
        WHERE e.employee_id = :employeeId
      `, [employeeId]);

      if (result.rows.length === 0) {
        throw new Error('Employee not found');
      }

      return result.rows[0];
    } catch (error) {
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

  async createEmployee(employeeData) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN');  // 开始事务

      // 1. 创建员工基本信息
      const employeeResult = await connection.execute(`
        INSERT INTO Employees (name, email, phone_number) 
        VALUES (:name, :email, :phoneNumber)
        RETURNING employee_id INTO :employee_id
      `, {
        name: employeeData.name,
        email: employeeData.email,
        phoneNumber: employeeData.phoneNumber,
        employee_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      });

      const employeeId = employeeResult.outBinds.employee_id[0];

      // 2. 创建部门职位关联
      await connection.execute(`
        INSERT INTO EmployeeDepartmentPositions 
        (employee_id, department_id, position_id) 
        VALUES (:employeeId, :departmentId, :positionId)
      `, {
        employeeId: employeeId,
        departmentId: employeeData.departmentId,
        positionId: employeeData.positionId
      });

      // 3. 创建用户凭证
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(employeeData.password, salt);
      
      await connection.execute(`
        INSERT INTO UserCredentials 
        (employee_id, username, password_hash) 
        VALUES (:employeeId, :username, :passwordHash)
      `, {
        employeeId: employeeId,
        username: employeeData.username,
        passwordHash: hashedPassword
      });

      await connection.commit();
      return await this.getEmployeeById(employeeId);
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

  async updateEmployee(employeeId, employeeData) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      await connection.execute('BEGIN');

      // 1. 更新员工基本信息
      await connection.execute(`
        UPDATE Employees 
        SET name = :name,
            email = :email,
            phone_number = :phoneNumber,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = :employeeId
      `, {
        name: employeeData.name,
        email: employeeData.email,
        phoneNumber: employeeData.phoneNumber,
        employeeId: employeeId
      });

      // 2. 更新部门职位关联
      if (employeeData.departmentId && employeeData.positionId) {
        await connection.execute(`
          UPDATE EmployeeDepartmentPositions 
          SET department_id = :departmentId,
              position_id = :positionId
          WHERE employee_id = :employeeId
        `, {
          departmentId: employeeData.departmentId,
          positionId: employeeData.positionId,
          employeeId: employeeId
        });
      }

      await connection.commit();
      return await this.getEmployeeById(employeeId);
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

  async deleteEmployee(employeeId) {
    let connection;
    try {
        connection = await oracledb.getConnection();
        
        // 先检查是否可以删除
        const bookingsResult = await connection.execute(`
            SELECT COUNT(*) as count
            FROM Bookings
            WHERE employee_id = :employeeId
        `, [employeeId]);

        if (bookingsResult.rows[0][0] > 0) {
            throw new Error('Cannot delete employee with existing bookings');
        }

        // 开始事务
        await connection.execute('BEGIN');

        // 按顺序删除相关记录
        await connection.execute(`
            DELETE FROM UserCredentials WHERE employee_id = :employeeId
        `, [employeeId]);

        await connection.execute(`
            DELETE FROM EmployeeDepartmentPositions WHERE employee_id = :employeeId
        `, [employeeId]);

        await connection.execute(`
            DELETE FROM Employees WHERE employee_id = :employeeId
        `, [employeeId]);

        await connection.commit();
        return { message: 'Employee deleted successfully' };
    } catch (error) {
        if (connection && error.message !== 'Cannot delete employee with existing bookings') {
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

module.exports = new EmployeeService();