// test/unit/services/systemLogService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
}));

jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    NUMBER: 'NUMBER',
    DATE: 'DATE',
    BIND_OUT: 'BIND_OUT'
}));

// Import dependencies AFTER setting up mocks
const { executeQuery } = require('../../../src/config/database');
const oracledb = require('oracledb');
const systemLogService = require('../../../src/services/systemLogService');

describe('SystemLogService', () => {
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

    describe('getLogs', () => {
        it('should return logs with pagination', async () => {
            // Arrange
            const params = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                page: 1,
                pageSize: 10
            };

            const mockLogs = {
                rows: [
                    {
                        LOG_ID: 1,
                        ACTION: 'Login',
                        USER_ID: 1,
                        USER_NAME: 'John Doe',
                        TIMESTAMP: new Date('2024-01-01T10:00:00'),
                        DETAILS: 'User logged in'
                    }
                ]
            };

            const mockCount = {
                rows: [{ TOTAL_COUNT: 1 }]
            };

            executeQuery
                .mockResolvedValueOnce(mockLogs)      // For logs query
                .mockResolvedValueOnce(mockCount);    // For count query

            // Act
            const result = await systemLogService.getLogs(params);

            // Assert
            expect(result).toEqual({
                logs: mockLogs.rows,
                pagination: {
                    currentPage: 1,
                    pageSize: 10,
                    totalCount: 1,
                    totalPages: 1
                }
            });
            expect(executeQuery).toHaveBeenCalledTimes(2);
        });

        it('should apply action filter when provided', async () => {
            // Arrange
            const params = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                action: 'Login',
                page: 1,
                pageSize: 10
            };

            executeQuery
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ TOTAL_COUNT: 0 }] });

            // Act
            await systemLogService.getLogs(params);

            // Assert
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND sl.action = :action'),
                expect.objectContaining({ action: 'Login' })
            );
        });

        it('should apply userId filter when provided', async () => {
            // Arrange
            const params = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                userId: 1,
                page: 1,
                pageSize: 10
            };

            executeQuery
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ TOTAL_COUNT: 0 }] });

            // Act
            await systemLogService.getLogs(params);

            // Assert
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND sl.user_id = :userId'),
                expect.objectContaining({ userId: 1 })
            );
        });
    });

    describe('getLogStats', () => {
        it('should return stats grouped by action', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    {
                        ACTION: 'Login',
                        COUNT: 10,
                        UNIQUE_USERS: 5,
                        FIRST_OCCURRENCE: new Date('2024-01-01T00:00:00'),
                        LAST_OCCURRENCE: new Date('2024-01-31T23:59:59')
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await systemLogService.getLogStats(
                '2024-01-01',
                '2024-01-31',
                'action'
            );

            // Assert
            expect(result).toEqual(mockStats.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('GROUP BY action'),
                expect.any(Object)
            );
        });

        it('should return stats grouped by user', async () => {
            // Arrange
            const mockStats = {
                rows: [
                    {
                        USER_ID: 1,
                        USER_NAME: 'John Doe',
                        ACTION_COUNT: 10,
                        UNIQUE_ACTIONS: 3
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockStats);

            // Act
            const result = await systemLogService.getLogStats(
                '2024-01-01',
                '2024-01-31',
                'user'
            );

            // Assert
            expect(result).toEqual(mockStats.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('GROUP BY sl.user_id, e.name'),
                expect.any(Object)
            );
        });

        it('should throw error for invalid groupBy parameter', async () => {
            // Act & Assert
            await expect(
                systemLogService.getLogStats('2024-01-01', '2024-01-31', 'invalid')
            ).rejects.toThrow('Invalid groupBy parameter');
        });
    });

    describe('createLog', () => {
        const mockLogData = {
            action: 'Create',
            userId: 1,
            details: 'Created new user'
        };
    
        it('should create log entry successfully', async () => {
            const timestamp = new Date();
            // 修改executeQuery的返回值格式
            executeQuery.mockResolvedValue({
                outBinds: {
                    log_id: [1],
                    timestamp: [timestamp]
                }
            });
    
            const result = await systemLogService.createLog(mockLogData);
    
            expect(result).toEqual({
                logId: 1,
                ...mockLogData,
                timestamp: timestamp
            });
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO SystemLogs'),
                expect.objectContaining({
                    action: mockLogData.action,
                    userId: mockLogData.userId,
                    details: mockLogData.details,
                    log_id: { type: 'NUMBER', dir: 'BIND_OUT' },
                    timestamp: { type: 'DATE', dir: 'BIND_OUT' }
                })
            );
        });
    
        it('should handle database error when creating log', async () => {
            executeQuery.mockRejectedValue(new Error('Database error'));
    
            await expect(systemLogService.createLog(mockLogData))
                .rejects
                .toThrow('Database error');
        });
    });
    
    describe('cleanupOldLogs', () => {
        it('should delete old logs successfully', async () => {
            // 修正 mock 实现顺序和返回值结构
            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 })  // BEGIN
                .mockResolvedValueOnce({ 
                    rows: [{ COUNT: 5 }],  // 注意这里要返回正确的结构
                    rowsAffected: 1 
                })
                .mockResolvedValueOnce({ 
                    rowsAffected: 5 
                });  // DELETE 操作
    
            const result = await systemLogService.cleanupOldLogs(30);
    
            expect(result).toEqual({
                deletedCount: 5,
                retentionDays: 30
            });
            expect(mockConnection.execute).toHaveBeenCalledTimes(3); // Including BEGIN
            expect(mockConnection.commit).toHaveBeenCalled();
        });
    
        it('should handle no logs to delete', async () => {
            // 修正 mock 实现顺序和返回值结构
            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 })  // BEGIN
                .mockResolvedValueOnce({ 
                    rows: [{ COUNT: 0 }],  // 注意这里要返回正确的结构
                    rowsAffected: 0 
                });
    
            const result = await systemLogService.cleanupOldLogs(30);
    
            expect(result.deletedCount).toBe(0);
            expect(mockConnection.execute).toHaveBeenCalledTimes(2); // Including BEGIN
            expect(mockConnection.commit).toHaveBeenCalled();
        });
    
        it('should rollback on error', async () => {
            mockConnection.execute
                .mockImplementationOnce(() => Promise.resolve())  // BEGIN
                .mockImplementationOnce(() => Promise.reject(new Error('Delete failed')));
    
            await expect(systemLogService.cleanupOldLogs(30))
                .rejects
                .toThrow('Delete failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });
});