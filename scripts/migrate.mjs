// scripts/migrate.mjs
// 執行資料庫遷移腳本

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const DB_PATH = process.env.DATABASE_PATH || './data/app.db';
const MIGRATION_PATH = join(projectRoot, 'database/migrations/003_add_students.sql');

console.log('🚀 開始執行資料庫遷移...');

try {
  // 檢查資料庫檔案
  if (!existsSync(DB_PATH)) {
    console.error('❌ 資料庫檔案不存在:', DB_PATH);
    console.log('請先執行: npm run db:init');
    process.exit(1);
  }

  // 檢查遷移檔案
  if (!existsSync(MIGRATION_PATH)) {
    console.error('❌ 遷移檔案不存在:', MIGRATION_PATH);
    process.exit(1);
  }

  // 連接資料庫
  const db = new Database(DB_PATH);
  console.log('✅ 資料庫連接成功');

  // 檢查現有表結構
  console.log('🔄 檢查現有表結構...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('現有表:', tables.map(t => t.name).join(', '));

  // 檢查是否已經有 students 表
  const hasStudentsTable = tables.some(t => t.name === 'students');
  if (hasStudentsTable) {
    console.log('⚠️  students 表已存在');
    
    // 檢查是否需要添加新欄位到 users 表
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    const hasStudentId = userColumns.some(col => col.name === 'student_id');
    const hasBindingStatus = userColumns.some(col => col.name === 'binding_status');
    
    if (!hasStudentId || !hasBindingStatus) {
      console.log('🔄 需要為 users 表添加新欄位...');
    } else {
      console.log('✅ 遷移似乎已經完成');
      db.close();
      process.exit(0);
    }
  }

  // 讀取遷移 SQL
  console.log('📄 讀取遷移檔案...');
  const migrationSQL = readFileSync(MIGRATION_PATH, 'utf8');
  console.log(`檔案大小: ${migrationSQL.length} 字元`);

  // 執行遷移
  console.log('🔄 執行遷移...');
  
  // 分割 SQL 語句並逐一執行
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`準備執行 ${statements.length} 個 SQL 語句`);

  let successCount = 0;
  let skipCount = 0;

  for (const statement of statements) {
    try {
      if (statement.toLowerCase().includes('alter table') && 
          statement.toLowerCase().includes('add column')) {
        // 對於 ALTER TABLE ADD COLUMN，檢查欄位是否已存在
        const columnMatch = statement.match(/ADD COLUMN (\w+)/i);
        if (columnMatch) {
          const columnName = columnMatch[1];
          const tableName = statement.match(/ALTER TABLE (\w+)/i)?.[1];
          
          if (tableName) {
            const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
            const columnExists = columns.some(col => col.name === columnName);
            
            if (columnExists) {
              console.log(`⏭️  跳過：欄位 ${columnName} 已存在於 ${tableName} 表`);
              skipCount++;
              continue;
            }
          }
        }
      }
      
      db.exec(statement);
      successCount++;
      
      // 顯示執行的語句類型
      if (statement.toLowerCase().includes('create table')) {
        const tableName = statement.match(/CREATE TABLE.*?(\w+)/i)?.[1];
        console.log(`✅ 建立表: ${tableName}`);
      } else if (statement.toLowerCase().includes('create index')) {
        const indexName = statement.match(/CREATE INDEX.*?(\w+)/i)?.[1];
        console.log(`✅ 建立索引: ${indexName}`);
      } else if (statement.toLowerCase().includes('alter table')) {
        console.log(`✅ 修改表結構`);
      } else if (statement.toLowerCase().includes('insert')) {
        console.log(`✅ 插入測試資料`);
      } else if (statement.toLowerCase().includes('create trigger')) {
        const triggerName = statement.match(/CREATE TRIGGER.*?(\w+)/i)?.[1];
        console.log(`✅ 建立觸發器: ${triggerName}`);
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

  // 檢查 students 表
  const tablesAfter = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const hasStudentsTableAfter = tablesAfter.some(t => t.name === 'students');
  console.log(`students 表: ${hasStudentsTableAfter ? '✅ 存在' : '❌ 不存在'}`);

  if (hasStudentsTableAfter) {
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM students").get();
    console.log(`測試學生資料: ${studentCount.count} 筆`);
  }

  // 檢查 users 表的新欄位
  const userColumnsAfter = db.prepare("PRAGMA table_info(users)").all();
  const hasStudentIdAfter = userColumnsAfter.some(col => col.name === 'student_id');
  const hasBindingStatusAfter = userColumnsAfter.some(col => col.name === 'binding_status');
  
  console.log(`users.student_id 欄位: ${hasStudentIdAfter ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`users.binding_status 欄位: ${hasBindingStatusAfter ? '✅ 存在' : '❌ 不存在'}`);

  // 顯示所有表
  console.log('\n📋 所有資料表:');
  tablesAfter.forEach(table => {
    console.log(`  - ${table.name}`);
  });

  db.close();
  console.log('\n🎉 遷移完成！');
  
  console.log('\n📝 下一步:');
  console.log('1. 重新啟動應用: npm run dev');
  console.log('2. 登入並測試學號綁定功能');
  console.log('3. 使用測試學號：123456 (王小明) 進行綁定測試');

} catch (error) {
  console.error('❌ 遷移失敗:', error);
  console.error('詳細錯誤:', error.message);
  
  if (error.message.includes('no such table')) {
    console.log('\n💡 建議: 請先執行基礎資料庫初始化');
    console.log('npm run db:init');
  } else if (error.message.includes('syntax error')) {
    console.log('\n💡 建議: 檢查 SQL 語法是否正確');
  } else if (error.message.includes('database is locked')) {
    console.log('\n💡 建議: 關閉其他使用資料庫的程序');
  }
  
  process.exit(1);
}