const express = require('express');
const positionController = require('../controllers/positionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取所有职位
router.get('/', authorize('Admin', 'Manager'), positionController.getAllPositions);

// 获取特定职位
router.get('/:id', authorize('Admin', 'Manager'), positionController.getPositionById);

// 获取职位下的员工
router.get('/:id/employees', authorize('Admin', 'Manager'), positionController.getPositionEmployees);

// 获取职位权限
router.get('/:id/permissions', authorize('Admin'), positionController.getPositionPermissions);

// 创建新职位
router.post('/', authorize('Admin'), positionController.createPosition);

// 更新职位
router.put('/:id', authorize('Admin'), positionController.updatePosition);

// 删除职位
router.delete('/:id', authorize('Admin'), positionController.deletePosition);

module.exports = router;