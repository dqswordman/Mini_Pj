const express = require('express');
const accessController = require('../controllers/accessController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 记录访问
router.post('/record', accessController.recordAccess);

// 生成QR码
router.get('/qr-code/:bookingId', accessController.generateQRCode);

// 获取访问记录
router.get('/logs/:bookingId', 
  authorize('Admin', 'Manager'),
  accessController.getAccessLogs);

// 检查未使用的预订 (管理员)
router.get('/unused-bookings',
  authorize('Admin'),
  accessController.checkUnusedBookings);

module.exports = router;