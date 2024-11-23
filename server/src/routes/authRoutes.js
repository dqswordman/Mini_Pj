const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// 公开路由
router.post('/register', authController.register);
router.post('/login', authController.login);

// 需要认证的路由
router.get('/me', authenticate, authController.getProfile);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;