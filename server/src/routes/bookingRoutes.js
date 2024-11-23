const express = require('express');
const bookingController = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 创建预订
router.post('/', bookingController.createBooking);

// 获取当前用户的预订列表
router.get('/my-bookings', bookingController.getUserBookings);

// 获取指定用户的预订列表 (管理员/经理)
router.get('/user/:userId', 
  authorize('Admin', 'Manager'), 
  bookingController.getUserBookings);

// 获取预订详情
router.get('/:id', bookingController.getBookingById);

// 取消预订
router.post('/:id/cancel', bookingController.cancelBooking);

// 审批预订 (管理员)
router.post('/:id/approve',
  authorize('Admin'),
  bookingController.approveBooking);

// 验证SECRET NUMBER
router.post('/verify-secret',
  bookingController.verifySecretNumber);

module.exports = router;