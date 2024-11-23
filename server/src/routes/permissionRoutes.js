const express = require('express');
const permissionController = require('../controllers/permissionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取所有权限配置
router.get('/', authorize('Admin'), permissionController.getAllPermissions);

// 获取可用的屏幕列表
router.get('/screens', authorize('Admin'), permissionController.getAvailableScreens);

// 获取职位的权限
router.get('/position/:positionId', authorize('Admin'), 
  permissionController.getPermissionsByPosition);

// 更新职位的权限
router.put('/position/:positionId', authorize('Admin'), 
  permissionController.updatePositionPermissions);

// 检查权限
router.post('/check', authenticate, permissionController.checkPermission);

// 获取用户的所有权限
router.get('/user/:employeeId', authorize('Admin', 'Manager'), 
  permissionController.getUserPermissions);

module.exports = router;