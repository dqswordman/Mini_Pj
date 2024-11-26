// test/unit/services/authService.test.js

// 引入测试辅助工具
const { mockEmployee, mockToken } = require('../../helpers/mockData.js');
const oracledb = require('../../helpers/dbMock.js');

// Mock database
jest.mock('../../../src/config/database.js', () => ({
   executeSQL: jest.fn(),
   executeQuery: jest.fn()
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
   genSalt: jest.fn(),
   hash: jest.fn(),
   compare: jest.fn()
}));

// Mock jwtUtils
jest.mock('../../../src/utils/jwtUtils.js', () => ({
   generateToken: jest.fn()
}));

// 导入依赖
const { executeSQL } = require('../../../src/config/database.js');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../../src/utils/jwtUtils.js');
const authService = require('../../../src/services/authService.js');

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
           email: mockEmployee.EMAIL,
           password: 'password123',
           name: mockEmployee.NAME,
           phoneNumber: mockEmployee.PHONE_NUMBER,
           departmentId: 1,
           positionId: 1
       };

       it('should register a new user successfully', async () => {
           // Arrange
           mockConnection.execute
               .mockImplementation((sql) => {
                   if (sql === 'BEGIN') {
                       return Promise.resolve();
                   }
                   if (sql.includes('SELECT COUNT(*)')) {
                       return Promise.resolve({
                           rows: [{ COUNT: 0 }]
                       });
                   }
                   if (sql.includes('INSERT INTO Employees')) {
                       return Promise.resolve({
                           outBinds: { employee_id: [1] },
                           rowsAffected: 1
                       });
                   }
                   return Promise.resolve({ rowsAffected: 1 });
               });

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
           mockConnection.execute
               .mockImplementation((sql) => {
                   if (sql === 'BEGIN') {
                       return Promise.resolve();
                   }
                   if (sql.includes('SELECT COUNT(*)')) {
                       return Promise.resolve({
                           rows: [{ COUNT: 1 }]
                       });
                   }
                   return Promise.resolve({ rows: [] });
               });

           // Act & Assert
           await expect(authService.register(mockUserData))
               .rejects
               .toThrow('Email already exists');
           expect(mockConnection.rollback).toHaveBeenCalled();
           expect(mockConnection.close).toHaveBeenCalled();
       });

       it('should handle database errors during registration', async () => {
           // Arrange
           const dbError = new Error('Database error');
           mockConnection.execute.mockRejectedValue(dbError);

           // Act & Assert
           await expect(authService.register(mockUserData))
               .rejects
               .toThrow(dbError);
           expect(mockConnection.rollback).toHaveBeenCalled();
           expect(mockConnection.close).toHaveBeenCalled();
       });
   });

   describe('login', () => {
    const mockCredentials = {
        email: mockEmployee.EMAIL,
        password: 'password123'
    };

    it('should login successfully with valid credentials', async () => {
        // Arrange
        mockConnection.execute.mockResolvedValue({
            rows: [mockEmployee]
        });
        bcrypt.compare.mockResolvedValue(true);
        generateToken.mockReturnValue(mockToken);

        // Act
        const result = await authService.login(
            mockCredentials.email,
            mockCredentials.password
        );

        // Assert
        expect(result).toEqual({
            token: mockToken,
            user: {
                id: mockEmployee.EMPLOYEE_ID,
                name: mockEmployee.NAME,
                email: mockEmployee.EMAIL,
                position: mockEmployee.POSITION_NAME
            }
        });
        expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
        // Arrange
        mockConnection.execute.mockResolvedValue({ rows: [] });

        // Act & Assert
        await expect(authService.login(mockCredentials.email, mockCredentials.password))
            .rejects
            .toThrow('Invalid credentials');
        expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should throw error if account is locked', async () => {
        // Arrange
        mockConnection.execute.mockResolvedValue({
            rows: [{
                ...mockEmployee,
                IS_LOCKED: 1
            }]
        });

        // Act & Assert
        await expect(authService.login(mockCredentials.email, mockCredentials.password))
            .rejects
            .toThrow('Account is locked');
        expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
        // Arrange
        mockConnection.execute.mockResolvedValue({
            rows: [mockEmployee]
        });
        bcrypt.compare.mockResolvedValue(false);

        // Act & Assert
        await expect(authService.login(mockCredentials.email, mockCredentials.password))
            .rejects
            .toThrow('Invalid credentials');
        expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle database errors during login', async () => {
        // Arrange
        const dbError = new Error('Database error');
        mockConnection.execute.mockRejectedValue(dbError);

        // Act & Assert
        await expect(authService.login(mockCredentials.email, mockCredentials.password))
            .rejects
            .toThrow(dbError);
        expect(mockConnection.close).toHaveBeenCalled();
    });
});

describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
        // Arrange
        const mockProfile = {
            rows: [{
                EMPLOYEE_ID: mockEmployee.EMPLOYEE_ID,
                NAME: mockEmployee.NAME,
                EMAIL: mockEmployee.EMAIL,
                PHONE_NUMBER: mockEmployee.PHONE_NUMBER,
                DEPARTMENT_NAME: 'IT',
                POSITION_NAME: mockEmployee.POSITION_NAME
            }]
        };
        mockConnection.execute.mockResolvedValue(mockProfile);

        // Act
        const result = await authService.getUserProfile(mockEmployee.EMPLOYEE_ID);

        // Assert
        expect(result).toEqual(mockProfile.rows[0]);
        expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
        // Arrange
        mockConnection.execute.mockResolvedValue({ rows: [] });

        // Act & Assert
        await expect(authService.getUserProfile(999))
            .rejects
            .toThrow('User not found');
        expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle database errors when getting profile', async () => {
        // Arrange
        const dbError = new Error('Database error');
        mockConnection.execute.mockRejectedValue(dbError);

        // Act & Assert
        await expect(authService.getUserProfile(mockEmployee.EMPLOYEE_ID))
            .rejects
            .toThrow(dbError);
        expect(mockConnection.close).toHaveBeenCalled();
    });
});

   describe('changePassword', () => {
       it('should change password successfully', async () => {
           // Arrange
           mockConnection.execute
               .mockImplementation((sql) => {
                   if (sql === 'BEGIN') {
                       return Promise.resolve();
                   }
                   if (sql.includes('SELECT password_hash')) {
                       return Promise.resolve({
                           rows: [{ PASSWORD_HASH: 'oldHash' }]
                       });
                   }
                   if (sql.includes('UPDATE UserCredentials')) {
                       return Promise.resolve({
                           rowsAffected: 1
                       });
                   }
                   return Promise.resolve({ rows: [] });
               });

           bcrypt.compare.mockResolvedValue(true);
           bcrypt.genSalt.mockResolvedValue('salt');
           bcrypt.hash.mockResolvedValue('newHash');

           // Act
           await authService.changePassword(mockEmployee.EMPLOYEE_ID, 'currentPassword', 'newPassword');

           // Assert
           expect(mockConnection.commit).toHaveBeenCalled();
           expect(mockConnection.close).toHaveBeenCalled();
           expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 'salt');
       });

       it('should throw error if user not found', async () => {
           // Arrange
           mockConnection.execute
               .mockImplementation((sql) => {
                   if (sql === 'BEGIN') {
                       return Promise.resolve();
                   }
                   return Promise.resolve({ rows: [] });
               });

           // Act & Assert
           await expect(authService.changePassword(999, 'old', 'new'))
               .rejects
               .toThrow('User not found');
           expect(mockConnection.rollback).toHaveBeenCalled();
           expect(mockConnection.close).toHaveBeenCalled();
       });

       it('should throw error if current password is invalid', async () => {
           // Arrange
           mockConnection.execute
               .mockImplementation((sql) => {
                   if (sql === 'BEGIN') {
                       return Promise.resolve();
                   }
                   if (sql.includes('SELECT password_hash')) {
                       return Promise.resolve({
                           rows: [{ PASSWORD_HASH: 'hash' }]
                       });
                   }
                   return Promise.resolve({ rows: [] });
               });
           bcrypt.compare.mockResolvedValue(false);

           // Act & Assert
           await expect(authService.changePassword(mockEmployee.EMPLOYEE_ID, 'wrong', 'new'))
               .rejects
               .toThrow('Invalid current password');
           expect(mockConnection.rollback).toHaveBeenCalled();
           expect(mockConnection.close).toHaveBeenCalled();
       });

       it('should handle database errors during password change', async () => {
           // Arrange
           const dbError = new Error('Database error');
           mockConnection.execute.mockRejectedValue(dbError);

           // Act & Assert
           await expect(authService.changePassword(mockEmployee.EMPLOYEE_ID, 'current', 'new'))
               .rejects
               .toThrow(dbError);
           expect(mockConnection.rollback).toHaveBeenCalled();
           expect(mockConnection.close).toHaveBeenCalled();
       });

       it('should handle connection closing errors gracefully', async () => {
           // Arrange
           const closeError = new Error('Close connection error');
           mockConnection.close.mockRejectedValue(closeError);
           mockConnection.execute
               .mockImplementation((sql) => {
                   if (sql === 'BEGIN') {
                       return Promise.resolve();
                   }
                   if (sql.includes('SELECT password_hash')) {
                       return Promise.resolve({
                           rows: [{ PASSWORD_HASH: 'hash' }]
                       });
                   }
                   if (sql.includes('UPDATE UserCredentials')) {
                       return Promise.resolve({
                           rowsAffected: 1
                       });
                   }
                   return Promise.resolve({ rows: [] });
               });

           bcrypt.compare.mockResolvedValue(true);
           bcrypt.hash.mockResolvedValue('newHash');

           // Act
           await authService.changePassword(mockEmployee.EMPLOYEE_ID, 'current', 'new');

           // Assert
           expect(mockConnection.commit).toHaveBeenCalled();
           expect(mockConnection.close).toHaveBeenCalled();
           // 即使关闭连接失败，方法也应该完成
       });
   });
});