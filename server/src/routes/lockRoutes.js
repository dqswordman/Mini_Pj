const express = require('express');
const lockController = require('../controllers/lockController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 所有路由都需要管理员权限
router.use(authorize('Admin'));

// 锁定员工
router.post('/:employeeId/lock', lockController.lockEmployee);

// 解锁员工
router.post('/:employeeId/unlock', lockController.unlockEmployee);

// 获取锁定历史
router.get('/:employeeId/history', lockController.getLockHistory);

// 获取待处理的解锁请求
router.get('/pending-requests', lockController.getPendingUnlockRequests);

// 自动检查和锁定
router.post('/auto-check', lockController.autoCheckAndLock);

module.exports = router;