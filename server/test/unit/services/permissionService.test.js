// test/unit/services/permissionService.test.js

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
const permissionService = require('../../../src/services/permissionService');

describe('PermissionService', () => {
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

    describe('getAllPermissions', () => {
        it('should return all permissions with their details', async () => {
            // Arrange
            const mockPermissions = {
                rows: [
                    {
                        PERMISSION_ID: 1,
                        SCREEN_NAME: 'UserManagement',
                        ACCESS_LEVEL: 'Write',
                        POSITION_ID: 1,
                        POSITION_NAME: 'Admin'
                    },
                    {
                        PERMISSION_ID: 2,
                        SCREEN_NAME: 'Reports',
                        ACCESS_LEVEL: 'Read',
                        POSITION_ID: 2,
                        POSITION_NAME: 'User'
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockPermissions);

            // Act
            const result = await permissionService.getAllPermissions();

            // Assert
            expect(result).toEqual(mockPermissions.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.any(Array)
            );
        });

        it('should handle database errors', async () => {
            // Arrange
            executeQuery.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(permissionService.getAllPermissions())
                .rejects
                .toThrow('Database error');
        });
    });

    describe('getPermissionsByPosition', () => {
        it('should return permissions for specific position', async () => {
            // Arrange
            const mockPositionPermissions = {
                rows: [
                    {
                        PERMISSION_ID: 1,
                        SCREEN_NAME: 'UserManagement',
                        ACCESS_LEVEL: 'Write'
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockPositionPermissions);

            // Act
            const result = await permissionService.getPermissionsByPosition(1);

            // Assert
            expect(result).toEqual(mockPositionPermissions.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE position_id = :positionId'),
                [1]
            );
        });

        it('should return empty array for position with no permissions', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await permissionService.getPermissionsByPosition(1);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('updatePositionPermissions', () => {
        it('should update permissions successfully', async () => {
            // Arrange
            const positionId = 1;
            const newPermissions = [
                { screenName: 'UserManagement', accessLevel: 'Write' },
                { screenName: 'Reports', accessLevel: 'Read' }
            ];

            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete old permissions
                .mockResolvedValueOnce({ rowsAffected: 1 }) // First insert
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Second insert

            const mockUpdatedPermissions = {
                rows: newPermissions
            };
            executeQuery.mockResolvedValue(mockUpdatedPermissions);

            // Act
            const result = await permissionService.updatePositionPermissions(positionId, newPermissions);

            // Assert
            expect(result).toEqual(newPermissions);
            expect(mockConnection.execute).toHaveBeenCalledTimes(3);
            expect(mockConnection.commit).toHaveBeenCalled();
        });

        it('should rollback on error during update', async () => {
            // Arrange
            const positionId = 1;
            const newPermissions = [
                { screenName: 'UserManagement', accessLevel: 'Write' }
            ];

            mockConnection.execute
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete succeeds
                .mockRejectedValue(new Error('Insert failed')); // Insert fails

            // Act & Assert
            await expect(permissionService.updatePositionPermissions(positionId, newPermissions))
                .rejects
                .toThrow('Insert failed');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('checkPermission', () => {
        it('should return true when user has sufficient permission', async () => {
            // Arrange
            const mockPermission = {
                rows: [{ ACCESS_LEVEL: 'Write' }]
            };
            executeQuery.mockResolvedValue(mockPermission);

            // Act
            const result = await permissionService.checkPermission(1, 'UserManagement', 'Read');

            // Assert
            expect(result).toBe(true);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT ap.access_level'),
                [1, 'UserManagement']
            );
        });

        it('should return false when user has insufficient permission', async () => {
            // Arrange
            const mockPermission = {
                rows: [{ ACCESS_LEVEL: 'Read' }]
            };
            executeQuery.mockResolvedValue(mockPermission);

            // Act
            const result = await permissionService.checkPermission(1, 'UserManagement', 'Write');

            // Assert
            expect(result).toBe(false);
        });

        it('should return false when user has no permission', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await permissionService.checkPermission(1, 'UserManagement', 'Read');

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('getAvailableScreens', () => {
        it('should return list of unique screen names', async () => {
            // Arrange
            const mockScreens = {
                rows: [
                    { SCREEN_NAME: 'UserManagement' },
                    { SCREEN_NAME: 'Reports' }
                ]
            };
            executeQuery.mockResolvedValue(mockScreens);

            // Act
            const result = await permissionService.getAvailableScreens();

            // Assert
            expect(result).toEqual(mockScreens.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT DISTINCT screen_name')
            );
        });

        it('should return empty array when no screens available', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await permissionService.getAvailableScreens();

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('getUserPermissions', () => {
        it('should return all permissions for a user', async () => {
            // Arrange
            const mockUserPermissions = {
                rows: [
                    {
                        SCREEN_NAME: 'UserManagement',
                        ACCESS_LEVEL: 'Write'
                    },
                    {
                        SCREEN_NAME: 'Reports',
                        ACCESS_LEVEL: 'Read'
                    }
                ]
            };
            executeQuery.mockResolvedValue(mockUserPermissions);

            // Act
            const result = await permissionService.getUserPermissions(1);

            // Assert
            expect(result).toEqual(mockUserPermissions.rows);
            expect(executeQuery).toHaveBeenCalledWith(
                expect.stringContaining('WHERE e.employee_id = :employeeId'),
                [1]
            );
        });

        it('should return empty array for user with no permissions', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act
            const result = await permissionService.getUserPermissions(1);

            // Assert
            expect(result).toEqual([]);
        });

        it('should handle database errors', async () => {
            // Arrange
            executeQuery.mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(permissionService.getUserPermissions(1))
                .rejects
                .toThrow('Database error');
        });
    });
});