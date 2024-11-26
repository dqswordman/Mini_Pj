// src/services/authService.js
const bcrypt = require('bcrypt');
const oracledb = require('oracledb');
const { executeSQL } = require('../config/database.js');
const { generateToken } = require('../utils/jwtUtils.js');

class AuthService {
    async register(userData) {
        let connection;
        try {
            connection = await oracledb.getConnection();
            await connection.execute('BEGIN');

            // 检查邮箱是否已存在
            const checkEmail = await connection.execute(
                `SELECT COUNT(*) AS COUNT FROM Employees WHERE email = :email`,
                [userData.email]
            );

            if (checkEmail.rows[0].COUNT > 0) {
                throw new Error('Email already exists');
            }

            // 创建员工记录
            const employeeResult = await connection.execute(
                `INSERT INTO Employees (name, email, phone_number, is_locked)
                 VALUES (:name, :email, :phoneNumber, 0)
                 RETURNING employee_id INTO :employee_id`,
                {
                    name: userData.name,
                    email: userData.email,
                    phoneNumber: userData.phoneNumber,
                    employee_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
                }
            );

            const employeeId = employeeResult.outBinds.employee_id[0];

            // 创建部门职位关联
            await connection.execute(
                `INSERT INTO EmployeeDepartmentPositions (employee_id, department_id, position_id)
                 VALUES (:employeeId, :departmentId, :positionId)`,
                {
                    employeeId,
                    departmentId: userData.departmentId,
                    positionId: userData.positionId
                }
            );

            // 创建用户凭证
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            await connection.execute(
                `INSERT INTO UserCredentials (employee_id, username, password_hash)
                 VALUES (:employeeId, :username, :passwordHash)`,
                {
                    employeeId,
                    username: userData.email,
                    passwordHash: hashedPassword
                }
            );

            await connection.commit();

            return {
                employeeId,
                name: userData.name,
                email: userData.email,
                phoneNumber: userData.phoneNumber
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
                    console.error('Error closing connection:', err);
                }
            }
        }
    }

    async login(email, password) {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT 
                    e.employee_id,
                    e.name,
                    e.email,
                    uc.password_hash,
                    e.is_locked,
                    p.position_name
                 FROM Employees e
                 JOIN UserCredentials uc ON e.employee_id = uc.employee_id
                 JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
                 JOIN Positions p ON edp.position_id = p.position_id
                 WHERE e.email = :email`,
                [email]
            );

            if (result.rows.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = result.rows[0];

            if (user.IS_LOCKED) {
                throw new Error('Account is locked');
            }

            const validPassword = await bcrypt.compare(password, user.PASSWORD_HASH);
            if (!validPassword) {
                throw new Error('Invalid credentials');
            }

            const token = generateToken({
                id: user.EMPLOYEE_ID,
                position: user.POSITION_NAME
            });

            return {
                token,
                user: {
                    id: user.EMPLOYEE_ID,
                    name: user.NAME,
                    email: user.EMAIL,
                    position: user.POSITION_NAME
                }
            };
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

    async getUserProfile(userId) {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT 
                    e.employee_id,
                    e.name,
                    e.email,
                    e.phone_number,
                    d.department_name,
                    p.position_name
                 FROM Employees e
                 JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
                 JOIN Departments d ON edp.department_id = d.department_id
                 JOIN Positions p ON edp.position_id = p.position_id
                 WHERE e.employee_id = :userId`,
                [userId]
            );

            if (result.rows.length === 0) {
                throw new Error('User not found');
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

    async changePassword(userId, currentPassword, newPassword) {
        let connection;
        try {
            connection = await oracledb.getConnection();
            await connection.execute('BEGIN');

            const result = await connection.execute(
                `SELECT password_hash 
                 FROM UserCredentials 
                 WHERE employee_id = :userId`,
                [userId]
            );

            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            const validPassword = await bcrypt.compare(
                currentPassword,
                result.rows[0].PASSWORD_HASH
            );

            if (!validPassword) {
                throw new Error('Invalid current password');
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await connection.execute(
                `UPDATE UserCredentials 
                 SET password_hash = :passwordHash,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE employee_id = :userId`,
                {
                    passwordHash: hashedPassword,
                    userId
                }
            );

            await connection.commit();
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

module.exports = new AuthService();