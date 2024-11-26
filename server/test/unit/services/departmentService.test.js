// test/unit/services/departmentService.test.js

// Mock dependencies BEFORE requiring the service
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
}));

jest.mock('oracledb', () => ({
    NUMBER: 'NUMBER',
    BIND_OUT: 'BIND_OUT'
}));

// Import dependencies AFTER setting up mocks
const { executeQuery } = require('../../../src/config/database');
const departmentService = require('../../../src/services/departmentService');

describe('DepartmentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllDepartments', () => {
        it('should return all departments with employee count', async () => {
            // Arrange
            const mockDepartments = {
                rows: [
                    { DEPARTMENT_ID: 1, DEPARTMENT_NAME: 'IT', EMPLOYEE_COUNT: 5 },
                    { DEPARTMENT_ID: 2, DEPARTMENT_NAME: 'HR', EMPLOYEE_COUNT: 3 }
                ]
            };
            executeQuery.mockResolvedValue(mockDepartments);

            // Act
            const result = await departmentService.getAllDepartments();

            // Assert
            expect(result).toEqual(mockDepartments.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.any(Array)
            );
        });

        it('should handle database errors', async () => {
            // Arrange
            executeQuery.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(departmentService.getAllDepartments())
                .rejects
                .toThrow('Database error');
        });
    });

    describe('getDepartmentById', () => {
        it('should return department details when found', async () => {
            // Arrange
            const mockDepartment = {
                rows: [{
                    DEPARTMENT_ID: 1,
                    DEPARTMENT_NAME: 'IT',
                    EMPLOYEE_COUNT: 5
                }]
            };
            executeQuery.mockResolvedValue(mockDepartment);

            // Act
            const result = await departmentService.getDepartmentById(1);

            // Assert
            expect(result).toEqual(mockDepartment.rows[0]);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE d.department_id = :departmentId'),
                [1]
            );
        });

        it('should throw error when department not found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(departmentService.getDepartmentById(999))
                .rejects
                .toThrow('Department not found');
        });
    });

    describe('getDepartmentEmployees', () => {
        it('should return employees in department', async () => {
            // Arrange
            const mockEmployees = {
                rows: [
                    {
                        EMPLOYEE_ID: 1,
                        NAME: 'John Doe',
                        EMAIL: 'john@example.com',
                        PHONE_NUMBER: '1234567890',
                        POSITION_NAME: 'Developer'
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockEmployees);

            // Act
            const result = await departmentService.getDepartmentEmployees(1);

            // Assert
            expect(result).toEqual(mockEmployees.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE edp.department_id = :departmentId'),
                [1]
            );
        });

        it('should return empty array when no employees found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await departmentService.getDepartmentEmployees(1);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('createDepartment', () => {
        it('should create new department successfully', async () => {
            // Arrange
            const newDepartmentData = { departmentName: 'Finance' };
            const mockInsertResult = {
                outBinds: { department_id: [3] }
            };
            const mockDepartment = {
                rows: [{
                    DEPARTMENT_ID: 3,
                    DEPARTMENT_NAME: 'Finance',
                    EMPLOYEE_COUNT: 0
                }]
            };

            executeQuery
                .mockResolvedValueOnce(mockInsertResult)  // For INSERT query
                .mockResolvedValueOnce(mockDepartment);   // For SELECT query after insert

            // Act
            const result = await departmentService.createDepartment(newDepartmentData);

            // Assert
            expect(result).toEqual(mockDepartment.rows[0]);
            expect(executeQuery).toHaveBeenCalledTimes(2);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO Departments'),
                expect.any(Object)
            );
        });

        it('should handle department creation error', async () => {
            // Arrange
            const newDepartmentData = { departmentName: 'Finance' };
            executeQuery.mockRejectedValue(new Error('Insert failed'));

            // Act & Assert
            await expect(departmentService.createDepartment(newDepartmentData))
                .rejects
                .toThrow('Insert failed');
        });
    });

    describe('updateDepartment', () => {
        it('should update department successfully', async () => {
            // Arrange
            const updateData = { departmentName: 'Updated IT' };
            const mockUpdatedDepartment = {
                rows: [{
                    DEPARTMENT_ID: 1,
                    DEPARTMENT_NAME: 'Updated IT',
                    EMPLOYEE_COUNT: 5
                }]
            };

            executeQuery
                .mockResolvedValueOnce({ rowsAffected: 1 })  // For UPDATE query
                .mockResolvedValueOnce(mockUpdatedDepartment);  // For SELECT query after update

            // Act
            const result = await departmentService.updateDepartment(1, updateData);

            // Assert
            expect(result).toEqual(mockUpdatedDepartment.rows[0]);
            expect(executeQuery).toHaveBeenCalledTimes(2);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE Departments'),
                expect.any(Object)
            );
        });

        it('should handle department update error', async () => {
            // Arrange
            const updateData = { departmentName: 'Updated IT' };
            executeQuery.mockRejectedValue(new Error('Update failed'));

            // Act & Assert
            await expect(departmentService.updateDepartment(1, updateData))
                .rejects
                .toThrow('Update failed');
        });
    });

    describe('deleteDepartment', () => {
        it('should delete department with no employees', async () => {
            // Arrange
            executeQuery
                .mockResolvedValueOnce({ rows: [{ COUNT: 0 }] })  // No employees check
                .mockResolvedValueOnce({ rowsAffected: 1 });      // Delete operation

            // Act
            const result = await departmentService.deleteDepartment(1);

            // Assert
            expect(result).toEqual({ message: 'Department deleted successfully' });
            expect(executeQuery).toHaveBeenCalledTimes(2);
            expect(executeQuery).toHaveBeenLastCalledWith(
                expect.stringContaining('DELETE FROM Departments'),
                [1]
            );
        });

        it('should throw error when trying to delete department with employees', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [{ COUNT: 5 }] });

            // Act & Assert
            await expect(departmentService.deleteDepartment(1))
                .rejects
                .toThrow('Cannot delete department with existing employees');
            expect(executeQuery).toHaveBeenCalledTimes(1);
        });

        it('should handle delete operation error', async () => {
            // Arrange
            executeQuery
                .mockResolvedValueOnce({ rows: [{ COUNT: 0 }] })
                .mockRejectedValueOnce(new Error('Delete failed'));

            // Act & Assert
            await expect(departmentService.deleteDepartment(1))
                .rejects
                .toThrow('Delete failed');
        });
    });
});