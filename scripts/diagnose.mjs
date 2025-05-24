// scripts/diagnose.mjs
// 問題診斷腳本 (ES modules 版本)

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync, statSync, accessSync, constants } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 開始系統診斷...\n');

// 1. 檢查環境變數
console.log('1️⃣ 檢查環境變數:');
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GOOGLE_CALLBACK_URL',
  'AUTH_SECRET'
];

const optionalEnvVars = [
  'DATABASE_PATH',
  'ENABLE_DATABASE_LOGGING',
  'NODE_ENV'
];

// 讀取 .env 檔案
const envPath = join(projectRoot, '.env');
let envVars = {};

if (existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
    console.log('  📄 .env 檔案: ✅ 已找到並讀取');
  } catch (error) {
    console.log('  📄 .env 檔案: ⚠️  讀取失敗');
  }
} else {
  console.log('  📄 .env 檔案: ❌ 不存在');
}

requiredEnvVars.forEach(varName => {
  const value = process.env[varName] || envVars[varName];
  console.log(`  ${varName}: ${value ? '✅ 已設定' : '❌ 未設定'}`);
});

optionalEnvVars.forEach(varName => {
  const value = process.env[varName] || envVars[varName];
  console.log(`  ${varName}: ${value || '⚠️  使用預設值'}`);
});

// 2. 檢查檔案結構
console.log('\n2️⃣ 檢查檔案結構:');
const requiredFiles = [
  'database/schema.sql',
  'app/models/user.ts',
  'app/lib/database.server.ts',
  'app/lib/user.server.ts',
  'app/lib/google-auth.server.ts',
  'app/routes/services/session.server.ts',
  'app/routes/auth.google.callback.tsx'
];

requiredFiles.forEach(filePath => {
  const fullPath = join(projectRoot, filePath);
  const exists = existsSync(fullPath);
  console.log(`  ${filePath}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
  
  if (exists) {
    try {
      const stats = statSync(fullPath);
      console.log(`    📏 檔案大小: ${stats.size} bytes`);
    } catch (error) {
      console.log(`    ⚠️  無法讀取檔案資訊`);
    }
  }
});

// 3. 檢查目錄結構
console.log('\n3️⃣ 檢查目錄結構:');
const requiredDirs = [
  'data',
  'data/backups',
  'database',
  'app/models',
  'scripts'
];

requiredDirs.forEach(dirPath => {
  const fullPath = join(projectRoot, dirPath);
  const exists = existsSync(fullPath);
  console.log(`  ${dirPath}/: ${exists ? '✅ 存在' : '❌ 不存在'}`);
  
  if (!exists) {
    try {
      mkdirSync(fullPath, { recursive: true });
      console.log(`    📁 已建立目錄: ${dirPath}`);
    } catch (error) {
      console.log(`    ❌ 建立目錄失敗: ${error.message}`);
    }
  }
});

// 4. 檢查資料庫
console.log('\n4️⃣ 檢查資料庫:');
const dbPath = (process.env.DATABASE_PATH || envVars.DATABASE_PATH) || './data/app.db';
const fullDbPath = join(projectRoot, dbPath);

try {
  console.log(`  資料庫路徑: ${dbPath}`);
  console.log(`  完整路徑: ${fullDbPath}`);
  
  const dbExists = existsSync(fullDbPath);
  console.log(`  資料庫檔案存在: ${dbExists ? '✅ 是' : '❌ 否'}`);
  
  if (dbExists) {
    const stats = statSync(fullDbPath);
    console.log(`  資料庫檔案大小: ${stats.size} bytes`);
    console.log(`  建立時間: ${stats.birthtime.toLocaleString()}`);
    console.log(`  修改時間: ${stats.mtime.toLocaleString()}`);
    
    // 嘗試連接資料庫
    try {
      const db = new Database(fullDbPath);
      console.log('  資料庫連接: ✅ 成功');
      
      // 檢查表結構
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log(`  資料表數量: ${tables.length}`);
      tables.forEach(table => {
        console.log(`    - ${table.name}`);
      });
      
      // 檢查 users 表
      if (tables.some(t => t.name === 'users')) {
        console.log('  users 表: ✅ 存在');
        
        try {
          const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
          console.log(`  用戶記錄數量: ${userCount.count}`);
          
          if (userCount.count > 0) {
            const recentUsers = db.prepare("SELECT email, name, created_at FROM users ORDER BY created_at DESC LIMIT 3").all();
            console.log('  最近的用戶:');
            recentUsers.forEach(user => {
              console.log(`    - ${user.name} (${user.email}) - ${user.created_at}`);
            });
          }
        } catch (queryError) {
          console.log(`  ⚠️  用戶查詢失敗: ${queryError.message}`);
        }
        
        // 檢查表結構
        try {
          const columns = db.prepare("PRAGMA table_info(users)").all();
          console.log(`  users 表欄位數量: ${columns.length}`);
          const expectedColumns = ['id', 'google_id', 'email', 'name', 'avatar_url', 'locale', 'verified_email', 'created_at', 'updated_at', 'last_login', 'login_count', 'is_active', 'role'];
          
          expectedColumns.forEach(col => {
            const exists = columns.some(c => c.name === col);
            console.log(`    ${col}: ${exists ? '✅' : '❌'}`);
          });
        } catch (pragmaError) {
          console.log(`  ⚠️  表結構檢查失敗: ${pragmaError.message}`);
        }
        
      } else {
        console.log('  users 表: ❌ 不存在');
      }
      
      db.close();
    } catch (error) {
      console.log(`  資料庫連接: ❌ 失敗 - ${error.message}`);
    }
  } else {
    console.log('  ⚠️  資料庫檔案不存在，需要初始化');
  }
} catch (error) {
  console.log(`  資料庫檢查失敗: ❌ ${error.message}`);
}

// 5. 檢查 schema 檔案
console.log('\n5️⃣ 檢查 Schema 檔案:');
const schemaPath = join(projectRoot, 'database/schema.sql');

if (existsSync(schemaPath)) {
  try {
    const schemaContent = readFileSync(schemaPath, 'utf8');
    console.log(`  Schema 檔案: ✅ 存在`);
    console.log(`  檔案大小: ${schemaContent.length} 字元`);
    
    // 檢查 schema 內容
    const hasUsersTable = schemaContent.includes('CREATE TABLE') && schemaContent.includes('users');
    console.log(`  包含 users 表定義: ${hasUsersTable ? '✅ 是' : '❌ 否'}`);
    
    const hasIndexes = schemaContent.includes('CREATE INDEX');
    console.log(`  包含索引定義: ${hasIndexes ? '✅ 是' : '❌ 否'}`);
    
    const hasTrigger = schemaContent.includes('CREATE TRIGGER');
    console.log(`  包含觸發器定義: ${hasTrigger ? '✅ 是' : '❌ 否'}`);
    
  } catch (error) {
    console.log(`  Schema 檔案: ⚠️  讀取失敗 - ${error.message}`);
  }
} else {
  console.log(`  Schema 檔案: ❌ 不存在`);
  console.log('  ⚠️  建議建立 database/schema.sql 檔案');
}

// 6. 檢查 Node.js 模組
console.log('\n6️⃣ 檢查 Node.js 模組:');
const requiredModules = [
  'better-sqlite3',
  'google-auth-library',
  '@remix-run/node',
  '@remix-run/react'
];

for (const moduleName of requiredModules) {
  try {
    await import(moduleName);
    console.log(`  ${moduleName}: ✅ 已安裝且可載入`);
  } catch (error) {
    console.log(`  ${moduleName}: ❌ 無法載入 - ${error.message}`);
  }
}

// 7. 檢查權限
console.log('\n7️⃣ 檢查檔案權限:');
try {
  // 檢查 data 目錄權限
  const dataDir = join(projectRoot, 'data');
  if (existsSync(dataDir)) {
    accessSync(dataDir, constants.W_OK);
    console.log('  data 目錄寫入權限: ✅ 正常');
  } else {
    console.log('  data 目錄: ❌ 不存在');
  }
} catch (error) {
  console.log('  data 目錄寫入權限: ❌ 無權限');
}

if (existsSync(fullDbPath)) {
  try {
    accessSync(fullDbPath, constants.R_OK | constants.W_OK);
    console.log('  資料庫檔案讀寫權限: ✅ 正常');
  } catch (error) {
    console.log('  資料庫檔案讀寫權限: ❌ 無權限');
  }
}

// 8. 檢查 package.json
console.log('\n8️⃣ 檢查 package.json:');
const packagePath = join(projectRoot, 'package.json');
if (existsSync(packagePath)) {
  try {
    const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'));
    console.log('  package.json: ✅ 存在且有效');
    console.log(`  專案名稱: ${packageContent.name}`);
    console.log(`  ES modules: ${packageContent.type === 'module' ? '✅ 啟用' : '❌ 未啟用'}`);
    
    // 檢查必要的依賴
    const deps = { ...packageContent.dependencies, ...packageContent.devDependencies };
    requiredModules.forEach(mod => {
      const version = deps[mod];
      console.log(`  ${mod}: ${version ? `✅ ${version}` : '❌ 未安裝'}`);
    });
    
    // 檢查腳本
    const hasDbScripts = packageContent.scripts && (
      packageContent.scripts['db:init'] || 
      packageContent.scripts['db:reset']
    );
    console.log(`  資料庫腳本: ${hasDbScripts ? '✅ 已定義' : '❌ 未定義'}`);
    
  } catch (error) {
    console.log(`  package.json: ❌ 無效 - ${error.message}`);
  }
} else {
  console.log('  package.json: ❌ 不存在');
}

console.log('\n🎯 診斷建議:');

// 提供修復建議
const suggestions = [];

const googleClientId = process.env.GOOGLE_CLIENT_ID || envVars.GOOGLE_CLIENT_ID;
if (!googleClientId) {
  suggestions.push('設定 Google OAuth 環境變數到 .env 檔案');
}

if (!existsSync(fullDbPath)) {
  suggestions.push('執行資料庫初始化：創建 database/schema.sql 並執行初始化');
}

if (!existsSync(schemaPath)) {
  suggestions.push('建立 database/schema.sql 檔案');
}

try {
  await import('better-sqlite3');
} catch {
  suggestions.push('安裝 better-sqlite3: npm install better-sqlite3');
}

if (suggestions.length === 0) {
  console.log('✅ 系統看起來配置正確！');
  console.log('如果仍有問題，請檢查應用程式日誌。');
} else {
  console.log('建議執行以下步驟:');
  suggestions.forEach((suggestion, index) => {
    console.log(`  ${index + 1}. ${suggestion}`);
  });
}

console.log('\n📝 除錯提示:');
console.log('1. 啟動應用時，設定 ENABLE_DATABASE_LOGGING=true 查看 SQL 日誌');
console.log('2. 檢查控制台是否有資料庫初始化相關日誌');
console.log('3. 嘗試 Google 登入時，觀察控制台的詳細日誌輸出');
console.log('4. 如果資料庫查詢失敗，檢查 prepared statements 是否正確初始化');
console.log('5. 確保所有檔案使用正確的 ES modules 語法 (import/export)');

console.log('\n🔧 快速修復命令:');
console.log('# 建立缺失的目錄');
console.log('mkdir -p data/backups database app/models scripts');
console.log('');
console.log('# 如果資料庫不存在，建立基本結構');
console.log('node -e "import Database from \'better-sqlite3\'; const db = new Database(\'./data/app.db\'); console.log(\'資料庫已建立\');"');

console.log('\n🏁 診斷完成');