// app/lib/attendance.server.ts
// 點名系統資料庫操作

import { prepare, transaction } from './database.server';

// 點名記錄類型
export interface AttendanceRecord {
  id: number;
  userId: number;
  studentId: string;
  courseId?: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  status: 'present' | 'late' | 'absent';
  deviceInfo?: string;
  ipAddress?: string;
  notes?: string;
  createdAt: string;
}

// 創建點名記錄的輸入類型
export interface CreateAttendanceData {
  userId: number;
  studentId: string;
  courseId?: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceInfo?: string;
  ipAddress?: string;
  notes?: string;
}

// 點名統計類型
export interface AttendanceStats {
  totalRecords: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  todayRecords: number;
  thisWeekRecords: number;
  averageAccuracy: number;
}

// 初始化點名相關的 Prepared Statements
function initializeAttendanceStatements() {
  console.log("🔄 初始化點名系統 Prepared Statements...");
  
  try {
    const statements = {
      // 插入點名記錄
      insertAttendance: prepare(`
        INSERT INTO attendance_records (
          user_id, student_id, course_id, latitude, longitude, accuracy, 
          timestamp, status, device_info, ip_address, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      
      // 查詢用戶點名記錄
      findAttendanceByUserId: prepare(`
        SELECT * FROM attendance_records 
        WHERE user_id = ? 
        ORDER BY timestamp DESC
      `),
      
      // 查詢今日點名記錄
      findTodayAttendance: prepare(`
        SELECT * FROM attendance_records 
        WHERE user_id = ? AND date(timestamp) = date('now', 'localtime')
        ORDER BY timestamp DESC
      `),
      
      // 檢查是否已點名（防止重複點名）
      checkDuplicateAttendance: prepare(`
        SELECT id FROM attendance_records 
        WHERE user_id = ? AND date(timestamp) = date('now', 'localtime')
        LIMIT 1
      `),
      
      // 查詢最近的點名記錄
      findRecentAttendance: prepare(`
        SELECT * FROM attendance_records 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `),
      
      // 統計查詢
      getAttendanceStats: prepare(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN date(timestamp) = date('now', 'localtime') THEN 1 END) as today_records,
          COUNT(CASE WHEN date(timestamp) >= date('now', '-7 days', 'localtime') THEN 1 END) as week_records,
          AVG(accuracy) as avg_accuracy
        FROM attendance_records 
        WHERE user_id = ?
      `),
      
      // 查詢課程點名記錄
      findCourseAttendance: prepare(`
        SELECT ar.*, u.name as user_name, u.email as user_email
        FROM attendance_records ar
        JOIN users u ON ar.user_id = u.id
        WHERE ar.course_id = ?
        ORDER BY ar.timestamp DESC
      `),
      
      // 更新點名狀態
      updateAttendanceStatus: prepare(`
        UPDATE attendance_records 
        SET status = ?, notes = ?
        WHERE id = ?
      `),
      
      // 刪除點名記錄
      deleteAttendance: prepare(`
        DELETE FROM attendance_records 
        WHERE id = ? AND user_id = ?
      `)
    };
    
    console.log("✅ 點名系統 Prepared Statements 初始化完成");
    return statements;
  } catch (error) {
    console.error("❌ 初始化點名 Prepared Statements 失敗:", error);
    throw error;
  }
}

let attendanceStatements: ReturnType<typeof initializeAttendanceStatements> | null = null;

function getAttendanceStatements() {
  if (!attendanceStatements) {
    attendanceStatements = initializeAttendanceStatements();
  }
  return attendanceStatements;
}

/**
 * 創建點名記錄
 */
export function createAttendanceRecord(data: CreateAttendanceData): AttendanceRecord {
  console.log("🔄 創建點名記錄:", {
    userId: data.userId,
    studentId: data.studentId,
    latitude: data.latitude,
    longitude: data.longitude
  });
  
  try {
    return transaction(() => {
      const stmt = getAttendanceStatements();
      
      // 檢查今日是否已經點名
      const existingRecord = stmt.checkDuplicateAttendance.get(data.userId) as any;
      if (existingRecord) {
        throw new Error('今日已經完成點名，無法重複點名');
      }
      
      // 插入點名記錄
      const timestamp = new Date().toISOString();
      const result = stmt.insertAttendance.run(
        data.userId,
        data.studentId,
        data.courseId || null,
        data.latitude,
        data.longitude,
        data.accuracy,
        timestamp,
        'present', // 預設為出席
        data.deviceInfo || null,
        data.ipAddress || null,
        data.notes || null
      );
      
      console.log("✅ 點名記錄插入結果:", {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      });
      
      if (result.changes === 0) {
        throw new Error('點名記錄創建失敗');
      }
      
      // 查詢剛創建的記錄
      const newRecord = stmt.findAttendanceByUserId.get(data.userId) as any;
      if (!newRecord) {
        throw new Error('無法取得新創建的點名記錄');
      }
      
      const attendanceRecord: AttendanceRecord = {
        id: newRecord.id,
        userId: newRecord.user_id,
        studentId: newRecord.student_id,
        courseId: newRecord.course_id,
        latitude: newRecord.latitude,
        longitude: newRecord.longitude,
        accuracy: newRecord.accuracy,
        timestamp: newRecord.timestamp,
        status: newRecord.status,
        deviceInfo: newRecord.device_info,
        ipAddress: newRecord.ip_address,
        notes: newRecord.notes,
        createdAt: newRecord.created_at || newRecord.timestamp
      };
      
      console.log(`✅ 點名記錄創建成功: 用戶 ${data.userId} (學號: ${data.studentId})`);
      return attendanceRecord;
    });
  } catch (error) {
    console.error('❌ 創建點名記錄失敗:', error);
    throw new Error(`點名失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 查詢用戶點名記錄
 */
export function getUserAttendanceRecords(userId: number, limit?: number): AttendanceRecord[] {
  console.log("🔄 查詢用戶點名記錄:", userId);
  
  try {
    const stmt = getAttendanceStatements();
    
    const query = limit 
      ? stmt.findRecentAttendance 
      : stmt.findAttendanceByUserId;
    
    const rows = limit 
      ? query.all(userId, limit)
      : query.all(userId);
    
    const records = rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      studentId: row.student_id,
      courseId: row.course_id,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy,
      timestamp: row.timestamp,
      status: row.status,
      deviceInfo: row.device_info,
      ipAddress: row.ip_address,
      notes: row.notes,
      createdAt: row.created_at || row.timestamp
    })) as AttendanceRecord[];
    
    console.log(`✅ 查詢到 ${records.length} 筆點名記錄`);
    return records;
  } catch (error) {
    console.error('❌ 查詢點名記錄失敗:', error);
    throw new Error(`查詢點名記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 查詢今日點名記錄
 */
export function getTodayAttendance(userId: number): AttendanceRecord[] {
  console.log("🔄 查詢今日點名記錄:", userId);
  
  try {
    const stmt = getAttendanceStatements();
    const rows = stmt.findTodayAttendance.all(userId);
    
    const records = rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      studentId: row.student_id,
      courseId: row.course_id,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy,
      timestamp: row.timestamp,
      status: row.status,
      deviceInfo: row.device_info,
      ipAddress: row.ip_address,
      notes: row.notes,
      createdAt: row.created_at || row.timestamp
    })) as AttendanceRecord[];
    
    console.log(`✅ 今日點名記錄: ${records.length} 筆`);
    return records;
  } catch (error) {
    console.error('❌ 查詢今日點名記錄失敗:', error);
    throw new Error(`查詢今日點名記錄失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 檢查今日是否已點名
 */
export function hasTodayAttendance(userId: number): boolean {
  console.log("🔄 檢查今日點名狀態:", userId);
  
  try {
    const stmt = getAttendanceStatements();
    const result = stmt.checkDuplicateAttendance.get(userId) as any;
    
    const hasAttended = !!result;
    console.log(`✅ 今日點名狀態: ${hasAttended ? '已點名' : '未點名'}`);
    
    return hasAttended;
  } catch (error) {
    console.error('❌ 檢查今日點名狀態失敗:', error);
    return false;
  }
}

/**
 * 取得點名統計
 */
export function getAttendanceStats(userId: number): AttendanceStats {
  console.log("🔄 取得點名統計:", userId);
  
  try {
    const stmt = getAttendanceStatements();
    const stats = stmt.getAttendanceStats.get(userId) as any;
    
    const result: AttendanceStats = {
      totalRecords: stats.total_records || 0,
      presentCount: stats.present_count || 0,
      lateCount: stats.late_count || 0,
      absentCount: stats.absent_count || 0,
      todayRecords: stats.today_records || 0,
      thisWeekRecords: stats.week_records || 0,
      averageAccuracy: stats.avg_accuracy || 0
    };
    
    console.log("✅ 點名統計:", result);
    return result;
  } catch (error) {
    console.error('❌ 取得點名統計失敗:', error);
    throw new Error(`取得點名統計失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 更新點名狀態
 */
export function updateAttendanceStatus(
  recordId: number, 
  status: 'present' | 'late' | 'absent', 
  notes?: string
): boolean {
  console.log("🔄 更新點名狀態:", { recordId, status, notes });
  
  try {
    const stmt = getAttendanceStatements();
    const result = stmt.updateAttendanceStatus.run(status, notes || null, recordId);
    
    console.log("✅ 點名狀態更新結果:", { changes: result.changes });
    return result.changes > 0;
  } catch (error) {
    console.error('❌ 更新點名狀態失敗:', error);
    throw new Error(`更新點名狀態失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}