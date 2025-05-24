// scripts/test-db-safe.mjs
// 安全版資料庫測試腳本

console.log('🧪 開始資料庫測試...');

try {
  console.log('1. 嘗試導入 better-sqlite3...');
  const Database = await import('better-sqlite3');
  console.log('✅ better-sqlite3 導入成功');
  
  const db = new Database.default('./data/app.db');
  console.log('✅ 資料庫連接成功');

  console.log('2. 測試基本查詢...');
  try {
    const result = db.prepare("SELECT 1 as test").get();
    console.log('✅ 基本查詢成功:', result);
  } catch (queryError) {
    console.error('❌ 基本查詢失敗:', queryError.message);
    throw queryError;
  }

  console.log('3. 檢查資料表...');
  try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('✅ 資料表查詢成功:');
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });
  } catch (tableError) {
    console.error('❌ 資料表查詢失敗:', tableError.message);
    throw tableError;
  }

  console.log('4. 檢查 users 表...');
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    console.log(`✅ users 表記錄數: ${userCount.count}`);
    
    if (userCount.count > 0) {
      console.log('5. 查詢現有用戶...');
      const users = db.prepare("SELECT id, google_id, email, name, role, login_count FROM users LIMIT 5").all();
      users.forEach(user => {
        console.log(`👤 用戶 ${user.id}: ${user.name} (${user.email})`);
        console.log(`   Google ID: ${user.google_id}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   登入次數: ${user.login_count}`);
      });
    } else {
      console.log('ℹ️  沒有用戶記錄');
    }
  } catch (userError) {
    console.error('❌ users 表查詢失敗:', userError.message);
    throw userError;
  }

  console.log('6. 測試 prepared statement...');
  try {
    const findByGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ? AND is_active = 1');
    console.log('✅ Prepared statement 建立成功');
    
    // 如果有用戶，測試查詢
    const firstUser = db.prepare("SELECT google_id FROM users LIMIT 1").get();
    if (firstUser) {
      const found = findByGoogleId.get(firstUser.google_id);
      console.log('✅ Prepared statement 查詢成功:', found ? '找到用戶' : '用戶不存在');
    }
  } catch (prepError) {
    console.error('❌ Prepared statement 失敗:', prepError.message);
    throw prepError;
  }

  console.log('7. 關閉資料庫連接...');
  db.close();
  console.log('✅ 資料庫連接已關閉');

  console.log('\n🎉 所有測試通過！資料庫功能正常');

} catch (error) {
  console.error('\n❌ 測試過程中發生錯誤:');
  console.error('錯誤類型:', error.constructor.name);
  console.error('錯誤訊息:', error.message);
  console.error('錯誤堆疊:', error.stack);
  
  // 提供具體的除錯建議
  if (error.message.includes('better-sqlite3')) {
    console.log('\n💡 建議: 重新安裝 better-sqlite3');
    console.log('npm uninstall better-sqlite3');
    console.log('npm install better-sqlite3');
  } else if (error.message.includes('ENOENT')) {
    console.log('\n💡 建議: 檢查資料庫檔案是否存在');
    console.log('ls -la ./data/app.db');
  } else if (error.message.includes('permission')) {
    console.log('\n💡 建議: 檢查檔案權限');
    console.log('chmod 666 ./data/app.db');
  }
  
  process.exit(1);
}