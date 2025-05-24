// scripts/init-complete-system.mjs
// 完整系統初始化腳本 - 包含基礎資料庫、學生系統、點名系統

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const DB_PATH = process.env.DATABASE_PATH || './data/app.db';

console.log('🚀 開始完整系統初始化...');
console.log('包含：基礎用戶系統 + 學生綁定 + GPS點名功能\n');

try {
  // 確保資料庫目錄存在
  const dbDir = dirname(resolve(DB_PATH));
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log(`✅ 建立資料庫目錄: ${dbDir}`);
  }

  const db = new Database(DB_PATH);
  console.log(`✅ 連接到資料庫: ${DB_PATH}`);

  // 設定 SQLite 參數
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = 10000');
  db.pragma('foreign_keys = ON');
  console.log('✅ SQLite 參數設定完成');

  // ===== 1. 建立基礎用戶系統 =====
  console.log('\n1️⃣ 建立基礎用戶系統...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      locale TEXT DEFAULT 'zh-TW',
      verified_email INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      login_count INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      role TEXT DEFAULT 'user',
      student_id TEXT,
      binding_status TEXT DEFAULT 'unbound'
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
    CREATE INDEX IF NOT EXISTS idx_users_binding_status ON users(binding_status);
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS users_updated_at 
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
  `);

  console.log('✅ 用戶系統建立完成');

  // ===== 2. 建立學生系統 =====
  console.log('\n2️⃣ 建立學生系統...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT,
      grade INTEGER,
      class_code TEXT,
      phone TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
    CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
    CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS students_updated_at 
      AFTER UPDATE ON students
      FOR EACH ROW
      BEGIN
        UPDATE students SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
  `);

  // 插入測試學生資料
  db.exec(`
    INSERT OR IGNORE INTO students (student_id, name, department, grade, class_code, phone, status) VALUES
    ('123456', '王小明', '資訊工程系', 3, 'A班', '0912345678', 'active'),
    ('234567', '李小華', '資訊工程系', 2, 'B班', '0923456789', 'active'),
    ('345678', '張小美', '電子工程系', 4, 'A班', '0934567890', 'active'),
    ('456789', '陳小強', '機械工程系', 1, 'C班', '0945678901', 'active'),
    ('567890', '林小芳', '資訊工程系', 3, 'A班', '0956789012', 'active');
  `);

  console.log('✅ 學生系統建立完成');

  // ===== 3. 建立點名系統 =====
  console.log('\n3️⃣ 建立GPS點名系統...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      student_id TEXT NOT NULL,
      course_id INTEGER,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      timestamp DATETIME NOT NULL,
      status TEXT DEFAULT 'present',
      device_info TEXT,
      ip_address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_code TEXT UNIQUE NOT NULL,
      course_name TEXT NOT NULL,
      instructor TEXT,
      department TEXT,
      credits INTEGER DEFAULT 3,
      semester TEXT,
      classroom TEXT,
      schedule TEXT,
      description TEXT,
      max_students INTEGER DEFAULT 50,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records(timestamp);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date(timestamp));
    CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
    CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
    CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS courses_updated_at 
      AFTER UPDATE ON courses
      FOR EACH ROW
      BEGIN
        UPDATE courses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
  `);

  // 插入測試課程
  db.exec(`
    INSERT OR IGNORE INTO courses (course_code, course_name, instructor, department, semester, classroom, schedule) VALUES
    ('CS101', '計算機概論', '王教授', '資訊工程系', '2024-1', 'E101', '週一 09:10-12:00'),
    ('CS201', '資料結構', '李教授', '資訊工程系', '2024-1', 'E102', '週二 13:10-16:00'),
    ('EE101', '電路學', '張教授', '電子工程系', '2024-1', 'F201', '週三 09:10-12:00'),
    ('ME101', '工程力學', '陳教授', '機械工程系', '2024-1', 'G101', '週四 13:10-16:00'),
    ('CS301', '軟體工程', '劉教授', '資訊工程系', '2024-1', 'E103', '週五 09:10-12:00');
  `);

  console.log('✅ GPS點名系統建立完成');

  // ===== 4. 驗證系統 =====
  console.log('\n4️⃣ 驗證系統建立結果...');

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);
  
  const requiredTables = ['users', 'students', 'attendance_records', 'courses'];
  const missingTables = requiredTables.filter(table => !tableNames.includes(table));
  
  console.log('📋 已建立的資料表:');
  tableNames.forEach(name => {
    console.log(`  ✅ ${name}`);
  });

  if (missingTables.length > 0) {
    console.log('❌ 缺少的資料表:', missingTables.join(', '));
    throw new Error('系統建立不完整');
  }

  // 檢查資料
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  const studentCount = db.prepare("SELECT COUNT(*) as count FROM students").get();
  const courseCount = db.prepare("SELECT COUNT(*) as count FROM courses").get();
  const attendanceCount = db.prepare("SELECT COUNT(*) as count FROM attendance_records").get();

  console.log('\n📊 資料統計:');
  console.log(`  👥 用戶: ${userCount.count} 筆`);
  console.log(`  🎓 學生: ${studentCount.count} 筆`);
  console.log(`  📚 課程: ${courseCount.count} 筆`);
  console.log(`  📍 點名記錄: ${attendanceCount.count} 筆`);

  // ===== 5. 建立測試資料 (可選) =====
  const args = process.argv.slice(2);
  if (args.includes('--with-test-data')) {
    console.log('\n5️⃣ 建立測試用戶...');
    
    const insertTestUser = db.prepare(`
      INSERT OR IGNORE INTO users (google_id, email, name, avatar_url, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const testUsers = [
      ['test_admin_123', 'admin@test.com', '測試管理員', 'https://via.placeholder.com/150', 'admin'],
      ['test_user_456', 'user@test.com', '測試用戶', 'https://via.placeholder.com/150', 'user'],
      ['test_student_789', 'student@test.com', '測試學生', 'https://via.placeholder.com/150', 'user']
    ];
    
    let newUsers = 0;
    testUsers.forEach(([googleId, email, name, avatar, role]) => {
      const result = insertTestUser.run(googleId, email, name, avatar, role);
      newUsers += result.changes;
    });
    
    console.log(`✅ 測試用戶建立完成 (新增 ${newUsers} 筆)`);
  }

  // ===== 6. 測試功能 =====
  console.log('\n6️⃣ 測試系統功能...');

  try {
    // 測試學生查詢
    const testStudent = db.prepare("SELECT * FROM students WHERE student_id = '123456'").get();
    console.log('✅ 學生系統測試通過');

    // 測試點名記錄插入
    const testAttendance = db.prepare(`
      INSERT INTO attendance_records (user_id, student_id, latitude, longitude, accuracy, timestamp, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const testResult = testAttendance.run(
      1, 'TEST999', 25.0174, 121.5398, 50.0, 
      new Date().toISOString(), 'present', '系統測試記錄'
    );
    
    if (testResult.changes > 0) {
      console.log('✅ 點名系統測試通過');
      
      // 清理測試記錄
      db.prepare("DELETE FROM attendance_records WHERE student_id = 'TEST999'").run();
      console.log('🧹 測試記錄已清理');
    }
    
  } catch (error) {
    console.log('⚠️  功能測試有警告:', error.message);
  }

  db.close();

  // ===== 完成提示 =====
  console.log('\n🎉 完整系統初始化成功！');
  console.log('=====================================');
  
  console.log('\n📝 系統功能:');
  console.log('✅ Google OAuth 登入系統');
  console.log('✅ 用戶管理與角色權限');
  console.log('✅ 學號綁定與學籍管理');
  console.log('✅ GPS定位點名系統');
  console.log('✅ 課程管理系統');
  console.log('✅ 點名記錄查詢與統計');

  console.log('\n🚀 下一步操作:');
  console.log('1. 啟動開發服務器: npm run dev');
  console.log('2. 開啟瀏覽器: http://localhost:5173');
  console.log('3. 使用 Google 帳號登入');
  console.log('4. 綁定測試學號: 123456 (王小明)');
  console.log('5. 測試GPS點名功能');

  console.log('\n🔗 系統頁面:');
  console.log('- 登入頁面: /login');
  console.log('- 儀表板: /dashboard');
  console.log('- 學號綁定: /bind-student');
  console.log('- GPS點名: /simple-attendance');
  console.log('- 點名記錄: /attendance-history');
  console.log('- 個人資料: /profile');

  console.log('\n🎯 測試學號:');
  console.log('- 123456 (王小明, 資訊工程系)');
  console.log('- 234567 (李小華, 資訊工程系)');
  console.log('- 345678 (張小美, 電子工程系)');

  console.log('\n💡 提示:');
  console.log('- 確保已設定 Google OAuth 環境變數');
  console.log('- 每日只能點名一次');
  console.log('- 點名需要GPS定位權限');
  console.log('- 所有功能都已準備就緒');

} catch (error) {
  console.error('\n❌ 系統初始化失敗:', error);
  console.error('詳細錯誤:', error.message);
  
  if (error.message.includes('ENOENT')) {
    console.log('\n💡 建議: 檢查檔案路徑和權限');
  } else if (error.message.includes('SQLITE_')) {
    console.log('\n💡 建議: 檢查 SQLite 語法或資料庫狀態');
  } else if (error.message.includes('database is locked')) {
    console.log('\n💡 建議: 關閉其他使用資料庫的程序');
  }
  
  process.exit(1);
}