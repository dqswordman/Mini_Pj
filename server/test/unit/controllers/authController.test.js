// test/unit/controllers/authController.test.js
const authController = require('../../../src/controllers/authController');
const authService = require('../../../src/services/authService');
const { STATUS_CODES } = require('../../helpers/mockResponse');
const { mockRequest, mockResponse } = require('../../helpers/mockResponse');

// Mock authService
jest.mock('../../../src/services/authService');

describe('AuthController', () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const mockUser = {
        token: 'mock-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      req.body = loginData;
      authService.login.mockResolvedValue(mockUser);

      // Act
      await authController.login(req, res);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        loginData.email,
        loginData.password
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockUser
        })
      );
    });

    it('should return error when credentials are missing', async () => {
      // Arrange
      req.body = {};

      // Act
      await authController.login(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email and password are required'
        })
      );
    });

    it('should handle invalid credentials', async () => {
      // Arrange
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      // Act
      await authController.login(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid credentials'
        })
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      // Arrange
      const mockProfile = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
      };
      
      req.user = { id: 1 };
      authService.getUserProfile.mockResolvedValue(mockProfile);

      // Act
      await authController.getProfile(req, res);

      // Assert
      expect(authService.getUserProfile).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProfile
        })
      );
    });
  });
});