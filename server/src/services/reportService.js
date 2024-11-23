const { executeQuery } = require('../config/database');

class ReportService {
  // 获取会议室使用统计
  async getRoomUsageStats(startDate, endDate) {
    try {
      const result = await executeQuery(`
        SELECT 
          r.room_id,
          r.room_name,
          COUNT(b.booking_id) as total_bookings,
          COUNT(al.access_log_id) as actual_uses,
          ROUND(COUNT(al.access_log_id) * 100.0 / NULLIF(COUNT(b.booking_id), 0), 2) as usage_rate,
          SUM(CASE WHEN b.booking_status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
          ROUND(
            EXTRACT(HOUR FROM SUM(b.end_time - b.start_time)) + 
            EXTRACT(MINUTE FROM SUM(b.end_time - b.start_time)) / 60, 2
          ) as total_hours_booked
        FROM Rooms r
        LEFT JOIN Bookings b ON r.room_id = b.room_id
          AND b.start_time BETWEEN :startDate AND :endDate
        LEFT JOIN RoomAccessLog al ON b.booking_id = al.booking_id
        GROUP BY r.room_id, r.room_name
        ORDER BY total_bookings DESC
      `, {
        startDate: startDate,
        endDate: endDate
      });

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 获取每日使用统计
  async getDailyUsageStats(roomId, month, year) {
    try {
      const result = await executeQuery(`
        WITH RECURSIVE DateRange AS (
          SELECT TRUNC(TO_DATE(:year || '-' || :month || '-01', 'YYYY-MM-DD'), 'MM') as date_day
          FROM DUAL
          UNION ALL
          SELECT date_day + 1
          FROM DateRange
          WHERE date_day < LAST_DAY(TO_DATE(:year || '-' || :month || '-01', 'YYYY-MM-DD'))
        )
        SELECT 
          dr.date_day,
          COUNT(b.booking_id) as total_bookings,
          COUNT(al.access_log_id) as actual_uses,
          ROUND(COUNT(al.access_log_id) * 100.0 / NULLIF(COUNT(b.booking_id), 0), 2) as usage_rate
        FROM DateRange dr
        LEFT JOIN Bookings b ON TRUNC(b.start_time) = dr.date_day
          AND b.room_id = :roomId
          AND b.booking_status = 'Approved'
        LEFT JOIN RoomAccessLog al ON b.booking_id = al.booking_id
        GROUP BY dr.date_day
        ORDER BY dr.date_day
      `, {
        roomId: roomId,
        month: month,
        year: year
      });

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 获取预订vs实际使用统计
  async getBookingUsageStats(startDate, endDate) {
    try {
      const result = await executeQuery(`
        WITH BookingStats AS (
          SELECT 
            e.employee_id,
            e.name as employee_name,
            d.department_name,
            COUNT(b.booking_id) as total_bookings,
            COUNT(al.access_log_id) as actual_uses,
            SUM(CASE WHEN b.booking_status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
            SUM(CASE WHEN al.access_log_id IS NULL AND b.end_time < CURRENT_TIMESTAMP 
                     AND b.booking_status = 'Approved' THEN 1 ELSE 0 END) as unused_bookings
          FROM Employees e
          JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
          JOIN Departments d ON edp.department_id = d.department_id
          LEFT JOIN Bookings b ON e.employee_id = b.employee_id
            AND b.start_time BETWEEN :startDate AND :endDate
          LEFT JOIN RoomAccessLog al ON b.booking_id = al.booking_id
          GROUP BY e.employee_id, e.name, d.department_name
        )
        SELECT 
          employee_id,
          employee_name,
          department_name,
          total_bookings,
          actual_uses,
          cancelled_bookings,
          unused_bookings,
          ROUND(actual_uses * 100.0 / NULLIF(total_bookings - cancelled_bookings, 0), 2) as usage_rate
        FROM BookingStats
        ORDER BY total_bookings DESC
      `, {
        startDate: startDate,
        endDate: endDate
      });

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 获取员工锁定统计
  async getLockStats(startDate, endDate) {
    try {
      const result = await executeQuery(`
        WITH DepartmentStats AS (
          SELECT 
            d.department_id,
            d.department_name,
            COUNT(DISTINCT e.employee_id) as total_employees,
            COUNT(DISTINCT CASE WHEN e.is_locked = 1 THEN e.employee_id END) as locked_employees,
            COUNT(ur.employee_id) as total_locks
          FROM Departments d
          JOIN EmployeeDepartmentPositions edp ON d.department_id = edp.department_id
          JOIN Employees e ON edp.employee_id = e.employee_id
          LEFT JOIN UnlockRequests ur ON e.employee_id = ur.employee_id
            AND ur.request_time BETWEEN :startDate AND :endDate
          GROUP BY d.department_id, d.department_name
        )
        SELECT 
          department_name,
          total_employees,
          locked_employees,
          total_locks,
          ROUND(locked_employees * 100.0 / NULLIF(total_employees, 0), 2) as locked_rate,
          ROUND(total_locks * 1.0 / NULLIF(total_employees, 0), 2) as locks_per_employee
        FROM DepartmentStats
        ORDER BY locked_rate DESC
      `, {
        startDate: startDate,
        endDate: endDate
      });

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 获取详细的锁定历史
  async getLockHistory(departmentId, startDate, endDate) {
    try {
      const result = await executeQuery(`
        SELECT 
          e.employee_id,
          e.name as employee_name,
          ur.request_time,
          ur.approval_status,
          ur.approval_reason,
          e2.name as approver_name,
          ur.approval_time
        FROM UnlockRequests ur
        JOIN Employees e ON ur.employee_id = e.employee_id
        JOIN EmployeeDepartmentPositions edp ON e.employee_id = edp.employee_id
        LEFT JOIN Employees e2 ON ur.approved_by = e2.employee_id
        WHERE edp.department_id = :departmentId
        AND ur.request_time BETWEEN :startDate AND :endDate
        ORDER BY ur.request_time DESC
      `, {
        departmentId: departmentId,
        startDate: startDate,
        endDate: endDate
      });

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // 获取操作日志统计
  async getSystemLogsStats(startDate, endDate) {
    try {
      const result = await executeQuery(`
        SELECT 
          sl.action,
          COUNT(*) as action_count,
          COUNT(DISTINCT sl.user_id) as unique_users,
          MIN(sl.timestamp) as first_occurrence,
          MAX(sl.timestamp) as last_occurrence
        FROM SystemLogs sl
        WHERE sl.timestamp BETWEEN :startDate AND :endDate
        GROUP BY sl.action
        ORDER BY action_count DESC
      `, {
        startDate: startDate,
        endDate: endDate
      });

      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ReportService();