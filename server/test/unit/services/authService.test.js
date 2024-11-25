// test/unit/services/authService.test.js

// Mock dependencies BEFORE requiring modules
jest.mock('../../../src/config/database', () => ({
    executeQuery: jest.fn()
}));

jest.mock('bcrypt', () => ({
    genSalt: jest.fn(),
    hash: jest.fn(),
    compare: jest.fn()
}));

jest.mock('../../../src/utils/jwtUtils', () => ({
    generateToken: jest.fn()
}));

jest.mock('oracledb', () => ({
    getConnection: jest.fn(),
    NUMBER: 'NUMBER',
    BIND_OUT: 'BIND_OUT'
}));

// Import dependencies AFTER setting up mocks
const { executeQuery } = require('../../../src/config/database');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../../src/utils/jwtUtils');
const oracledb = require('oracledb');
const authService = require('../../../src/services/authService');

describe('AuthService', () => {
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

    describe('register', () => {
        const mockUserData = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
            phoneNumber: '1234567890',
            departmentId: 1,
            positionId: 1
        };

        it('should register a new user successfully', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ COUNT: 0 }] }) // Email check
                .mockResolvedValueOnce({ outBinds: { employee_id: [1] } }) // Employee insert
                .mockResolvedValueOnce({ rowsAffected: 1 }) // Department position insert
                .mockResolvedValueOnce({ rowsAffected: 1 }); // Credentials insert

            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');

            // Act
            const result = await authService.register(mockUserData);

            // Assert
            expect(result).toEqual({
                employeeId: 1,
                name: mockUserData.name,
                email: mockUserData.email,
                phoneNumber: mockUserData.phoneNumber
            });
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error if email already exists', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValueOnce({ rows: [{ COUNT: 1 }] });

            // Act & Assert
            await expect(authService.register(mockUserData))
                .rejects
                .toThrow('Email already exists');
            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });
    });

    describe('login', () => {
        const mockCredentials = {
            email: 'test@example.com',
            password: 'password123'
        };

        it('should login successfully with valid credentials', async () => {
            // Arrange
            const mockUser = {
                rows: [{
                    EMPLOYEE_ID: 1,
                    NAME: 'Test User',
                    EMAIL: 'test@example.com',
                    PASSWORD_HASH: 'hashedPassword',
                    IS_LOCKED: 0,
                    POSITION_NAME: 'Manager'
                }]
            };

            executeQuery.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            generateToken.mockReturnValue('mockToken');

            // Act
            const result = await authService.login(
                mockCredentials.email,
                mockCredentials.password
            );

            // Assert
            expect(result).toEqual({
                token: 'mockToken',
                user: {
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                    position: 'Manager'
                }
            });
        });

        it('should throw error if user not found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(authService.login(mockCredentials.email, mockCredentials.password))
                .rejects
                .toThrow('Invalid credentials');
        });

        it('should throw error if account is locked', async () => {
            // Arrange
            const mockUser = {
                rows: [{
                    IS_LOCKED: 1,
                    PASSWORD_HASH: 'hashedPassword'
                }]
            };
            executeQuery.mockResolvedValue(mockUser);

            // Act & Assert
            await expect(authService.login(mockCredentials.email, mockCredentials.password))
                .rejects
                .toThrow('Account is locked');
        });

        it('should throw error if password is invalid', async () => {
            // Arrange
            const mockUser = {
                rows: [{
                    IS_LOCKED: 0,
                    PASSWORD_HASH: 'hashedPassword'
                }]
            };
            executeQuery.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            // Act & Assert
            await expect(authService.login(mockCredentials.email, mockCredentials.password))
                .rejects
                .toThrow('Invalid credentials');
        });
    });

    describe('getUserProfile', () => {
        it('should return user profile successfully', async () => {
            // Arrange
            const mockProfile = {
                rows: [{
                    EMPLOYEE_ID: 1,
                    NAME: 'Test User',
                    EMAIL: 'test@example.com',
                    PHONE_NUMBER: '1234567890',
                    DEPARTMENT_NAME: 'IT',
                    POSITION_NAME: 'Developer'
                }]
            };
            executeQuery.mockResolvedValue(mockProfile);

            // Act
            const result = await authService.getUserProfile(1);

            // Assert
            expect(result).toEqual(mockProfile.rows[0]);
        });

        it('should throw error if user not found', async () => {
            // Arrange
            executeQuery.mockResolvedValue({ rows: [] });

            // Act & Assert
            await expect(authService.getUserProfile(1))
                .rejects
                .toThrow('User not found');
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            // Arrange
            const userId = 1;
            const currentPassword = 'oldPassword';
            const newPassword = 'newPassword';

            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ PASSWORD_HASH: 'oldHash' }] })
                .mockResolvedValueOnce({ rowsAffected: 1 });

            bcrypt.compare.mockResolvedValue(true);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('newHash');

            // Act
            await authService.changePassword(userId, currentPassword, newPassword);

            // Assert
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should throw error if user not found', async () => {
            // Arrange
            mockConnection.execute.mockResolvedValueOnce({ rows: [] });

            // Act & Assert
            await expect(authService.changePassword(1, 'old', 'new'))
                .rejects
                .toThrow('User not found');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });

        it('should throw error if current password is invalid', async () => {
            // Arrange
            mockConnection.execute
                .mockResolvedValueOnce({ rows: [{ PASSWORD_HASH: 'hash' }] });
            bcrypt.compare.mockResolvedValue(false);

            // Act & Assert
            await expect(authService.changePassword(1, 'wrong', 'new'))
                .rejects
                .toThrow('Invalid current password');
            expect(mockConnection.rollback).toHaveBeenCalled();
        });
    });
});