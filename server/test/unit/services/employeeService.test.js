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
            executeQuery.mockResolvedValue(mockEmployees);

            // Act
            const result = await employeeService.getAllEmployees();

            // Assert
            expect(result).toEqual(mockEmployees.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.any(Array)
            );
        });

        it('should handle database errors', async () => {
            // Arrange
            executeQuery.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(employeeService.getAllEmployees())
                .rejects
                .toThrow('Database error');
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
            executeQuery.mockResolvedValue(mockEmployee);

            // Act
            const result = await employeeService.getEmployeeById(1);

            // Assert
            expect(result).toEqual(mockEmployee.rows[0]);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE e.employee_id = :employeeId'),
                [1]
            );
        });

        it('should throw error when employee not found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(employeeService.getEmployeeById(999))
                .rejects
                .toThrow('Employee not found');
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
            mockConnection.execute
                .mockResolvedValueOnce({ outBinds: { employee_id: [1] } }) // Employee insert
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Department position insert
                .mockResolvedValueOnce({ rowsAffected: 1 }); // User credentials insert

            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');

            const mockCreatedEmployee = {
                EMPLOYEE_ID: 1,
                NAME: 'John Doe',
                EMAIL: 'john@example.com'
            };
            jest.spyOn(employeeService, 'getEmployeeById').mockResolvedValue(mockCreatedEmployee);

            // Act
            const result = await employeeService.createEmployee(mockEmployeeData);

            // Assert
            expect(result).toEqual(mockCreatedEmployee);
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.execute).toHaveBeenCalledTimes(3);
        });

        it('should rollback transaction on error', async () => {
            // Arrange
            mockConnection.execute.mockRejectedValue(new Error('Insert failed'));

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
            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Basic info update
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Department position update

            const mockUpdatedEmployee = {
                EMPLOYEE_ID: 1,
                NAME: 'John Updated',
                EMAIL: 'john.updated@example.com'
            };
            jest.spyOn(employeeService, 'getEmployeeById').mockResolvedValue(mockUpdatedEmployee);

            // Act
            const result = await employeeService.updateEmployee(1, mockUpdateData);

            // Assert
            expect(result).toEqual(mockUpdatedEmployee);
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
        });

        it('should update only basic info if no department/position provided', async () => {
            // Arrange
            const basicUpdateData = {
                name: 'John Updated',
                email: 'john.updated@example.com',
                phoneNumber: '0987654321'
            };

            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Only basic info update

            const mockUpdatedEmployee = {
                EMPLOYEE_ID: 1,
                NAME: 'John Updated',
                EMAIL: 'john.updated@example.com'
            };
            jest.spyOn(employeeService, 'getEmployeeById').mockResolvedValue(mockUpdatedEmployee);

            // Act
            const result = await employeeService.updateEmployee(1, basicUpdateData);

            // Assert
            expect(result).toEqual(mockUpdatedEmployee);
            expect(mockConnection.execute).toHaveBeenCalledTimes(1);
        });

        it('should rollback on update error', async () => {
            // Arrange
            mockConnection.execute.mockRejectedValue(new Error('Update failed'));

            // Act & Assert
            await expect(employeeService.updateEmployee(1, mockUpdateData))
                .rejects
                .toThrow('Update failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });

    describe('deleteEmployee', () => {
        it('should delete employee with no bookings', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [[0]] }) // No bookings check
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete credentials
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete department positions
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Delete employee

            // Act
            const result = await employeeService.deleteEmployee(1);

            // Assert
            expect(result).toEqual({ message: 'Employee deleted successfully' });
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.execute).toHaveBeenCalledTimes(4);
        });

        it('should throw error when employee has bookings', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [[1]] }); // Has bookings

            // Act & Assert
            await expect(employeeService.deleteEmployee(1))
                .rejects
                .toThrow('Cannot delete employee with existing bookings');
            expect(mockConnection.rollback).not.toHaveBeenCalled(); // No transaction started yet
        });

        it('should rollback on delete error', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [[0]] }) // No bookings check
                .mockRejectedValue(new Error('Delete failed')); // Delete operation fails

            // Act & Assert
            await expect(employeeService.deleteEmployee(1))
                .rejects
                .toThrow('Delete failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });
});