// src/services/bookingService.js

const crypto = require('crypto');
const oracledb = require('oracledb');

class BookingService {
 // 检查时间冲突
 async checkTimeConflict(roomId, startTime, endTime, excludeBookingId = null) {
   let connection;
   try {
     connection = await oracledb.getConnection();
     let query = `
       SELECT COUNT(*) as CONFLICT_COUNT
       FROM Bookings
       WHERE room_id = :roomId
       AND booking_status = 'Approved'
       AND NOT (
         end_time <= :startTime 
         OR start_time >= :endTime
       )
     `;

     const params = {
       roomId: roomId,
       startTime: startTime,
       endTime: endTime
     };

     if (excludeBookingId) {
       query += ` AND booking_id != :excludeBookingId`;
       params.excludeBookingId = excludeBookingId;
     }

     const result = await connection.execute(query, params);
     return result.rows[0].CONFLICT_COUNT > 0;

   } catch (error) {
     throw error;
   } finally {
     if (connection) {
       try {
         await connection.close();
       } catch (err) {
         console.error('Error closing connection:', err);
       }
     }
   }
 }

 // 生成SECRET NUMBER
 generateSecretNumber() {
   return crypto.randomBytes(4).toString('hex').toUpperCase();
 }

 // 创建预订
 async createBooking(bookingData) {
   let connection;
   try {
     connection = await oracledb.getConnection();
     await connection.execute('BEGIN');

     // 检查时间冲突
     const hasConflict = await this.checkTimeConflict(
       bookingData.roomId,
       bookingData.startTime,
       bookingData.endTime
     );

     if (hasConflict) {
       throw new Error('Time slot is already booked');
     }

     // 检查房间是否存在并且未禁用
     const roomResult = await connection.execute(`
       SELECT is_disabled
       FROM Rooms
       WHERE room_id = :roomId
     `, [bookingData.roomId]);

     if (roomResult.rows.length === 0) {
       throw new Error('Room not found');
     }

     if (roomResult.rows[0].IS_DISABLED === 1) {
       throw new Error('Room is disabled');
     }

     // 生成SECRET NUMBER
     const secretNumber = this.generateSecretNumber();

     // 创建预订记录
     const bookingResult = await connection.execute(`
       INSERT INTO Bookings (
         employee_id,
         room_id,
         start_time,
         end_time,
         booking_status,
         secret_number
       ) VALUES (
         :employeeId,
         :roomId,
         :startTime,
         :endTime,
         :status,
         :secretNumber
       ) RETURNING booking_id INTO :booking_id
     `, {
       employeeId: bookingData.employeeId,
       roomId: bookingData.roomId,
       startTime: bookingData.startTime,
       endTime: bookingData.endTime,
       status: 'Pending',
       secretNumber: secretNumber,
       booking_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
     });

     const bookingId = bookingResult.outBinds.booking_id[0];

     // 检查是否需要审批
     const isVipRoom = await this.checkIfVipRoom(connection, bookingData.roomId);

     if (!isVipRoom) {
       // 普通房间直接批准
       await connection.execute(`
         UPDATE Bookings 
         SET booking_status = 'Approved'
         WHERE booking_id = :bookingId
       `, [bookingId]);
     } else {
       // VIP房间创建审批记录
       await connection.execute(`
         INSERT INTO BookingApprovals (
           booking_id,
           approval_status
         ) VALUES (
           :bookingId,
           'Waiting for Approval'
         )
       `, [bookingId]);
     }

     await connection.commit();

     // 返回预订详情
     return await this.getBookingById(bookingId);
   } catch (error) {
     if (connection) {
       await connection.rollback();
     }
     throw error;
   } finally {
     if (connection) {
       try {
         await connection.close();
       } catch (err) {
         console.error('Error closing connection:', err);
       }
     }
   }
 }

 // 检查是否是VIP房间
 async checkIfVipRoom(connection, roomId) {
   const result = await connection.execute(`
     SELECT room_type
     FROM Rooms
     WHERE room_id = :roomId
   `, [roomId]);
   
   return result.rows[0].ROOM_TYPE === 'VIP';
 }

 // 获取预订详情
 async getBookingById(bookingId) {
   let connection;
   try {
     connection = await oracledb.getConnection();
     
     const result = await connection.execute(`
       SELECT 
         b.booking_id,
         b.employee_id,
         e.name as employee_name,
         b.room_id,
         r.room_name,
         b.start_time,
         b.end_time,
         b.booking_status,
         b.secret_number,
         b.cancellation_reason,
         b.created_at,
         b.updated_at,
         ba.approval_status,
         ba.approval_reason
       FROM Bookings b
       JOIN Employees e ON b.employee_id = e.employee_id
       JOIN Rooms r ON b.room_id = r.room_id
       LEFT JOIN BookingApprovals ba ON b.booking_id = ba.booking_id
       WHERE b.booking_id = :bookingId
     `, [bookingId]);

     if (result.rows.length === 0) {
       throw new Error('Booking not found');
     }

     return result.rows[0];
   } catch (error) {
     throw error;
   } finally {
     if (connection) {
       try {
         await connection.close();
       } catch (err) {
         console.error('Error closing connection:', err);
       }
     }
   }
 }

 // 获取用户的预订列表
 async getUserBookings(employeeId, status = null) {
   let connection;
   try {
     connection = await oracledb.getConnection();

     let query = `
       SELECT 
         b.booking_id,
         b.room_id,
         r.room_name,
         b.start_time,
         b.end_time,
         b.booking_status,
         b.secret_number,
         b.created_at,
         ba.approval_status
       FROM Bookings b
       JOIN Rooms r ON b.room_id = r.room_id
       LEFT JOIN BookingApprovals ba ON b.booking_id = ba.booking_id
       WHERE b.employee_id = :employeeId
     `;

     const params = {
       employeeId: employeeId
     };

     if (status) {
       query += ` AND b.booking_status = :status`;
       params.status = status;
     }

     query += ` ORDER BY b.start_time DESC`;

     const result = await connection.execute(query, params);
     return result.rows;

   } catch (error) {
     throw error;
   } finally {
     if (connection) {
       try {
         await connection.close();
       } catch (err) {
         console.error('Error closing connection:', err);
       }
     }
   }
 }

 // 取消预订
 async cancelBooking(bookingId, employeeId, reason) {
   let connection;
   try {
     connection = await oracledb.getConnection();
     await connection.execute('BEGIN');

     const booking = await this.getBookingById(bookingId);

     if (!booking) {
       throw new Error('Booking not found');
     }

     if (booking.BOOKING_STATUS !== 'Pending' && booking.BOOKING_STATUS !== 'Approved') {
       throw new Error('Cannot cancel booking in current status');
     }

     // 检查权限
     if (booking.EMPLOYEE_ID !== employeeId) {
       const isAdmin = await this.checkIfAdmin(employeeId);
       if (!isAdmin) {
         throw new Error('Unauthorized to cancel this booking');
       }
     }

     await connection.execute(`
       UPDATE Bookings
       SET booking_status = 'Cancelled',
           cancellation_reason = :reason,
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = :bookingId
     `, {
       reason: reason,
       bookingId: bookingId
     });

     await connection.commit();
     return await this.getBookingById(bookingId);

   } catch (error) {
     if (connection) {
       await connection.rollback();
     }
     throw error;
   } finally {
     if (connection) {
       try {
         await connection.close();
       } catch (err) {
         console.error('Error closing connection:', err);
       }
     }
   }
 }

 // 审批预订
 async approveBooking(bookingId, approverId, isApproved, reason) {
   let connection;
   try {
     connection = await oracledb.getConnection();
     await connection.execute('BEGIN');

     // 检查预订状态
     const booking = await this.getBookingById(bookingId);
     if (!booking) {
       throw new Error('Booking not found');
     }

     if (booking.BOOKING_STATUS !== 'Pending') {
       throw new Error('Booking is not in pending status');
     }

     // 更新审批状态
     await connection.execute(`
       UPDATE BookingApprovals
       SET approved_by = :approverId,
           approval_status = :approvalStatus,
           approval_reason = :reason,
           approval_time = CURRENT_TIMESTAMP
       WHERE booking_id = :bookingId
     `, {
       approverId: approverId,
       approvalStatus: isApproved ? 'Approved' : 'Not Approved',
       reason: reason,
       bookingId: bookingId
     });

     // 更新预订状态
     await connection.execute(`
       UPDATE Bookings
       SET booking_status = :status,
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = :bookingId
     `, {
       status: isApproved ? 'Approved' : 'Rejected',
       bookingId: bookingId
     });

     await connection.commit();
     return await this.getBookingById(bookingId);
     
   } catch (error) {
     if (connection) {
       await connection.rollback();
     }
     throw error;
   } finally {
     if (connection) {
       try {
         await connection.close();
       } catch (err) {
         console.error('Error closing connection:', err);
       }
     }
   }
 }

 // 检查用户是否是管理员
 async checkIfAdmin(employeeId) {
   let connection;
   try {
     connection = await oracledb.getConnection();
     
     const result = await connection.execute(`
       SELECT p.position_name
       FROM Employees e
       JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
       JOIN Positions p ON edp.position_id = p.position_id
       WHERE e.employee_id = :employeeId
     `, [employeeId]);

     return result.rows.some(row => row.POSITION_NAME === 'Admin');

   } catch (error) {
     throw error;
   } finally {
     if (connection) {
       try {
         await connection.close();
       } catch (err) {
         console.error('Error closing connection:', err);
       }
     }
   }
 }
}

module.exports = new BookingService();