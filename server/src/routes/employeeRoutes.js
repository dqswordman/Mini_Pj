const express = require('express');
const employeeController = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取所有员工
router.get('/', authorize('Admin', 'Manager'), employeeController.getAllEmployees);

// 获取特定员工
router.get('/:id', authorize('Admin', 'Manager'), employeeController.getEmployeeById);

// 创建新员工
router.post('/', authorize('Admin'), employeeController.createEmployee);

// 更新员工信息
router.put('/:id', authorize('Admin'), employeeController.updateEmployee);

// 删除员工
router.delete('/:id', authorize('Admin'), employeeController.deleteEmployee);

module.exports = router;