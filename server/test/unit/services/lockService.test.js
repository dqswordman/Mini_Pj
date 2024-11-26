// test/unit/services/lockService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
}));

jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    NUMBER: 'NUMBER',
    BIND_OUT: 'BIND_OUT'
}));

// Import dependencies AFTER setting up mocks
const { executeQuery } = require('../../../src/config/database');
const oracledb = require('oracledb');
const lockService = require('../../../src/services/lockService');

describe('LockService', () => {
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

    describe('checkUnusedBookingsCount', () => {
        it('should return count of unused bookings', async () => {
            // Arrange
            const mockResult = {
                rows: [{ UNUSED_COUNT: 3 }]
            };
            executeQuery.mockResolvedValue(mockResult);

            // Act
            const result = await lockService.checkUnusedBookingsCount(1, 30);

            // Assert
            expect(result).toBe(3);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('INTERVAL \'30\' DAY'),
                [1]
            );
        });

        it('should handle database errors', async () => {
            // Arrange
            executeQuery.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(lockService.checkUnusedBookingsCount(1))
                .rejects
                .toThrow('Database error');
        });
    });

    describe('lockEmployee', () => {
        it('should lock employee successfully', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Update employee status
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Insert unlock request

            // Act
            const result = await lockService.lockEmployee(1, 'Multiple unused bookings');

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        it('should rollback on error', async () => {
            // Arrange
            mockConnection.execute.mockRejectedValue(new Error('Lock failed'));

            // Act & Assert
            await expect(lockService.lockEmployee(1, 'Test reason'))
                .rejects
                .toThrow('Lock failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('unlockEmployee', () => {
        it('should unlock employee successfully', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Update employee status
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Update unlock request

            // Act
            const result = await lockService.unlockEmployee(1, 2, 'Approved after review');

            // Assert
            expect(result).toEqual({ success: true });
            expect(mockConnection.execute).toHaveBeenCalledTimes(2);
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE Employees'),
                [1]
            );
        });

        it('should rollback on error', async () => {
            // Arrange
            mockConnection.execute.mockRejectedValue(new Error('Unlock failed'));

            // Act & Assert
            await expect(lockService.unlockEmployee(1, 2, 'Test reason'))
                .rejects
                .toThrow('Unlock failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });

    describe('getLockHistory', () => {
        it('should return lock history for employee', async () => {
            // Arrange
            const mockHistory = {
                rows: [{
                    EMPLOYEE_ID: 1,
                    EMPLOYEE_NAME: 'John Doe',
                    REQUEST_TIME: new Date(),
                    APPROVAL_STATUS: 'Pending',
                    APPROVAL_REASON: 'Multiple unused bookings'
                }]
            };
            executeQuery.mockResolvedValue(mockHistory);

            // Act
            const result = await lockService.getLockHistory(1);

            // Assert
            expect(result).toEqual(mockHistory.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                [1]
            );
        });

        it('should handle empty history', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await lockService.getLockHistory(1);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getPendingUnlockRequests', () => {
        it('should return all pending unlock requests', async () => {
            // Arrange
            const mockRequests = {
                rows: [{
                    EMPLOYEE_ID: 1,
                    EMPLOYEE_NAME: 'John Doe',
                    EMAIL: 'john@example.com',
                    DEPARTMENT_NAME: 'IT',
                    REQUEST_TIME: new Date(),
                    APPROVAL_REASON: 'Multiple unused bookings'
                }]
            };
            executeQuery.mockResolvedValue(mockRequests);

            // Act
            const result = await lockService.getPendingUnlockRequests();

            // Assert
            expect(result).toEqual(mockRequests.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('approval_status = \'Pending\'')
            );
        });

        it('should return empty array when no pending requests', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await lockService.getPendingUnlockRequests();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('autoCheckAndLock', () => {
        it('should automatically lock eligible employees', async () => {
            // Arrange
            const mockEligibleEmployees = {
                rows: [{
                    EMPLOYEE_ID: 1,
                    EMPLOYEE_NAME: 'John Doe',
                    UNUSED_COUNT: 3
                }]
            };

            mockConnection.execute
                .mockResolvedValueOnce(mockEligibleEmployees) // Get eligible employees
                .mockResolvedValueOnce({ rowsAffected: 1 })   // Update employee status
                .mockResolvedValueOnce({ rowsAffected: 1 });  // Insert unlock request

            // Act
            const result = await lockService.autoCheckAndLock();

            // Assert
            expect(result).toEqual(mockEligibleEmployees.rows);
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.execute).toHaveBeenCalledWith(
                expect.stringContaining('SET is_locked = 1'),
                [1]
            );
        });

        it('should handle no eligible employees', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValueOnce({ rows: [] });

            // Act
            const result = await lockService.autoCheckAndLock();

            // Assert
            expect(result).toEqual([]);
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.execute).toHaveBeenCalledTimes(1);
        });

        it('should rollback on error during auto lock', async () => {
            // Arrange
            const mockEligibleEmployees = {
                rows: [{
                    EMPLOYEE_ID: 1,
                    EMPLOYEE_NAME: 'John Doe',
                    UNUSED_COUNT: 3
                }]
            };

            mockConnection.execute
                .mockResolvedValueOnce(mockEligibleEmployees)
                .mockRejectedValue(new Error('Lock failed'));

            // Act & Assert
            await expect(lockService.autoCheckAndLock())
                .rejects
                .toThrow('Lock failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });

        it('should handle transaction properly for multiple employees', async () => {
            // Arrange
            const mockEligibleEmployees = {
                rows: [
                    { EMPLOYEE_ID: 1, EMPLOYEE_NAME: 'John Doe', UNUSED_COUNT: 3 },
                    { EMPLOYEE_ID: 2, EMPLOYEE_NAME: 'Jane Doe', UNUSED_COUNT: 4 }
                ]
            };

            mockConnection.execute
                .mockResolvedValueOnce(mockEligibleEmployees)
                .mockResolvedValue({ rowsAffected: 1 }); // For all subsequent calls

            // Act
            const result = await lockService.autoCheckAndLock();

            // Assert
            expect(result).toEqual(mockEligibleEmployees.rows);
            expect(mockConnection.execute).toHaveBeenCalledTimes(5); // 1 select + 2 employees * 2 operations
            expect(mockConnection.commit).toHaveBeenCalled();
        });
    });
});