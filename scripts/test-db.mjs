// scripts/test-db.mjs
// 測試資料庫操作

import Database from 'better-sqlite3';

const DB_PATH = './data/app.db';

console.log('🧪 測試資料庫操作...\n');

try {
  const db = new Database(DB_PATH);
  console.log('✅ 資料庫連接成功');

  // 1. 測試查詢現有用戶
  console.log('\n1️⃣ 測試查詢現有用戶:');
  const allUsers = db.prepare('SELECT * FROM users').all();
  console.log(`📊 總用戶數: ${allUsers.length}`);
  
  allUsers.forEach(user => {
    console.log(`👤 用戶: ${user.name} (${user.email})`);
    console.log(`   - Google ID: ${user.google_id}`);
    console.log(`   - 登入次數: ${user.login_count}`);
    console.log(`   - 角色: ${user.role}`);
    console.log(`   - 最後登入: ${user.last_login || '從未'}`);
  });

  // 2. 測試根據 Google ID 查詢
  console.log('\n2️⃣ 測試 Google ID 查詢:');
  if (allUsers.length > 0) {
    const testGoogleId = allUsers[0].google_id;
    console.log(`🔍 查詢 Google ID: ${testGoogleId}`);
    
    const findByGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ? AND is_active = 1');
    const foundUser = findByGoogleId.get(testGoogleId);
    
    if (foundUser) {
      console.log('✅ 查詢成功:', foundUser.name);
    } else {
      console.log('❌ 查詢失敗: 找不到用戶');
    }
  }

  // 3. 測試插入新用戶（模擬）
  console.log('\n3️⃣ 測試插入新用戶 (模擬):');
  const testGoogleId = 'test_google_' + Date.now();
  const testEmail = `test_${Date.now()}@example.com`;
  
  const insertUser = db.prepare(`
    INSERT INTO users (google_id, email, name, avatar_url, locale, verified_email, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  try {
    const result = insertUser.run(
      testGoogleId,
      testEmail,
      '測試用戶_' + Date.now(),
      'https://example.com/avatar.jpg',
      'zh-TW',
      1,
      'user'
    );
    
    console.log('✅ 插入成功:', {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid
    });
    
    // 驗證插入的用戶
    const newUser = db.prepare('SELECT * FROM users WHERE google_id = ?').get(testGoogleId);
    if (newUser) {
      console.log('✅ 驗證成功: 新用戶已建立');
      console.log(`   - 資料庫 ID: ${newUser.id}`);
      console.log(`   - 名稱: ${newUser.name}`);
      console.log(`   - Email: ${newUser.email}`);
      
      // 清理測試資料
      const deleteTest = db.prepare('DELETE FROM users WHERE google_id = ?');
      deleteTest.run(testGoogleId);
      console.log('🧹 測試資料已清理');
    }
    
  } catch (insertError) {
    console.log('❌ 插入失敗:', insertError.message);
  }

  // 4. 測試更新操作
  console.log('\n4️⃣ 測試更新操作:');
  if (allUsers.length > 0) {
    const testUser = allUsers[0];
    console.log(`🔄 更新用戶: ${testUser.name}`);
    
    const updateLastLogin = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE google_id = ?');
    const updateResult = updateLastLogin.run(testUser.google_id);
    
    console.log('✅ 更新結果:', { changes: updateResult.changes });
    
    if (updateResult.changes > 0) {
      const updatedUser = db.prepare('SELECT last_login FROM users WHERE google_id = ?').get(testUser.google_id);
      console.log('✅ 最後登入時間已更新:', updatedUser.last_login);
    }
  }

  // 5. 測試統計查詢
  console.log('\n5️⃣ 測試統計查詢:');
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN created_at >= date('now') THEN 1 END) as new_users_today,
      COALESCE(SUM(login_count), 0) as total_logins
    FROM users 
    WHERE is_active = 1
  `).get();
  
  console.log('📊 統計結果:');
  console.log(`   - 總用戶數: ${stats.total_users}`);
  console.log(`   - 今日新用戶: ${stats.new_users_today}`);
  console.log(`   - 總登入次數: ${stats.total_logins}`);

  db.close();
  console.log('\n🎉 所有資料庫操作測試完成！');

} catch (error) {
  console.error('❌ 資料庫測試失敗:', error);
  console.error('詳細錯誤:', error.message);
}