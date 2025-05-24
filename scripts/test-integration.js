// scripts/test-integration.js
// 測試 SQLite 整合功能

const Database = require('better-sqlite3');
const path = require('path');

// 測試用資料庫
const TEST_DB_PATH = './data/test.db';

console.log('🧪 開始整合測試...');

try {
  // 建立測試資料庫
  const db = new Database(TEST_DB_PATH);
  
  // 設定資料庫
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // 建立測試表
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
      role TEXT DEFAULT 'user'
    );
  `);
  
  console.log('✅ 測試資料表建立成功');
  
  // 準備測試語句
  const insertUser = db.prepare(`
    INSERT INTO users (google_id, email, name, avatar_url, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const findByGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ?');
  const updateLastLogin = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE google_id = ?');
  const incrementLoginCount = db.prepare('UPDATE users SET login_count = login_count + 1 WHERE google_id = ?');
  
  // 測試 1: 建立新用戶
  console.log('🔄 測試 1: 建立新用戶');
  const testGoogleId = 'test_google_123';
  const result = insertUser.run(
    testGoogleId,
    'test@example.com',
    '測試用戶',
    'https://example.com/avatar.jpg',
    'user'
  );
  
  if (result.changes === 1) {
    console.log('✅ 新用戶建立成功');
  } else {
    throw new Error('建立用戶失敗');
  }
  
  // 測試 2: 查詢用戶
  console.log('🔄 測試 2: 查詢用戶');
  const user = findByGoogleId.get(testGoogleId);
  
  if (user && user.email === 'test@example.com') {
    console.log('✅ 用戶查詢成功');
    console.log(`   用戶資訊: ${user.name} (${user.email})`);
  } else {
    throw new Error('查詢用戶失敗');
  }
  
  // 測試 3: 更新登入記錄
  console.log('🔄 測試 3: 更新登入記錄');
  updateLastLogin.run(testGoogleId);
  incrementLoginCount.run(testGoogleId);
  
  const updatedUser = findByGoogleId.get(testGoogleId);
  if (updatedUser.login_count === 2) {
    console.log('✅ 登入記錄更新成功');
    console.log(`   登入次數: ${updatedUser.login_count}`);
  } else {
    throw new Error('更新登入記錄失敗');
  }
  
  // 測試 4: 重複建立用戶（應該失敗）
  console.log('🔄 測試 4: 重複建立用戶（預期失敗）');
  try {
    insertUser.run(testGoogleId, 'duplicate@test.com', '重複用戶', null, 'user');
    throw new Error('重複建立用戶應該失敗');
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('✅ 重複用戶檢查正常工作');
    } else {
      throw error;
    }
  }
  
  // 測試 5: 統計查詢
  console.log('🔄 測試 5: 統計查詢');
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN created_at >= date('now') THEN 1 END) as new_users_today,
      COALESCE(SUM(login_count), 0) as total_logins
    FROM users 
    WHERE is_active = 1
  `).get();
  
  if (stats.total_users > 0) {
    console.log('✅ 統計查詢成功');
    console.log(`   總用戶數: ${stats.total_users}`);
    console.log(`   今日新用戶: ${stats.new_users_today}`);
    console.log(`   總登入次數: ${stats.total_logins}`);
  } else {
    throw new Error('統計查詢失敗');
  }
  
  // 清理測試資料
  db.close();
  const fs = require('fs');
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('🧹 測試資料庫已清理');
  }
  
  console.log('🎉 所有測試通過！');
  console.log('');
  console.log('✅ SQLite 整合功能正常');
  console.log('✅ 用戶 CRUD 操作正常');
  console.log('✅ 資料庫約束正常');
  console.log('✅ 統計查詢正常');
  
} catch (error) {
  console.error('❌ 測試失敗:', error);
  process.exit(1);
}