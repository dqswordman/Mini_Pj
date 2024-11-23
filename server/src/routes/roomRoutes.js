const express = require('express');
const roomController = require('../controllers/roomController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticate);

// 搜索会议室
router.get('/search', roomController.searchRooms);

// 获取所有会议室
router.get('/', roomController.getAllRooms);

// 获取特定会议室
router.get('/:id', roomController.getRoomById);

// 获取会议室可用性
router.get('/:id/availability', roomController.getRoomAvailability);

// 创建新会议室 (仅管理员)
router.post('/', authorize('Admin'), roomController.createRoom);

// 更新会议室信息 (仅管理员)
router.put('/:id', authorize('Admin'), roomController.updateRoom);

// 删除会议室 (仅管理员)
router.delete('/:id', authorize('Admin'), roomController.deleteRoom);

module.exports = router;