// src/services/accessService.js
const { executeSQL } = require('../config/database');
const QRCode = require('qrcode');
const oracledb = require('oracledb');

class AccessService {
  // 生成访问记录
  async createAccessLog(bookingId, accessTime = new Date()) {
    let connection;
    try {
      connection = await oracledb.getConnection();
      
      // 验证预订状态
      const bookingResult = await connection.execute(`
        SELECT 
          b.booking_id,
          b.start_time,
          b.end_time,
          b.booking_status,
          b.secret_number,
          r.room_name,
          e.name as employee_name
        FROM Bookings b
        JOIN Rooms r ON b.room_id = r.room_id
        JOIN Employees e ON b.employee_id = e.employee_id
        WHERE b.booking_id = :bookingId
      `, [bookingId]);

      if (bookingResult.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingResult.rows[0];

      // 检查预订状态
      if (booking.BOOKING_STATUS !== 'Approved') {
        throw new Error('Booking is not approved');
      }

      // 检查访问时间
      const now = new Date();
      if (now < booking.START_TIME || now > booking.END_TIME) {
        throw new Error('Access attempt outside booking time window');
      }

      // 创建访问记录
      const result = await connection.execute(`
        INSERT INTO RoomAccessLog (
          booking_id,
          access_time
        ) VALUES (
          :bookingId,
          :accessTime
        ) RETURNING access_log_id INTO :access_log_id
      `, {
        bookingId: bookingId,
        accessTime: accessTime,
        access_log_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      });

      await connection.commit();

      return {
        accessLogId: result.outBinds.access_log_id[0],
        bookingId,
        accessTime,
        roomName: booking.ROOM_NAME,
        employeeName: booking.EMPLOYEE_NAME
      };
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
          console.error(err);
        }
      }
    }
  }

  // 验证SECRET NUMBER
  async verifySecretNumber(bookingId, secretNumber) {
    try {
      const result = await executeSQL(`
        SELECT 
          b.booking_id,
          b.start_time,
          b.end_time,
          b.booking_status,
          b.secret_number,
          r.room_name
        FROM Bookings b
        JOIN Rooms r ON b.room_id = r.room_id
        WHERE b.booking_id = :bookingId
      `, [bookingId]);

      if (result.rows.length === 0) {
        return false;
      }

      const booking = result.rows[0];

      // 检查SECRET NUMBER
      if (booking.SECRET_NUMBER !== secretNumber) {
        return false;
      }

      // 检查预订状态
      if (booking.BOOKING_STATUS !== 'Approved') {
        throw new Error('Booking is not approved');
      }

      // 检查时间
      const now = new Date();
      if (now < booking.START_TIME || now > booking.END_TIME) {
        throw new Error('Access attempt outside booking time window');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // 生成QR码
  async generateQRCode(bookingId, secretNumber) {
    try {
      const qrData = JSON.stringify({
        bookingId,
        secretNumber
      });

      const qrCode = await QRCode.toDataURL(qrData);
      return qrCode;
    } catch (error) {
      throw error;
    }
  }

  // 获取访问记录
  async getAccessLogs(bookingId) {
    try {
      const result = await executeSQL(`
        SELECT 
          al.access_log_id,
          al.booking_id,
          al.access_time,
          r.room_name,
          e.name as employee_name
        FROM RoomAccessLog al
        JOIN Bookings b ON al.booking_id = b.booking_id
        JOIN Rooms r ON b.room_id = r.room_id
        JOIN Employees e ON b.employee_id = e.employee_id
        WHERE al.booking_id = :bookingId
        ORDER BY al.access_time DESC
      `, [bookingId]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 检查未使用的预订
  async checkUnusedBookings() {
    try {
      const result = await executeSQL(`
        SELECT 
          b.booking_id,
          b.employee_id,
          b.room_id,
          b.start_time,
          b.end_time,
          e.name as employee_name,
          r.room_name
        FROM Bookings b
        JOIN Employees e ON b.employee_id = e.employee_id
        JOIN Rooms r ON b.room_id = r.room_id
        WHERE b.booking_status = 'Approved'
        AND b.end_time < CURRENT_TIMESTAMP
        AND NOT EXISTS (
          SELECT 1 
          FROM RoomAccessLog al 
          WHERE al.booking_id = b.booking_id
        )
      `);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 更新员工锁定状态
  async updateEmployeeLockStatus(employeeId, isLocked) {
    try {
      await executeSQL(`
        UPDATE Employees
        SET is_locked = :isLocked,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = :employeeId
      `, {
        isLocked: isLocked ? 1 : 0,
        employeeId: employeeId
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AccessService();