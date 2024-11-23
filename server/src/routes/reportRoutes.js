const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证和管理员权限
router.use(authenticate);
router.use(authorize('Admin', 'Manager'));

// 获取会议室使用统计
router.get('/room-usage', reportController.getRoomUsageStats);

// 获取每日使用统计
router.get('/daily-usage/:roomId', reportController.getDailyUsageStats);

// 获取预订使用对比
router.get('/booking-usage', reportController.getBookingUsageStats);

// 获取锁定统计
router.get('/lock-stats', reportController.getLockStats);

// 获取部门锁定历史
router.get('/lock-history/:departmentId', reportController.getLockHistory);

// 获取系统日志统计
router.get('/system-logs', reportController.getSystemLogsStats);

module.exports = router;