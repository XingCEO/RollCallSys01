-- database/migrations/003_add_students.sql
-- 建立學生資料表和用戶綁定功能

-- 學生基本資料表
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,          -- 學號 (6位數字)
    name TEXT NOT NULL,                       -- 學生姓名
    department TEXT,                          -- 系所
    grade INTEGER,                            -- 年級
    class_code TEXT,                          -- 班級代碼
    phone TEXT,                               -- 電話
    emergency_contact TEXT,                   -- 緊急聯絡人
    emergency_phone TEXT,                     -- 緊急聯絡電話
    status TEXT DEFAULT 'active',             -- 狀態 (active, inactive, graduated)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 為 users 表新增學號綁定欄位
ALTER TABLE users ADD COLUMN student_id TEXT;
ALTER TABLE users ADD COLUMN binding_status TEXT DEFAULT 'unbound'; -- unbound, bound

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);

CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_binding_status ON users(binding_status);

-- 學生資料更新觸發器
CREATE TRIGGER IF NOT EXISTS students_updated_at 
    AFTER UPDATE ON students
    FOR EACH ROW
    BEGIN
        UPDATE students SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 插入測試學生資料
INSERT OR IGNORE INTO students (student_id, name, department, grade, class_code, phone, status) VALUES
('123456', '王小明', '資訊工程系', 3, 'A班', '0912345678', 'active'),
('234567', '李小華', '資訊工程系', 2, 'B班', '0923456789', 'active'),
('345678', '張小美', '電子工程系', 4, 'A班', '0934567890', 'active'),
('456789', '陳小強', '機械工程系', 1, 'C班', '0945678901', 'active'),
('567890', '林小芳', '資訊工程系', 3, 'A班', '0956789012', 'active'),
('678901', '黃小龍', '電子工程系', 2, 'B班', '0967890123', 'active'),
('789012', '劉小雅', '機械工程系', 4, 'A班', '0978901234', 'active'),
('890123', '吳小偉', '資訊工程系', 1, 'C班', '0989012345', 'active'),
('901234', '蔡小君', '電子工程系', 3, 'B班', '0990123456', 'active'),
('012345', '許小安', '機械工程系', 2, 'A班', '0901234567', 'active');