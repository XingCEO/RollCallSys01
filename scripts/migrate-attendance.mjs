// scripts/migrate-attendance.mjs
// 執行點名系統資料庫遷移腳本

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const DB_PATH = process.env.DATABASE_PATH || './data/app.db';
const MIGRATION_PATH = join(projectRoot, 'database/migrations/004_add_attendance.sql');
const SQLITE_MIGRATION_PATH = join(projectRoot, 'database/migrations/004_add_attendance.sqlite');

console.log('🚀 開始執行點名系統資料庫遷移...');

try {
  // 檢查資料庫檔案
  if (!existsSync(DB_PATH)) {
    console.error('❌ 資料庫檔案不存在:', DB_PATH);
    console.log('請先執行: npm run db:init');
    process.exit(1);
  }

  // 檢查遷移檔案（優先使用 .sqlite 檔案）
  let migrationFile = MIGRATION_PATH;
  if (existsSync(SQLITE_MIGRATION_PATH)) {
    migrationFile = SQLITE_MIGRATION_PATH;
    console.log('✅ 使用 SQLite 專用遷移檔案');
  } else if (existsSync(MIGRATION_PATH)) {
    migrationFile = MIGRATION_PATH;
    console.log('⚠️  使用通用 SQL 遷移檔案（可能有編輯器語法警告）');
  } else {
    console.error('❌ 遷移檔案不存在:', MIGRATION_PATH);
    console.log('請確保以下檔案之一存在:');
    console.log('  - ', SQLITE_MIGRATION_PATH);
    console.log('  - ', MIGRATION_PATH);
    process.exit(1);
  }

  // 連接資料庫
  const db = new Database(DB_PATH);
  console.log('✅ 資料庫連接成功');

  // 檢查現有表結構
  console.log('🔄 檢查現有表結構...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('現有表:', tables.map(t => t.name).join(', '));

  // 檢查是否已經有點名相關表
  const hasAttendanceTable = tables.some(t => t.name === 'attendance_records');
  const hasCoursesTable = tables.some(t => t.name === 'courses');
  const hasEnrollmentsTable = tables.some(t => t.name === 'course_enrollments');
  const hasLocationsTable = tables.some(t => t.name === 'attendance_locations');

  console.log('表格狀態檢查:');
  console.log(`  attendance_records: ${hasAttendanceTable ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`  courses: ${hasCoursesTable ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`  course_enrollments: ${hasEnrollmentsTable ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`  attendance_locations: ${hasLocationsTable ? '✅ 存在' : '❌ 不存在'}`);

  if (hasAttendanceTable && hasCoursesTable && hasEnrollmentsTable && hasLocationsTable) {
    console.log('✅ 點名系統表格已存在，檢查是否需要更新...');
    
    // 檢查表結構是否完整
    const attendanceColumns = db.prepare("PRAGMA table_info(attendance_records)").all();
    const requiredColumns = ['user_id', 'student_id', 'latitude', 'longitude', 'accuracy', 'timestamp', 'status'];
    
    const missingColumns = requiredColumns.filter(col => 
      !attendanceColumns.some(dbCol => dbCol.name === col)
    );
    
    if (missingColumns.length === 0) {
      console.log('✅ 表結構完整，遷移已完成');
      
      // 顯示統計資訊
      const attendanceCount = db.prepare("SELECT COUNT(*) as count FROM attendance_records").get();
      const coursesCount = db.prepare("SELECT COUNT(*) as count FROM courses").get();
      
      console.log(`📊 當前資料統計:`);
      console.log(`  點名記錄: ${attendanceCount.count} 筆`);
      console.log(`  課程資料: ${coursesCount.count} 筆`);
      
      db.close();
      process.exit(0);
    } else {
      console.log('⚠️  表結構不完整，缺少欄位:', missingColumns.join(', '));
    }
  }

  // 讀取遷移 SQL
  console.log('📄 讀取遷移檔案...');
  const migrationSQL = readFileSync(migrationFile, 'utf8');
  console.log(`檔案大小: ${migrationSQL.length} 字元`);
  console.log(`使用檔案: ${migrationFile}`);

  // 執行遷移
  console.log('🔄 執行遷移...');
  
  // 分割 SQL 語句並逐一執行
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  console.log(`準備執行 ${statements.length} 個 SQL 語句`);

  let successCount = 0;
  let skipCount = 0;

  for (const statement of statements) {
    try {
      db.exec(statement);
      successCount++;
      
      // 顯示執行的語句類型
      if (statement.toLowerCase().includes('create table')) {
        const tableName = statement.match(/CREATE TABLE.*?(\w+)/i)?.[1];
        console.log(`✅ 建立表: ${tableName}`);
      } else if (statement.toLowerCase().includes('create index')) {
        const indexName = statement.match(/CREATE INDEX.*?(\w+)/i)?.[1];
        console.log(`✅ 建立索引: ${indexName}`);
      } else if (statement.toLowerCase().includes('create trigger')) {
        const triggerName = statement.match(/CREATE TRIGGER.*?(\w+)/i)?.[1];
        console.log(`✅ 建立觸發器: ${triggerName}`);
      } else if (statement.toLowerCase().includes('insert')) {
        console.log(`✅ 插入測試資料`);
      }
      
    } catch (error) {
      // 忽略一些預期的錯誤
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate column name') ||
          error.message.includes('UNIQUE constraint failed')) {
        console.log(`⏭️  跳過：${error.message}`);
        skipCount++;
      } else {
        console.error(`❌ 執行失敗: ${statement.substring(0, 50)}...`);
        console.error(`錯誤: ${error.message}`);
        throw error;
      }
    }
  }

  console.log(`\n📊 執行結果:`);
  console.log(`  成功: ${successCount} 個語句`);
  console.log(`  跳過: ${skipCount} 個語句`);

  // 驗證遷移結果
  console.log('\n🔄 驗證遷移結果...');

  // 檢查所有新表
  const tablesAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const newTables = ['attendance_records', 'courses', 'course_enrollments', 'attendance_locations'];
  
  console.log('📋 表格驗證:');
  newTables.forEach(tableName => {
    const exists = tablesAfter.some(t => t.name === tableName);
    console.log(`  ${tableName}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
  });

  // 檢查測試資料
  try {
    const coursesCount = db.prepare("SELECT COUNT(*) as count FROM courses").get();
    const locationsCount = db.prepare("SELECT COUNT(*) as count FROM attendance_locations").get();
    
    console.log('\n📊 測試資料統計:');
    console.log(`  課程資料: ${coursesCount.count} 筆`);
    console.log(`  地點資料: ${locationsCount.count} 筆`);
    
    // 顯示示例課程
    if (coursesCount.count > 0) {
      const sampleCourses = db.prepare("SELECT course_code, course_name, instructor FROM courses LIMIT 3").all();
      console.log('\n📚 示例課程:');
      sampleCourses.forEach(course => {
        console.log(`  - ${course.course_code}: ${course.course_name} (${course.instructor})`);
      });
    }
    
  } catch (error) {
    console.log('⚠️  無法取得測試資料統計:', error.message);
  }

  // 測試點名功能
  console.log('\n🧪 測試點名功能...');
  try {
    // 嘗試插入一筆測試點名記錄
    const testInsert = db.prepare(`
      INSERT INTO attendance_records (user_id, student_id, latitude, longitude, accuracy, timestamp, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const testResult = testInsert.run(
      1, // 假設用戶ID為1
      'TEST123',
      25.0174, // 台北市緯度
      121.5398, // 台北市經度
      50.0,
      new Date().toISOString(),
      'present'
    );
    
    console.log('✅ 點名功能測試成功');
    
    // 立即刪除測試記錄
    db.prepare("DELETE FROM attendance_records WHERE student_id = 'TEST123'").run();
    console.log('🧹 測試記錄已清理');
    
  } catch (error) {
    console.log('❌ 點名功能測試失敗:', error.message);
  }

  db.close();
  console.log('\n🎉 點名系統遷移完成！');
  
  console.log('\n📝 下一步操作:');
  console.log('1. 重新啟動應用: npm run dev');
  console.log('2. 登入系統並綁定學號');
  console.log('3. 前往點名頁面測試GPS點名功能');
  console.log('4. 使用測試學號：123456 (王小明) 進行完整測試');
  
  console.log('\n💡 功能說明:');
  console.log('- 📍 GPS定位點名：記錄經緯度和準確度');
  console.log('- 🛡️  防重複點名：每日只能點名一次');
  console.log('- 📊 統計功能：查看個人點名記錄統計');
  console.log('- 🏫 課程管理：支援多課程點名系統');
  console.log('- 📱 設備追蹤：記錄點名設備和IP資訊');

} catch (error) {
  console.error('❌ 遷移失敗:', error);
  console.error('詳細錯誤:', error.message);
  
  if (error.message.includes('no such table')) {
    console.log('\n💡 建議: 請先執行基礎資料庫初始化');
    console.log('npm run db:init');
  } else if (error.message.includes('syntax error')) {
    console.log('\n💡 建議: 檢查 SQL 語法是否正確');
    console.log('檢查檔案:', MIGRATION_PATH);
  } else if (error.message.includes('database is locked')) {
    console.log('\n💡 建議: 關閉其他使用資料庫的程序');
  } else if (error.message.includes('ENOENT')) {
    console.log('\n💡 建議: 檢查檔案路徑是否正確');
    console.log('資料庫路徑:', DB_PATH);
    console.log('遷移檔案路徑:', MIGRATION_PATH);
  }
  
  process.exit(1);
}