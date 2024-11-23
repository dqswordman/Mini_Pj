const express = require('express');
const departmentController = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取所有部门
router.get('/', authorize('Admin', 'Manager'), departmentController.getAllDepartments);

// 获取特定部门
router.get('/:id', authorize('Admin', 'Manager'), departmentController.getDepartmentById);

// 获取部门员工
router.get('/:id/employees', authorize('Admin', 'Manager'), departmentController.getDepartmentEmployees);

// 创建新部门
router.post('/', authorize('Admin'), departmentController.createDepartment);

// 更新部门
router.put('/:id', authorize('Admin'), departmentController.updateDepartment);

// 删除部门
router.delete('/:id', authorize('Admin'), departmentController.deleteDepartment);

module.exports = router;