const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// 基础路由测试
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 认证路由 (无需验证)
router.use('/auth', require('./authRoutes'));

// 添加部门路由
router.use('/departments', require('./departmentRoutes'));

// 添加职位路由
router.use('/positions', require('./positionRoutes'));

// 添加权限路由
router.use('/permissions', require('./permissionRoutes'));

// 添加访问路由
router.use('/access', require('./accessRoutes'));

// 添加预订路由
router.use('/bookings', require('./bookingRoutes'));

// 添加报表路由
router.use('/reports', require('./reportRoutes'));

// 添加锁定路由
router.use('/locks', require('./lockRoutes'));

// 需要认证的路由
router.use('/employees', authenticate, require('./employeeRoutes'));
// 后续会添加更多路由...
// router.use('/departments', authenticate, require('./departmentRoutes'));
// router.use('/positions', authenticate, require('./positionRoutes'));
// router.use('/rooms', authenticate, require('./roomRoutes'));

// 处理 404
router.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

module.exports = router;