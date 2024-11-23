const authService = require('../services/authService');
const { successResponse, errorResponse, STATUS_CODES } = require('../utils/responseUtils');

class AuthController {
    async register(req, res) {
        try {
            const { email, password, name, phoneNumber, departmentId, positionId } = req.body;

            // 验证必填字段
            if (!email || !password || !name) {
                return res.status(STATUS_CODES.BAD_REQUEST)
                    .json(errorResponse('Email, password and name are required'));
            }

            const user = await authService.register({
                email,
                password,
                name,
                phoneNumber,
                departmentId,
                positionId
            });

            res.status(STATUS_CODES.CREATED)
                .json(successResponse(user, 'User registered successfully'));
        } catch (error) {
            if (error.message.includes('already exists')) {
                return res.status(STATUS_CODES.BAD_REQUEST)
                    .json(errorResponse('Email already exists'));
            }
            res.status(STATUS_CODES.INTERNAL_ERROR)
                .json(errorResponse('Registration failed'));
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(STATUS_CODES.BAD_REQUEST)
                    .json(errorResponse('Email and password are required'));
            }

            const result = await authService.login(email, password);
            res.json(successResponse(result, 'Login successful'));
        } catch (error) {
            if (error.message === 'Invalid credentials') {
                return res.status(STATUS_CODES.UNAUTHORIZED)
                    .json(errorResponse('Invalid credentials'));
            }
            res.status(STATUS_CODES.INTERNAL_ERROR)
                .json(errorResponse('Login failed'));
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const user = await authService.getUserProfile(userId);
            res.json(successResponse(user));
        } catch (error) {
            res.status(STATUS_CODES.INTERNAL_ERROR)
                .json(errorResponse('Failed to get user profile'));
        }
    }

    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            if (!currentPassword || !newPassword) {
                return res.status(STATUS_CODES.BAD_REQUEST)
                    .json(errorResponse('Current password and new password are required'));
            }

            await authService.changePassword(userId, currentPassword, newPassword);
            res.json(successResponse(null, 'Password changed successfully'));
        } catch (error) {
            if (error.message === 'Invalid current password') {
                return res.status(STATUS_CODES.BAD_REQUEST)
                    .json(errorResponse('Invalid current password'));
            }
            res.status(STATUS_CODES.INTERNAL_ERROR)
                .json(errorResponse('Failed to change password'));
        }
    }
}

module.exports = new AuthController();