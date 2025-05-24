// app/lib/simple-binding.server.ts
// 簡化版綁定狀態檢查 (修復 TypeScript 類型問題)

import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_PATH || './data/app.db';

// 定義資料庫查詢結果的類型
interface UserBindingRow {
  binding_status: string;
  student_id: string | null;
}

interface UserStudentJoinRow {
  binding_status: string;
  student_id: string | null;
  name: string | null;
  department: string | null;
  grade: number | null;
  class_code: string | null;
  phone: string | null;
}

interface StudentRow {
  student_id: string;
  name: string;
  department: string | null;
  grade: number | null;
  class_code: string | null;
  phone: string | null;
  status: string;
}

interface UserRow {
  id: number;
}

function getDb() {
  return new Database(DB_PATH);
}

/**
 * 檢查用戶是否已綁定學號
 */
export function isUserBound(userId: number): boolean {
  const db = getDb();
  try {
    const result = db.prepare(`
      SELECT binding_status, student_id 
      FROM users 
      WHERE id = ? AND binding_status = 'bound' AND student_id IS NOT NULL
    `).get(userId) as UserBindingRow | undefined;
    
    db.close();
    return !!result;
  } catch (error) {
    console.error('檢查綁定狀態失敗:', error);
    db.close();
    return false;
  }
}

/**
 * 取得用戶綁定的學生資訊
 */
export function getUserBinding(userId: number) {
  const db = getDb();
  try {
    const result = db.prepare(`
      SELECT u.binding_status, u.student_id, s.name, s.department, s.grade, s.class_code, s.phone
      FROM users u
      LEFT JOIN students s ON u.student_id = s.student_id
      WHERE u.id = ?
    `).get(userId) as UserStudentJoinRow | undefined;
    
    db.close();
    
    if (result && result.binding_status === 'bound' && result.student_id) {
      return {
        isbound: true,
        student: {
          studentId: result.student_id,
          name: result.name || '未知',
          department: result.department || '未知',
          grade: result.grade || 0,
          classCode: result.class_code || '未知',
          phone: result.phone || '未提供',
          emergencyContact: '未提供',
          emergencyPhone: '未提供'
        }
      };
    }
    
    return {
      isbound: false,
      student: null
    };
  } catch (error) {
    console.error('取得用戶綁定失敗:', error);
    db.close();
    return {
      isbound: false,
      student: null
    };
  }
}

/**
 * 執行綁定操作
 */
export function bindUserToStudent(userId: number, studentId: string): { success: boolean; message: string } {
  const db = getDb();
  try {
    // 檢查用戶是否已綁定
    const existingBinding = db.prepare(`
      SELECT id FROM users WHERE id = ? AND binding_status = 'bound' AND student_id IS NOT NULL
    `).get(userId) as UserRow | undefined;
    
    if (existingBinding) {
      db.close();
      return { success: false, message: '您已經綁定過學號，無法重複綁定' };
    }
    
    // 檢查學號是否已被其他人綁定
    const studentTaken = db.prepare(`
      SELECT id FROM users WHERE student_id = ? AND binding_status = 'bound'
    `).get(studentId) as UserRow | undefined;
    
    if (studentTaken) {
      db.close();
      return { success: false, message: '此學號已被其他帳號綁定' };
    }
    
    // 檢查學號是否存在
    const student = db.prepare(`
      SELECT student_id FROM students WHERE student_id = ? AND status = 'active'
    `).get(studentId) as StudentRow | undefined;
    
    if (!student) {
      db.close();
      return { success: false, message: '學號不存在或已停用' };
    }
    
    // 執行綁定
    const result = db.prepare(`
      UPDATE users 
      SET student_id = ?, binding_status = 'bound' 
      WHERE id = ?
    `).run(studentId, userId);
    
    db.close();
    
    if (result.changes > 0) {
      return { success: true, message: '綁定成功' };
    } else {
      return { success: false, message: '綁定失敗，請重試' };
    }
    
  } catch (error) {
    console.error('綁定操作失敗:', error);
    db.close();
    return { success: false, message: '系統錯誤，請稍後再試' };
  }
}