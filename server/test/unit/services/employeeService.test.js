// test/unit/services/employeeService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
}));

jest.mock('bcrypt', () => ({
    genSalt: jest.fn(),
    hash: jest.fn()
}));

jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    NUMBER: 'NUMBER',
    BIND_OUT: 'BIND_OUT'
}));

// Import dependencies AFTER setting up mocks
const { executeQuery } = require('../../../src/config/database');
const bcrypt = require('bcrypt');
const oracledb = require('oracledb');
const employeeService = require('../../../src/services/employeeService');

describe('EmployeeService', () => {
    let mockConnection;

    beforeEach(() => {
        mockConnection = {
            execute: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            close: jest.fn()
        };
        jest.clearAllMocks();
        oracledb.getConnection.mockResolvedValue(mockConnection);
    });

    describe('getAllEmployees', () => {
        it('should return all employees with their details', async () => {
            // Arrange
            const mockEmployees = {
                rows: [
                    {
                        EMPLOYEE_ID: 1,
                        NAME: 'John Doe',
                        EMAIL: 'john@example.com',
                        PHONE_NUMBER: '1234567890',
                        IS_LOCKED: 0,
                        DEPARTMENT_ID: 1,
                        DEPARTMENT_NAME: 'IT',
                        POSITION_ID: 1,
                        POSITION_NAME: 'Developer'
                    }
                ]
            };
            mockConnection.execute.mockResolvedValue(mockEmployees);
    
            // Act
            const result = await employeeService.getAllEmployees();
    
            // Assert
            expect(result).toEqual(mockEmployees.rows);
            expect(mockConnection.execute).toHaveBeenCalled();
            const [sql] = mockConnection.execute.mock.calls[0];
            expect(sql.toLowerCase()).toContain('select');
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            // Arrange
            const dbError = new Error('Database error');
            mockConnection.execute.mockRejectedValue(dbError);

            // Act & Assert
            await expect(employeeService.getAllEmployees())
                .rejects
                .toThrow('Database error');
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('getEmployeeById', () => {
        it('should return employee details when found', async () => {
            // Arrange
            const mockEmployee = {
                rows: [{
                    EMPLOYEE_ID: 1,
                    NAME: 'John Doe',
                    EMAIL: 'john@example.com',
                    DEPARTMENT_NAME: 'IT'
                }]
            };
            mockConnection.execute.mockResolvedValue(mockEmployee);

            // Act
            const result = await employeeService.getEmployeeById(1);

            // Assert
            expect(result).toEqual(mockEmployee.rows[0]);
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('WHERE e.employee_id = :employeeId'),
                [1]
            );
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error when employee not found', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(employeeService.getEmployeeById(999))
                .rejects
                .toThrow('Employee not found');
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('createEmployee', () => {
        const mockEmployeeData = {
            name: 'John Doe',
            email: 'john@example.com',
            phoneNumber: '1234567890',
            departmentId: 1,
            positionId: 1,
            username: 'johndoe',
            password: 'password123'
        };

        it('should create employee successfully', async () => {
            // Arrange
            mockConnection.execute.mockImplementation((sql) => {
                if (sql === 'BEGIN') {
                    return Promise.resolve();
                }
                if (sql.includes('INSERT INTO Employees')) {
                    return Promise.resolve({
                        outBinds: { employee_id: [1] }
                    });
                }
                if (sql.includes('INSERT INTO EmployeeDepartmentPositions')) {
                    return Promise.resolve({ rowsAffected: 1 });
                }
                if (sql.includes('INSERT INTO UserCredentials')) {
                    return Promise.resolve({ rowsAffected: 1 });
                }
                return Promise.resolve({
                    rows: [{
                        EMPLOYEE_ID: 1,
                        NAME: 'John Doe',
                        EMAIL: 'john@example.com'
                    }]
                });
            });

            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');

            // Act
            const result = await employeeService.createEmployee(mockEmployeeData);

            // Assert
            expect(result).toEqual(expect.objectContaining({
                EMPLOYEE_ID: 1,
                NAME: mockEmployeeData.name,
                EMAIL: mockEmployeeData.email
            }));
            expect(mockConnection.execute).toHaveBeenCalledTimes(5); // Including BEGIN
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should rollback transaction on error', async () => {
            // Arrange
            mockConnection.execute.mockImplementation((sql) => {
                if (sql === 'BEGIN') {
                    return Promise.resolve();
                }
                throw new Error('Insert failed');
            });

            // Act & Assert
            await expect(employeeService.createEmployee(mockEmployeeData))
                .rejects
                .toThrow('Insert failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('updateEmployee', () => {
        const mockUpdateData = {
            name: 'John Updated',
            email: 'john.updated@example.com',
            phoneNumber: '0987654321',
            departmentId: 2,
            positionId: 2
        };

        it('should update employee successfully', async () => {
            // Arrange
            mockConnection.execute.mockImplementation((sql) => {
                if (sql === 'BEGIN') {
                    return Promise.resolve();
                }
                if (sql.includes('UPDATE Employees')) {
                    return Promise.resolve({ rowsAffected: 1 });
                }
                if (sql.includes('UPDATE EmployeeDepartmentPositions')) {
                    return Promise.resolve({ rowsAffected: 1 });
                }
                return Promise.resolve({
                    rows: [{
                        EMPLOYEE_ID: 1,
                        NAME: mockUpdateData.name,
                        EMAIL: mockUpdateData.email
                    }]
                });
            });

            // Act
            const result = await employeeService.updateEmployee(1, mockUpdateData);

            // Assert
            expect(result).toEqual(expect.objectContaining({
                NAME: mockUpdateData.name,
                EMAIL: mockUpdateData.email
            }));
            expect(mockConnection.execute).toHaveBeenCalledTimes(4); // Including BEGIN and final query
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        it('should update only basic info if no department/position provided', async () => {
            // Arrange
            const basicUpdateData = {
                name: 'John Updated',
                email: 'john.updated@example.com',
                phoneNumber: '0987654321'
            };

            mockConnection.execute.mockImplementation((sql) => {
                if (sql === 'BEGIN') {
                    return Promise.resolve();
                }
                if (sql.includes('UPDATE Employees')) {
                    return Promise.resolve({ rowsAffected: 1 });
                }
                return Promise.resolve({
                    rows: [{
                        EMPLOYEE_ID: 1,
                        NAME: basicUpdateData.name,
                        EMAIL: basicUpdateData.email
                    }]
                });
            });

            // Act
            const result = await employeeService.updateEmployee(1, basicUpdateData);

            // Assert
            expect(result).toEqual(expect.objectContaining({
                NAME: basicUpdateData.name,
                EMAIL: basicUpdateData.email
            }));
            expect(mockConnection.execute).toHaveBeenCalledTimes(3); // Including BEGIN and final query
        });

        it('should rollback on update error', async () => {
            // Arrange
            mockConnection.execute.mockImplementation((sql) => {
                if (sql === 'BEGIN') {
                    return Promise.resolve();
                }
                throw new Error('Update failed');
            });

            // Act & Assert
            await expect(employeeService.updateEmployee(1, mockUpdateData))
                .rejects
                .toThrow('Update failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });

    describe('deleteEmployee', () => {
        it('should throw error when employee has bookings', async () => {
            // Arrange
            mockConnection.execute.mockImplementation((sql) => {
                if (sql.includes('SELECT COUNT(*)')) {
                    return Promise.resolve({
                        rows: [[1]]  // Has bookings
                    });
                }
                return Promise.resolve({ rowsAffected: 1 });
            });
    
            // Act & Assert
            await expect(employeeService.deleteEmployee(1))
                .rejects
                .toThrow('Cannot delete employee with existing bookings');
            
            // 只应该调用一次检查，不应该有事务操作
            expect(mockConnection.execute).toHaveBeenCalledTimes(1);
            expect(mockConnection.rollback).not.toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error when employee has bookings', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValueOnce({
                rows: [[1]]
            });

            // Act & Assert
            await expect(employeeService.deleteEmployee(1))
                .rejects
                .toThrow('Cannot delete employee with existing bookings');
            expect(mockConnection.rollback).toHaveBeenCalledTimes(0);
        });

        it('should rollback on delete error', async () => {
            // Arrange
            mockConnection.execute.mockImplementation((sql) => {
                if (sql === 'BEGIN') {
                    return Promise.resolve();
                }
                if (sql.includes('SELECT COUNT(*)')) {
                    return Promise.resolve({
                        rows: [[0]]
                    });
                }
                throw new Error('Delete failed');
            });

            // Act & Assert
            await expect(employeeService.deleteEmployee(1))
                .rejects
                .toThrow('Delete failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });
});
