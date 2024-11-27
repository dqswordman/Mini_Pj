// test/unit/services/positionService.test.js

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
const positionService = require('../../../src/services/positionService');

describe('PositionService', () => {
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

    // test/unit/services/positionService.test.js

describe('getAllPositions', () => {
    it('should return all positions with counts', async () => {
        // Arrange
        const mockPositions = {
            rows: [
                {
                    POSITION_ID: 1,
                    POSITION_NAME: 'Manager',
                    EMPLOYEE_COUNT: 5,
                    PERMISSION_COUNT: 3
                }
            ]
        };
        executeQuery.mockResolvedValue(mockPositions);

        // Act
        const result = await positionService.getAllPositions();

        // Assert
        expect(result).toEqual(mockPositions.rows);
        expect(executeQuery).toHaveBeenCalled();
        const [query] = executeQuery.mock.calls[0];
        expect(query.toLowerCase()).toContain('select');
    });

    // ... 其他测试用例保持不变 ...
});

    describe('getPositionById', () => {
        it('should return position details when found', async () => {
            // Arrange
            const mockPosition = {
                rows: [{
                    POSITION_ID: 1,
                    POSITION_NAME: 'Manager',
                    EMPLOYEE_COUNT: 5,
                    PERMISSION_COUNT: 3
                }]
            };
            executeQuery.mockResolvedValue(mockPosition);

            // Act
            const result = await positionService.getPositionById(1);

            // Assert
            expect(result).toEqual(mockPosition.rows[0]);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE p.position_id = :positionId'),
                [1]
            );
        });

        it('should throw error when position not found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(positionService.getPositionById(999))
                .rejects
                .toThrow('Position not found');
        });
    });

    describe('getPositionEmployees', () => {
        it('should return employees in position', async () => {
            // Arrange
            const mockEmployees = {
                rows: [
                    {
                        EMPLOYEE_ID: 1,
                        NAME: 'John Doe',
                        EMAIL: 'john@example.com',
                        DEPARTMENT_NAME: 'IT'
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockEmployees);

            // Act
            const result = await positionService.getPositionEmployees(1);

            // Assert
            expect(result).toEqual(mockEmployees.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE edp.position_id = :positionId'),
                [1]
            );
        });

        it('should return empty array when no employees found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await positionService.getPositionEmployees(1);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getPositionPermissions', () => {
        it('should return permissions for position', async () => {
            // Arrange
            const mockPermissions = {
                rows: [
                    {
                        PERMISSION_ID: 1,
                        SCREEN_NAME: 'UserManagement',
                        ACCESS_LEVEL: 'Write'
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockPermissions);

            // Act
            const result = await positionService.getPositionPermissions(1);

            // Assert
            expect(result).toEqual(mockPermissions.rows);
        });
    });

    describe('createPosition', () => {
        it('should create position with permissions successfully', async () => {
            // Arrange
            const positionData = {
                positionName: 'New Position',
                permissions: [
                    { screenName: 'Dashboard', accessLevel: 'Read' }
                ]
            };
    
            mockConnection.execute
                .mockImplementation((sql) => {
                    if (sql === 'BEGIN') {
                        return Promise.resolve();
                    }
                    if (sql.includes('INSERT INTO Positions')) {
                        return Promise.resolve({
                            outBinds: { position_id: [1] }
                        });
                    }
                    if (sql.includes('INSERT INTO AccessPermissions')) {
                        return Promise.resolve({ rowsAffected: 1 });
                    }
                    return Promise.resolve({ rows: [] });
                });
    
            const mockCreatedPosition = {
                rows: [{
                    POSITION_ID: 1,
                    POSITION_NAME: 'New Position',
                    EMPLOYEE_COUNT: 0,
                    PERMISSION_COUNT: 1
                }]
            };
            executeQuery.mockResolvedValue(mockCreatedPosition);
    
            // Act
            const result = await positionService.createPosition(positionData);
    
            // Assert
            expect(result).toEqual(mockCreatedPosition.rows[0]);
            expect(mockConnection.execute).toHaveBeenCalledTimes(3); // BEGIN + Position insert + Permission insert
            expect(mockConnection.commit).toHaveBeenCalled();
        });
    
        it('should create position without permissions', async () => {
            // Arrange
            const positionData = {
                positionName: 'New Position'
            };
    
            mockConnection.execute
                .mockImplementation((sql) => {
                    if (sql === 'BEGIN') {
                        return Promise.resolve();
                    }
                    if (sql.includes('INSERT INTO Positions')) {
                        return Promise.resolve({
                            outBinds: { position_id: [1] }
                        });
                    }
                    return Promise.resolve({ rows: [] });
                });
    
            const mockCreatedPosition = {
                rows: [{
                    POSITION_ID: 1,
                    POSITION_NAME: 'New Position',
                    EMPLOYEE_COUNT: 0,
                    PERMISSION_COUNT: 0
                }]
            };
            executeQuery.mockResolvedValue(mockCreatedPosition);
    
            // Act
            const result = await positionService.createPosition(positionData);
    
            // Assert
            expect(result).toEqual(mockCreatedPosition.rows[0]);
            expect(mockConnection.execute).toHaveBeenCalledTimes(2); // BEGIN + Position insert
        });

        it('should rollback on error', async () => {
            // Arrange
            const positionData = {
                positionName: 'New Position',
                permissions: [{ screenName: 'Dashboard', accessLevel: 'Read' }]
            };

            mockConnection.execute
                .mockResolvedValueOnce({ outBinds: { position_id: [1] } })
                .mockRejectedValue(new Error('Insert failed'));

            // Act & Assert
            await expect(positionService.createPosition(positionData))
                .rejects
                .toThrow('Insert failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('updatePosition', () => {
        it('should handle name-only update', async () => {
            // Arrange
            const updateData = {
                positionName: 'Updated Position'
            };
    
            mockConnection.execute
                .mockImplementation((sql) => {
                    if (sql === 'BEGIN') {
                        return Promise.resolve();
                    }
                    if (sql.includes('UPDATE Positions')) {
                        return Promise.resolve({ rowsAffected: 1 });
                    }
                    return Promise.resolve({ rows: [] });
                });
    
            const mockUpdatedPosition = {
                rows: [{
                    POSITION_ID: 1,
                    POSITION_NAME: 'Updated Position',
                    EMPLOYEE_COUNT: 0,
                    PERMISSION_COUNT: 0
                }]
            };
            executeQuery.mockResolvedValue(mockUpdatedPosition);
    
            // Act
            const result = await positionService.updatePosition(1, updateData);
    
            // Assert
            expect(result).toEqual(mockUpdatedPosition.rows[0]);
            expect(mockConnection.execute).toHaveBeenCalledTimes(2); // BEGIN + UPDATE
            // 验证调用顺序和SQL语句
            expect(mockConnection.execute).toHaveBeenNthCalledWith(1, 'BEGIN');
            expect(mockConnection.execute).toHaveBeenNthCalledWith(2, 
                expect.stringContaining('UPDATE Positions'), 
                expect.any(Object)
            );
            expect(mockConnection.commit).toHaveBeenCalled();
        });
});

    describe('deletePosition', () => {
        it('should delete position with no employees', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ COUNT: 0 }] }) // No employees check
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete permissions
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Delete position

            // Act
            const result = await positionService.deletePosition(1);

            // Assert
            expect(result).toEqual({ message: 'Position deleted successfully' });
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        it('should throw error when position has employees', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ COUNT: 5 }] }); // Has employees

            // Act & Assert
            await expect(positionService.deletePosition(1))
                .rejects
                .toThrow('Cannot delete position with existing employees');
        });

        it('should rollback on delete error', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ COUNT: 0 }] })
                .mockRejectedValue(new Error('Delete failed'));

            // Act & Assert
            await expect(positionService.deletePosition(1))
                .rejects
                .toThrow('Delete failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });
});