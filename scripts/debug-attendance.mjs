// scripts/debug-attendance.mjs
// 點名系統除錯腳本

import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_PATH || './data/app.db';

console.log('🔍 點名系統除錯診斷...\n');

try {
  const db = new Database(DB_PATH);
  
  // 1. 檢查用戶資訊
  console.log('1️⃣ 檢查用戶資訊:');
  const users = db.prepare("SELECT id, email, name, student_id, binding_status FROM users").all();
  
  users.forEach(user => {
    console.log(`  用戶 ${user.id}: ${user.name} (${user.email})`);
    console.log(`    學號: ${user.student_id || '未綁定'}`);
    console.log(`    綁定狀態: ${user.binding_status || 'unbound'}`);
  });

  // 2. 檢查學生資料
  console.log('\n2️⃣ 檢查學生資料:');
  const students = db.prepare("SELECT student_id, name, department FROM students LIMIT 5").all();
  
  if (students.length > 0) {
    students.forEach(student => {
      console.log(`  ${student.student_id}: ${student.name} (${student.department})`);
    });
  } else {
    console.log('  ❌ 沒有學生資料');
  }

  // 3. 檢查點名記錄表結構
  console.log('\n3️⃣ 檢查點名記錄表:');
  const attendanceTableInfo = db.prepare("PRAGMA table_info(attendance_records)").all();
  
  console.log(`  欄位數量: ${attendanceTableInfo.length}`);
  attendanceTableInfo.forEach(col => {
    console.log(`    ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });

  // 4. 檢查點名記錄數據
  console.log('\n4️⃣ 檢查點名記錄:');
  const allAttendance = db.prepare("SELECT * FROM attendance_records ORDER BY timestamp DESC").all();
  
  console.log(`  總記錄數: ${allAttendance.length}`);
  
  if (allAttendance.length > 0) {
    console.log('  最近記錄:');
    allAttendance.slice(0, 3).forEach(record => {
      console.log(`    ID ${record.id}: 用戶${record.user_id} 學號${record.student_id}`);
      console.log(`      時間: ${record.timestamp}`);
      console.log(`      位置: ${record.latitude}, ${record.longitude}`);
      console.log(`      狀態: ${record.status}`);
    });
  } else {
    console.log('  ❌ 沒有點名記錄');
  }

  // 5. 檢查今日記錄
  console.log('\n5️⃣ 檢查今日記錄:');
  const todayRecords = db.prepare(`
    SELECT * FROM attendance_records 
    WHERE date(timestamp) = date('now', 'localtime')
    ORDER BY timestamp DESC
  `).all();
  
  console.log(`  今日記錄數: ${todayRecords.length}`);
  
  if (todayRecords.length > 0) {
    todayRecords.forEach(record => {
      console.log(`    用戶${record.user_id} (${record.student_id}) - ${record.timestamp}`);
    });
  }

  // 6. 測試插入功能
  console.log('\n6️⃣ 測試點名記錄插入:');
  
  if (users.length > 0) {
    const testUser = users[0];
    console.log(`  測試用戶: ${testUser.name} (ID: ${testUser.id})`);
    
    try {
      const testInsert = db.prepare(`
        INSERT INTO attendance_records (
          user_id, student_id, latitude, longitude, accuracy, 
          timestamp, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const testResult = testInsert.run(
        testUser.id,
        testUser.student_id || 'TEST999',
        25.0174, // 台北市緯度
        121.5398, // 台北市經度  
        50.0,
        new Date().toISOString(),
        'present',
        '測試記錄 - 系統除錯'
      );
      
      console.log(`  ✅ 插入測試成功: ID ${testResult.lastInsertRowid}`);
      
      // 查詢剛插入的記錄
      const insertedRecord = db.prepare("SELECT * FROM attendance_records WHERE id = ?").get(testResult.lastInsertRowid);
      console.log(`  ✅ 查詢測試成功: ${insertedRecord.timestamp}`);
      
      // 立即刪除測試記錄
      const deleteResult = db.prepare("DELETE FROM attendance_records WHERE id = ?").run(testResult.lastInsertRowid);
      console.log(`  🧹 測試記錄已清理 (刪除 ${deleteResult.changes} 筆)`);
      
    } catch (insertError) {
      console.log(`  ❌ 插入測試失敗: ${insertError.message}`);
    }
  }

  // 7. 檢查用戶綁定狀態
  console.log('\n7️⃣ 檢查用戶綁定狀態:');
  
  users.forEach(user => {
    const isBound = user.student_id && user.binding_status === 'bound';
    console.log(`  用戶 ${user.id} (${user.name}): ${isBound ? '✅ 已綁定' : '❌ 未綁定'}`);
    
    if (!isBound && user.student_id) {
      console.log(`    ⚠️  有學號但狀態未更新: ${user.student_id}`);
    }
  });

  // 8. 提供修復建議
  console.log('\n8️⃣ 系統狀態總結:');
  
  const hasUsers = users.length > 0;
  const hasStudents = students.length > 0;
  const hasAttendance = allAttendance.length > 0;
  const hasBoundUsers = users.some(u => u.student_id && u.binding_status === 'bound');
  
  console.log(`  用戶系統: ${hasUsers ? '✅' : '❌'} (${users.length} 用戶)`);
  console.log(`  學生資料: ${hasStudents ? '✅' : '❌'} (${students.length} 學生)`);
  console.log(`  用戶綁定: ${hasBoundUsers ? '✅' : '❌'}`);
  console.log(`  點名記錄: ${hasAttendance ? '✅' : '⚠️'} (${allAttendance.length} 記錄)`);

  db.close();

  // 9. 提供解決方案
  console.log('\n🔧 問題排查建議:');
  
  if (!hasBoundUsers) {
    console.log('❗ 主要問題: 用戶未正確綁定學號');
    console.log('解決方案:');
    console.log('  1. 前往 /bind-student 頁面');
    console.log('  2. 使用學號 123456，姓名 王小明');
    console.log('  3. 確認綁定狀態更新為 "bound"');
  }
  
  if (!hasAttendance) {
    console.log('❗ 點名記錄為空，可能原因:');
    console.log('  1. 用戶未正確綁定學號');
    console.log('  2. 點名過程中發生錯誤但未顯示');
    console.log('  3. 前端和後端的用戶ID不匹配');
  }
  
  console.log('\n📝 下一步操作:');
  console.log('1. 檢查瀏覽器控制台是否有錯誤');
  console.log('2. 確保用戶已正確綁定學號');
  console.log('3. 重新嘗試點名並觀察服務器日誌');
  console.log('4. 如果問題持續，檢查 simple-attendance.tsx 中的邏輯');

} catch (error) {
  console.error('❌ 除錯腳本執行失敗:', error);
  console.error('詳細錯誤:', error.message);
}

console.log('\n🏁 除錯診斷完成');