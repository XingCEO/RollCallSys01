// app/lib/student.server.ts
// 學生相關資料庫操作

import { prepare, transaction } from './database.server';
import type { 
  Student, 
  CreateStudentData, 
  UpdateStudentData, 
  UserBinding,
  BindStudentData,
  StudentValidationResult,
  BindingResult,
  StudentStats
} from '../models/student';
import { mapDbRowToStudent, validateStudentId, validateStudentName } from '../models/student';

// 初始化 Prepared Statements
function initializeStudentStatements() {
  console.log("🔄 初始化學生資料庫 Prepared Statements...");
  
  try {
    const statements = {
      // 學生查詢
      findStudentById: prepare('SELECT * FROM students WHERE student_id = ? AND status = "active"'),
      findStudentByIdAll: prepare('SELECT * FROM students WHERE student_id = ?'),
      getAllStudents: prepare('SELECT * FROM students WHERE status = "active" ORDER BY student_id'),
      getStudentsByDepartment: prepare('SELECT * FROM students WHERE department = ? AND status = "active" ORDER BY student_id'),
      getStudentsByGrade: prepare('SELECT * FROM students WHERE grade = ? AND status = "active" ORDER BY student_id'),
      
      // 學生管理
      insertStudent: prepare(`
        INSERT INTO students (student_id, name, department, grade, class_code, phone, emergency_contact, emergency_phone, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      updateStudent: prepare(`
        UPDATE students 
        SET name = ?, department = ?, grade = ?, class_code = ?, phone = ?, emergency_contact = ?, emergency_phone = ?, status = ?
        WHERE student_id = ?
      `),
      
      // 綁定相關
      getUserBinding: prepare(`
        SELECT u.*, s.* 
        FROM users u 
        LEFT JOIN students s ON u.student_id = s.student_id 
        WHERE u.id = ?
      `),
      
      getStudentBinding: prepare(`
        SELECT u.*, s.* 
        FROM users u 
        RIGHT JOIN students s ON u.student_id = s.student_id 
        WHERE s.student_id = ?
      `),
      
      bindUserToStudent: prepare(`
        UPDATE users 
        SET student_id = ?, binding_status = 'bound' 
        WHERE id = ?
      `),
      
      unbindUser: prepare(`
        UPDATE users 
        SET student_id = NULL, binding_status = 'unbound' 
        WHERE id = ?
      `),
      
      // 統計查詢
      getStudentStats: prepare(`
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_students,
          COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as bound_students
        FROM students s
        LEFT JOIN users u ON s.student_id = u.student_id
        WHERE s.status = 'active'
      `),
      
      getDepartmentStats: prepare(`
        SELECT 
          s.department,
          COUNT(*) as count,
          COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as bound_count
        FROM students s
        LEFT JOIN users u ON s.student_id = u.student_id
        WHERE s.status = 'active' AND s.department IS NOT NULL
        GROUP BY s.department
        ORDER BY s.department
      `),
      
      getGradeStats: prepare(`
        SELECT 
          s.grade,
          COUNT(*) as count,
          COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as bound_count
        FROM students s
        LEFT JOIN users u ON s.student_id = u.student_id
        WHERE s.status = 'active' AND s.grade IS NOT NULL
        GROUP BY s.grade
        ORDER BY s.grade
      `),
    };
    
    console.log("✅ 學生 Prepared Statements 初始化完成");
    return statements;
  } catch (error) {
    console.error("❌ 初始化學生 Prepared Statements 失敗:", error);
    throw error;
  }
}

let studentStatements: ReturnType<typeof initializeStudentStatements> | null = null;

function getStudentStatements() {
  if (!studentStatements) {
    studentStatements = initializeStudentStatements();
  }
  return studentStatements;
}

/**
 * 根據學號查詢學生（僅活躍狀態）
 */
export function findStudentById(studentId: string): Student | null {
  console.log("🔄 查詢學生 (學號):", studentId);
  
  try {
    const stmt = getStudentStatements();
    const row = stmt.findStudentById.get(studentId) as any;
    
    if (row) {
      console.log("✅ 找到學生:", {
        studentId: row.student_id,
        name: row.name,
        department: row.department,
        grade: row.grade
      });
      return mapDbRowToStudent(row);
    } else {
      console.log("ℹ️  學生不存在或非活躍狀態:", studentId);
      return null;
    }
  } catch (error) {
    console.error('❌ 查詢學生失敗:', studentId, error);
    throw new Error(`查詢學生失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 驗證學號和姓名
 */
export function validateStudent(data: BindStudentData): StudentValidationResult {
  console.log("🔄 驗證學生資料:", data);
  
  try {
    // 驗證學號格式
    const studentIdValidation = validateStudentId(data.studentId);
    if (!studentIdValidation.isValid) {
      return {
        isValid: false,
        error: studentIdValidation.error
      };
    }
    
    // 驗證姓名格式
    const nameValidation = validateStudentName(data.confirmName);
    if (!nameValidation.isValid) {
      return {
        isValid: false,
        error: nameValidation.error
      };
    }
    
    // 查詢學生是否存在
    const student = findStudentById(data.studentId);
    if (!student) {
      return {
        isValid: false,
        error: '學號不存在或已停用',
        message: '請確認學號是否正確，或聯繫管理員'
      };
    }
    
    // 驗證姓名是否匹配
    if (student.name !== data.confirmName.trim()) {
      return {
        isValid: false,
        error: '姓名與學號不匹配',
        message: '請確認輸入的姓名是否正確'
      };
    }
    
    // 檢查學號是否已被綁定
    const existingBinding = getStudentBinding(data.studentId);
    if (existingBinding) {
      return {
        isValid: false,
        error: '此學號已被其他帳號綁定',
        message: '如有疑問請聯繫管理員'
      };
    }
    
    console.log("✅ 學生驗證成功:", student.name);
    return {
      isValid: true,
      student: student,
      message: '驗證成功'
    };
    
  } catch (error) {
    console.error('❌ 學生驗證失敗:', error);
    return {
      isValid: false,
      error: '系統錯誤，請稍後再試'
    };
  }
}

/**
 * 綁定用戶到學生
 */
export function bindUserToStudent(userId: number, studentId: string): BindingResult {
  console.log("🔄 綁定用戶到學生:", { userId, studentId });
  
  try {
    return transaction(() => {
      const stmt = getStudentStatements();
      
      // 檢查學生是否存在
      const student = findStudentById(studentId);
      if (!student) {
        throw new Error('學號不存在或已停用');
      }
      
      // 檢查學號是否已被綁定
      const existingBinding = getStudentBinding(studentId);
      if (existingBinding) {
        throw new Error('此學號已被其他帳號綁定');
      }
      
      // 執行綁定
      const result = stmt.bindUserToStudent.run(studentId, userId);
      
      console.log("✅ 綁定結果:", { changes: result.changes });
      
      if (result.changes === 0) {
        throw new Error('綁定失敗：用戶不存在');
      }
      
      // 查詢綁定結果
      const binding = getUserBinding(userId);
      if (!binding) {
        throw new Error('綁定驗證失敗');
      }
      
      console.log(`✅ 用戶綁定成功: ${binding.user.email} -> ${binding.student.studentId} (${binding.student.name})`);
      
      return {
        success: true,
        message: `成功綁定到 ${binding.student.name} (${binding.student.studentId})`,
        binding: binding
      };
    });
  } catch (error) {
    console.error('❌ 綁定失敗:', error);
    return {
      success: false,
      message: '綁定失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    };
  }
}

/**
 * 取得用戶綁定資訊
 */
export function getUserBinding(userId: number): UserBinding | null {
  console.log("🔄 查詢用戶綁定:", userId);
  
  try {
    const stmt = getStudentStatements();
    const row = stmt.getUserBinding.get(userId) as any;
    
    if (row && row.student_id) {
      console.log("✅ 找到用戶綁定:", row.student_id);
      return {
        userId: row.id,
        studentId: row.student_id,
        bindingStatus: row.binding_status,
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          avatarUrl: row.avatar_url,
          role: row.role
        },
        student: mapDbRowToStudent(row)
      };
    } else {
      console.log("ℹ️  用戶未綁定學號:", userId);
      return null;
    }
  } catch (error) {
    console.error('❌ 查詢用戶綁定失敗:', userId, error);
    throw new Error(`查詢用戶綁定失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 取得學生綁定資訊
 */
export function getStudentBinding(studentId: string): UserBinding | null {
  console.log("🔄 查詢學生綁定:", studentId);
  
  try {
    const stmt = getStudentStatements();
    const row = stmt.getStudentBinding.get(studentId) as any;
    
    if (row && row.id) {
      console.log("✅ 找到學生綁定:", row.email);
      return {
        userId: row.id,
        studentId: row.student_id,
        bindingStatus: row.binding_status,
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          avatarUrl: row.avatar_url,
          role: row.role
        },
        student: mapDbRowToStudent(row)
      };
    } else {
      console.log("ℹ️  學生未綁定帳號:", studentId);
      return null;
    }
  } catch (error) {
    console.error('❌ 查詢學生綁定失敗:', studentId, error);
    throw new Error(`查詢學生綁定失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 檢查用戶綁定狀態
 */
export function checkUserBindingStatus(userId: number): 'unbound' | 'bound' {
  console.log("🔄 檢查用戶綁定狀態:", userId);
  
  try {
    const binding = getUserBinding(userId);
    const status = binding ? 'bound' : 'unbound';
    
    console.log("✅ 用戶綁定狀態:", status);
    return status;
  } catch (error) {
    console.error('❌ 檢查用戶綁定狀態失敗:', userId, error);
    return 'unbound'; // 發生錯誤時默認為未綁定
  }
}

/**
 * 取得所有學生列表
 */
export function getAllStudents(): Student[] {
  console.log("🔄 取得所有學生列表...");
  
  try {
    const stmt = getStudentStatements();
    const rows = stmt.getAllStudents.all();
    
    console.log("✅ 取得學生列表成功，學生數量:", rows.length);
    
    return rows.map(mapDbRowToStudent);
  } catch (error) {
    console.error('❌ 取得學生列表失敗:', error);
    throw new Error(`取得學生列表失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 根據系所取得學生列表
 */
export function getStudentsByDepartment(department: string): Student[] {
  console.log("🔄 取得系所學生列表:", department);
  
  try {
    const stmt = getStudentStatements();
    const rows = stmt.getStudentsByDepartment.all(department);
    
    console.log("✅ 取得系所學生列表成功，學生數量:", rows.length);
    
    return rows.map(mapDbRowToStudent);
  } catch (error) {
    console.error('❌ 取得系所學生列表失敗:', department, error);
    throw new Error(`取得系所學生列表失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * 取得學生統計資訊
 */
export function getStudentStats(): StudentStats {
  console.log("🔄 取得學生統計資訊...");
  
  try {
    const stmt = getStudentStatements();
    
    // 基本統計
    const basicStats = stmt.getStudentStats.get() as any;
    
    // 系所統計
    const deptStats = stmt.getDepartmentStats.all() as any[];
    
    // 年級統計
    const gradeStats = stmt.getGradeStats.all() as any[];
    
    const result: StudentStats = {
      totalStudents: basicStats.total_students || 0,
      activeStudents: basicStats.active_students || 0,
      boundStudents: basicStats.bound_students || 0,
      unboundStudents: (basicStats.active_students || 0) - (basicStats.bound_students || 0),
      departmentStats: deptStats.map(stat => ({
        department: stat.department,
        count: stat.count,
        boundCount: stat.bound_count
      })),
      gradeStats: gradeStats.map(stat => ({
        grade: stat.grade,
        count: stat.count,
        boundCount: stat.bound_count
      }))
    };
    
    console.log("✅ 學生統計資訊:", result);
    
    return result;
  } catch (error) {
    console.error('❌ 取得學生統計資訊失敗:', error);
    throw new Error(`取得學生統計資訊失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}