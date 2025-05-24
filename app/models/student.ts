// app/models/student.ts
// 學生資料模型定義

export interface Student {
  id: number;
  studentId: string;              // 學號 (6位數字)
  name: string;                   // 學生姓名
  department?: string;            // 系所
  grade?: number;                 // 年級
  classCode?: string;             // 班級代碼
  phone?: string;                 // 電話
  emergencyContact?: string;      // 緊急聯絡人
  emergencyPhone?: string;        // 緊急聯絡電話
  status: 'active' | 'inactive' | 'graduated';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentData {
  studentId: string;
  name: string;
  department?: string;
  grade?: number;
  classCode?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status?: 'active' | 'inactive' | 'graduated';
}

export interface UpdateStudentData {
  name?: string;
  department?: string;
  grade?: number;
  classCode?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status?: 'active' | 'inactive' | 'graduated';
}

// 綁定相關
export interface UserBinding {
  userId: number;
  studentId: string;
  bindingStatus: 'unbound' | 'bound';
  user: {
    id: number;
    email: string;
    name: string;
    avatarUrl?: string;
    role: string;
  };
  student: Student;
}

export interface BindStudentData {
  studentId: string;
  confirmName: string;            // 用於驗證的姓名
}

// 學號驗證結果
export interface StudentValidationResult {
  isValid: boolean;
  student?: Student;
  error?: string;
  message?: string;
}

// 綁定操作結果
export interface BindingResult {
  success: boolean;
  message: string;
  binding?: UserBinding;
  error?: string;
}

// 學生統計資料
export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  boundStudents: number;
  unboundStudents: number;
  departmentStats: Array<{
    department: string;
    count: number;
    boundCount: number;
  }>;
  gradeStats: Array<{
    grade: number;
    count: number;
    boundCount: number;
  }>;
}

// 資料庫原始資料轉換為 Student 物件的輔助函數
export function mapDbRowToStudent(row: any): Student {
  return {
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    department: row.department,
    grade: row.grade,
    classCode: row.class_code,
    phone: row.phone,
    emergencyContact: row.emergency_contact,
    emergencyPhone: row.emergency_phone,
    status: row.status as 'active' | 'inactive' | 'graduated',
    createdAt: typeof row.created_at === 'string' ? new Date(row.created_at) : row.created_at,
    updatedAt: typeof row.updated_at === 'string' ? new Date(row.updated_at) : row.updated_at,
  };
}

// 學號格式驗證
export function validateStudentId(studentId: string): { isValid: boolean; error?: string } {
  // 移除空白字符
  const cleanId = studentId.trim();
  
  // 檢查是否為 6 位數字
  if (!/^\d{6}$/.test(cleanId)) {
    return {
      isValid: false,
      error: '學號必須是 6 位數字'
    };
  }
  
  return { isValid: true };
}

// 學生姓名驗證
export function validateStudentName(name: string): { isValid: boolean; error?: string } {
  const cleanName = name.trim();
  
  if (!cleanName) {
    return {
      isValid: false,
      error: '姓名不能為空'
    };
  }
  
  if (cleanName.length < 2 || cleanName.length > 20) {
    return {
      isValid: false,
      error: '姓名長度必須在 2-20 字符之間'
    };
  }
  
  return { isValid: true };
}