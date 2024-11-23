const { executeQuery } = require('../config/database');

class DepartmentService {
  async getAllDepartments() {
    try {
      const result = await executeQuery(`
        SELECT 
          d.department_id,
          d.department_name,
          COUNT(edp.employee_id) as employee_count
        FROM Departments d
        LEFT JOIN EmployeeDepartmentPositions edp ON d.department_id = edp.department_id
        GROUP BY d.department_id, d.department_name
        ORDER BY d.department_name
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getDepartmentById(departmentId) {
    try {
      const result = await executeQuery(`
        SELECT 
          d.department_id,
          d.department_name,
          COUNT(edp.employee_id) as employee_count
        FROM Departments d
        LEFT JOIN EmployeeDepartmentPositions edp ON d.department_id = edp.department_id
        WHERE d.department_id = :departmentId
        GROUP BY d.department_id, d.department_name
      `, [departmentId]);

      if (result.rows.length === 0) {
        throw new Error('Department not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getDepartmentEmployees(departmentId) {
    try {
      const result = await executeQuery(`
        SELECT 
          e.employee_id,
          e.name,
          e.email,
          e.phone_number,
          p.position_name
        FROM Employees e
        JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
        JOIN Positions p ON edp.position_id = p.position_id
        WHERE edp.department_id = :departmentId
        ORDER BY e.name
      `, [departmentId]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async createDepartment(departmentData) {
    try {
      const result = await executeQuery(`
        INSERT INTO Departments (department_name) 
        VALUES (:departmentName)
        RETURNING department_id INTO :department_id
      `, {
        departmentName: departmentData.departmentName,
        department_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      });

      const departmentId = result.outBinds.department_id[0];
      return this.getDepartmentById(departmentId);
    } catch (error) {
      throw error;
    }
  }

  async updateDepartment(departmentId, departmentData) {
    try {
      await executeQuery(`
        UPDATE Departments 
        SET department_name = :departmentName
        WHERE department_id = :departmentId
      `, {
        departmentName: departmentData.departmentName,
        departmentId: departmentId
      });

      return this.getDepartmentById(departmentId);
    } catch (error) {
      throw error;
    }
  }

  async deleteDepartment(departmentId) {
    try {
      // 检查是否有员工在该部门
      const checkResult = await executeQuery(`
        SELECT COUNT(*) as count
        FROM EmployeeDepartmentPositions
        WHERE department_id = :departmentId
      `, [departmentId]);

      if (checkResult.rows[0].COUNT > 0) {
        throw new Error('Cannot delete department with existing employees');
      }

      await executeQuery(`
        DELETE FROM Departments
        WHERE department_id = :departmentId
      `, [departmentId]);

      return { message: 'Department deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DepartmentService();