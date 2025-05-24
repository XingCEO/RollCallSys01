# Remix Google OAuth 認證系統

基於 Remix 框架建構的完整 Google OAuth 認證系統，整合 SQLite 資料庫與學號綁定功能，適用於教育機構或需要身份驗證的應用場景。

## 🚀 功能特色

### 核心功能
- ✅ **Google OAuth 2.0 認證** - 安全的第三方登入機制
- ✅ **SQLite 資料庫整合** - 完整的用戶資料管理
- ✅ **學號綁定系統** - 支援學籍資料關聯
- ✅ **Session 管理** - 安全的會話狀態維護
- ✅ **路由保護** - 基於角色的存取控制
- ✅ **響應式 UI** - 現代化使用者介面 (Tailwind CSS)
- ✅ **TypeScript 支援** - 完整的類型安全
- ✅ **完整的錯誤處理** - 友善的錯誤提示與診斷

### 進階功能
- 🔐 **多層級權限控制** - 用戶/管理員角色管理
- 📊 **使用統計追蹤** - 登入次數與活動記錄
- 🏫 **學籍管理系統** - 支援學生資料管理
- 🔄 **資料庫遷移工具** - 結構化資料庫更新
- 🛠️ **開發工具集** - 豐富的除錯與維護腳本

## 📂 專案結構

```
remix-google-oauth2-tutorial/
├── 📁 app/                           # 應用程式主要代碼
│   ├── 📁 lib/                       # 核心業務邏輯
│   │   ├── 📄 database.server.ts     # 資料庫連接與管理
│   │   ├── 📄 google-auth.server.ts  # Google OAuth 認證邏輯
│   │   ├── 📄 user.server.ts         # 用戶資料庫操作
│   │   ├── 📄 student.server.ts      # 學生資料庫操作
│   │   └── 📄 simple-binding.server.ts # 簡化綁定邏輯
│   ├── 📁 models/                    # 資料模型定義
│   │   ├── 📄 user.ts                # 用戶資料模型
│   │   └── 📄 student.ts             # 學生資料模型
│   ├── 📁 routes/                    # 路由與頁面組件
│   │   ├── 📁 services/
│   │   │   └── 📄 session.server.ts  # Session 管理服務
│   │   ├── 📄 _index.tsx             # 首頁
│   │   ├── 📄 login.tsx              # 登入頁面
│   │   ├── 📄 dashboard.tsx          # 使用者儀表板
│   │   ├── 📄 profile.tsx            # 個人資料頁面
│   │   ├── 📄 bind-student.tsx       # 學號綁定頁面
│   │   ├── 📄 welcome.tsx            # 新用戶歡迎頁面
│   │   ├── 📄 auth.google.tsx        # Google 認證入口
│   │   ├── 📄 auth.google.callback.tsx # OAuth 回調處理
│   │   ├── 📄 logout.tsx             # 登出處理
│   │   └── 📄 $.tsx                  # Catch-all 路由
│   ├── 📄 root.tsx                   # 應用程式根組件
│   └── 📄 tailwind.css               # 樣式檔案
├── 📁 database/                      # 資料庫相關檔案
│   ├── 📄 schema.sql                 # 基礎資料庫結構
│   └── 📁 migrations/
│       └── 📄 003_add_students.sql   # 學生系統遷移檔案
├── 📁 data/                          # 資料庫檔案目錄
│   ├── 📄 app.db                     # SQLite 資料庫檔案
│   └── 📁 backups/                   # 資料庫備份目錄
├── 📁 scripts/                       # 維護與開發腳本
│   ├── 📄 init-db.js                 # 資料庫初始化
│   ├── 📄 migrate.mjs                # 資料庫遷移
│   ├── 📄 diagnose.mjs               # 系統診斷工具
│   ├── 📄 test-db.mjs                # 資料庫測試
│   └── 📄 test-integration.js        # 整合測試
├── 📄 .env                           # 環境變數配置
├── 📄 package.json                   # 依賴管理
├── 📄 vite.config.ts                 # Vite 配置
└── 📄 README.md                      # 專案說明文件
```

## 🔧 核心組件詳解

### 🔐 認證系統

#### `app/lib/google-auth.server.ts`
Google OAuth 認證的核心邏輯：
- **`generateAuthUrl()`**: 生成 Google 認證 URL，支援自訂狀態參數
- **`verifyGoogleToken()`**: 驗證 Google 回傳的認證碼，取得用戶資訊
- **環境變數檢查**: 確保必要的 OAuth 配置存在，提供詳細錯誤提示

#### `app/routes/services/session.server.ts`
進階 Session 管理系統：
- **`sessionStorage`**: 基於 Cookie 的安全 session 儲存
- **`getUserFromSession()`**: 從 session 中安全取得使用者資料
- **`requireUserSession()`**: 路由保護中間件，支援自訂重新導向
- **`requireRole()`**: 基於角色的存取控制
- **`requireAdmin()`**: 管理員權限檢查

### 🗄️ 資料庫系統

#### `app/lib/database.server.ts`
強化版資料庫管理器：
- **連接池管理**: 單例模式確保效能最佳化
- **自動初始化**: 智能檢測並建立資料庫結構
- **錯誤處理**: 完整的錯誤捕獲與日誌記錄
- **效能優化**: WAL 模式、外鍵約束、索引優化
- **診斷功能**: 內建資料庫狀態檢查與統計

#### `app/lib/user.server.ts`
用戶資料庫操作層：
- **CRUD 操作**: 完整的用戶建立、查詢、更新、刪除
- **Prepared Statements**: 預編譯語句提升效能與安全性
- **事務支援**: 確保資料一致性
- **統計功能**: 用戶活動統計與分析

#### `app/lib/student.server.ts`
學生管理系統：
- **學籍管理**: 完整的學生資料 CRUD 操作
- **綁定邏輯**: Google 帳號與學號關聯機制
- **驗證系統**: 學號格式與姓名匹配驗證
- **統計報表**: 按系所、年級的綁定統計

### 🛡️ 路由保護

#### `app/root.tsx`
全域安全控制：
- **智能路由檢查**: 自動識別公開與受保護路由
- **無感重新導向**: 未登入用戶自動導向登入頁面
- **效能優化**: 避免不必要的資料庫查詢

### 📄 使用者介面

#### 登入流程
- **`app/routes/login.tsx`**: 美觀的登入介面，支援多種錯誤狀態顯示
- **`app/routes/auth.google.tsx`**: Google OAuth 入口點
- **`app/routes/auth.google.callback.tsx`**: 完整的 OAuth 回調處理邏輯

#### 使用者體驗
- **`app/routes/welcome.tsx`**: 新用戶友善的歡迎頁面
- **`app/routes/dashboard.tsx`**: 功能豐富的使用者儀表板
- **`app/routes/profile.tsx`**: 完整的個人資料管理
- **`app/routes/bind-student.tsx`**: 直觀的學號綁定流程

## ⚙️ 環境設定

### 1. 環境變數配置

建立 `.env` 檔案並配置以下變數：

```env
# === Google OAuth 設定 ===
GOOGLE_CLIENT_ID=你的Google客戶端ID
GOOGLE_CLIENT_SECRET=你的Google客戶端密鑰
GOOGLE_CALLBACK_URL=http://localhost:5173/auth/google/callback

# === 安全設定 ===
AUTH_SECRET=你的超級機密Session密鑰至少32個字符長

# === 資料庫設定 (可選) ===
DATABASE_PATH=./data/app.db
ENABLE_DATABASE_LOGGING=true

# === 環境設定 ===
NODE_ENV=development
```

### 2. Google Cloud Console 設定

詳細設定步驟：

1. **前往 [Google Cloud Console](https://console.cloud.google.com/)**
2. **建立新專案或選擇現有專案**
3. **啟用必要的 API**：
   - Google+ API 或 People API
   - Identity and Access Management (IAM) API
4. **建立 OAuth 2.0 憑證**：
   - 應用程式類型：**網路應用程式**
   - 名稱：`Remix OAuth App`
   - 已授權的 JavaScript 來源：`http://localhost:5173`
   - 已授權的重新導向 URI：`http://localhost:5173/auth/google/callback`
5. **OAuth 同意畫面設定**：
   - 應用程式名稱：您的應用程式名稱
   - 使用者支援電子郵件：您的電子郵件
   - 範圍：`email`, `profile`, `openid`
6. **複製憑證**：
   - 將 Client ID 和 Client Secret 複製到 `.env` 檔案

### 3. 生產環境額外設定

```env
# 生產環境設定
NODE_ENV=production
AUTH_SECRET=生產環境專用的強密鑰至少64個字符
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback

# 資料庫優化
DATABASE_PATH=/var/app/data/app.db
ENABLE_DATABASE_LOGGING=false
```

## 🚀 安裝與執行

### 快速開始

```bash
# 1. 克隆專案
git clone [repository-url]
cd remix-google-oauth2-tutorial

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 檔案，填入您的 Google OAuth 憑證

# 4. 初始化資料庫
npm run db:init

# 5. 執行資料庫遷移 (啟用學號綁定功能)
npm run db:migrate

# 6. 啟動開發伺服器
npm run dev

# 7. 開啟瀏覽器
# 前往 http://localhost:5173
```

### 詳細安裝步驟

```bash
# 安裝 Node.js 依賴
npm install

# 初始化資料庫 (包含測試資料)
npm run db:init:test

# 檢查系統狀態
npm run diagnose

# 測試資料庫連接
npm run test:db

# 啟動開發模式 (含詳細日誌)
npm run dev:verbose
```

## 📝 可用腳本

### 開發腳本
```bash
# 開發模式 (精簡日誌)
npm run dev

# 開發模式 (詳細日誌)
npm run dev:verbose

# 類型檢查
npm run typecheck

# 代碼檢查
npm run lint
```

### 資料庫管理腳本
```bash
# 初始化資料庫
npm run db:init

# 初始化並包含測試資料
npm run db:init:test

# 執行資料庫遷移
npm run db:migrate

# 重置資料庫 (危險操作!)
npm run db:reset

# 備份資料庫
npm run db:backup

# 檢查資料庫狀態
npm run db:status
```

### 測試與診斷腳本
```bash
# 系統診斷
npm run diagnose

# 資料庫測試
npm run test:db

# 整合測試
npm run test:integration

# 安全模式資料庫測試
npm run test:db:safe
```

### 生產環境腳本
```bash
# 建構生產版本
npm run build

# 啟動生產伺服器
npm start
```

## 🔒 安全特性

### 資料保護
- **HttpOnly Cookies**: 防止 XSS 攻擊存取 session 資料
- **SameSite Cookie**: 防止 CSRF 攻擊
- **HTTPS in Production**: 生產環境強制使用加密連接
- **Session 驗證**: 每個請求都驗證 session 有效性與完整性

### 資料庫安全
- **Prepared Statements**: 防止 SQL 注入攻擊
- **參數綁定**: 所有用戶輸入都經過安全處理
- **權限隔離**: 最小權限原則
- **資料加密**: 敏感資料的安全儲存

### 存取控制
- **角色驗證**: 基於角色的細粒度權限控制
- **路由保護**: 多層級的路由存取控制
- **API 端點保護**: 所有敏感操作都需要身份驗證

## 🛣️ 完整認證流程

### 登入流程
1. **用戶造訪首頁** → 未登入自動重新導向到 `/login`
2. **點擊「使用 Google 登入」** → 重新導向到 `/auth/google`
3. **生成 OAuth URL** → 自動重新導向到 Google 登入頁面
4. **Google 身份驗證** → 用戶在 Google 完成登入
5. **OAuth 回調** → Google 重新導向到 `/auth/google/callback`
6. **驗證與用戶處理**：
   - 驗證 Google 回傳的認證碼
   - 檢查用戶是否已存在於資料庫
   - 新用戶：建立帳號記錄
   - 現有用戶：更新登入記錄
7. **Session 建立** → 建立安全的用戶 session
8. **重新導向**：
   - 新用戶 → `/welcome` (歡迎頁面)
   - 現有用戶 → `/dashboard` (儀表板)

### 學號綁定流程
1. **存取綁定頁面** → `/bind-student`
2. **輸入學號與姓名** → 前端驗證基本格式
3. **伺服器端驗證**：
   - 學號格式檢查 (6位數字)
   - 學籍資料查詢
   - 姓名匹配驗證
   - 綁定狀態檢查
4. **確認綁定** → 顯示學籍資訊供用戶確認
5. **執行綁定** → 在資料庫中建立關聯
6. **完成通知** → 重新導向到個人資料頁面

## 🎨 UI/UX 特色

### 設計原則
- **響應式設計**: 完美支援桌面、平板、手機裝置
- **無障礙設計**: 支援鍵盤導航、螢幕閱讀器、高對比模式
- **現代化介面**: 使用 Tailwind CSS 打造清爽的視覺體驗
- **一致性體驗**: 統一的設計語言與互動模式

### 互動體驗
- **載入狀態**: 優雅的載入提示與骨架畫面
- **錯誤處理**: 友善且具體的錯誤訊息
- **即時回饋**: 操作成功/失敗的即時通知
- **漸進式增強**: 確保在任何環境下都能正常使用

### 視覺設計
- **色彩系統**: 語義化的色彩使用
- **圖標系統**: 直觀的視覺引導
- **排版系統**: 清晰的資訊層級
- **空間設計**: 合理的留白與佈局

## 📊 監控與分析

### 內建統計功能
- **用戶統計**: 總用戶數、新用戶、活躍用戶
- **登入統計**: 登入次數、最後登入時間
- **綁定統計**: 學號綁定率、系所分布
- **系統健康**: 資料庫效能、錯誤率

### 日誌系統
```bash
# 啟用詳細日誌
ENABLE_DATABASE_LOGGING=true

# 查看系統狀態
npm run db:status

# 診斷系統問題
npm run diagnose
```

## 🐛 疑難排解

### 常見問題與解決方案

#### CJS 建構警告
```
The CJS build of Vite's Node API is deprecated
```
**解決方案**: 這是 Remix 框架的已知問題，不影響功能運作，可以安全忽略。

#### Google OAuth 認證錯誤
**可能原因**:
- Google Cloud Console 的重新導向 URI 設定錯誤
- 環境變數配置不正確
- Client ID 或 Secret 過期

**解決步驟**:
1. 檢查 `.env` 檔案中的 Google OAuth 設定
2. 確認 Google Cloud Console 中的重新導向 URI
3. 檢查 OAuth 憑證是否有效
4. 查看瀏覽器開發者工具的網路請求

#### 資料庫連接問題
**診斷指令**:
```bash
# 系統診斷
npm run diagnose

# 測試資料庫
npm run test:db:safe

# 檢查資料庫狀態
npm run db:status
```

**常見解決方案**:
```bash
# 重新初始化資料庫
npm run db:reset

# 修復權限問題
chmod 755 ./data
chmod 666 ./data/app.db

# 檢查磁碟空間
df -h
```

#### Hydration 錯誤
**解決方案**:
- 清除瀏覽器快取與 Local Storage
- 檢查 SSR 與客戶端渲染的差異
- 專案已包含相關修正，如持續發生請回報

#### 學號綁定問題
**測試用學號**:
- 學號: `123456`
- 姓名: `王小明`

**常見問題**:
- 學號格式錯誤 (必須為6位數字)
- 姓名不匹配 (必須完全一致)
- 學號已被其他帳號綁定

### 除錯工具

#### 系統診斷
```bash
# 完整系統檢查
npm run diagnose

# 檢查項目包括:
# - 環境變數配置
# - 檔案結構完整性
# - 資料庫連接狀態
# - Node.js 模組載入
# - 檔案權限檢查
```

#### 日誌分析
```bash
# 啟用詳細日誌
ENABLE_DATABASE_LOGGING=true npm run dev

# 關鍵日誌標記:
# 🔄 - 進行中的操作
# ✅ - 成功操作
# ❌ - 失敗操作
# ⚠️ - 警告訊息
# 📊 - 統計資訊
```

## 🔄 版本資訊與相容性

### 核心依賴版本
- **Remix**: `^2.12.0` - 現代化 React 框架
- **React**: `^18.2.0` - UI 框架
- **TypeScript**: `^5.1.6` - 類型安全語言
- **Vite**: `^5.1.0` - 快速建構工具
- **Tailwind CSS**: `^3.4.4` - CSS 框架

### 資料庫與認證
- **better-sqlite3**: `^9.2.2` - SQLite 驅動程式
- **google-auth-library**: `^9.14.1` - Google OAuth 客戶端

### 系統需求
- **Node.js**: `>=20.0.0`
- **npm**: `>=8.0.0`
- **磁碟空間**: 至少 500MB
- **記憶體**: 建議 4GB 以上

### 瀏覽器支援
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🤝 開發指南

### 專案貢獻
1. Fork 此專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 開發規範
- 使用 TypeScript 進行開發
- 遵循 ESLint 規則
- 撰寫單元測試
- 更新相關文件

### 測試指南
```bash
# 執行所有測試
npm test

# 特定測試
npm run test:db
npm run test:integration

# 測試覆蓋率
npm run test:coverage
```

## 📚 延伸學習資源

### 官方文件
- [Remix 官方文件](https://remix.run/docs)
- [Google OAuth 文件](https://developers.google.com/identity/protocols/oauth2)
- [SQLite 文件](https://www.sqlite.org/docs.html)
- [Tailwind CSS 文件](https://tailwindcss.com/docs)

### 相關教學
- [OAuth 2.0 完整指南](https://oauth.net/2/)
- [Remix 進階應用](https://remix.run/tutorials)
- [資料庫設計最佳實踐](https://www.sqlitetutorial.net/)

### 社群資源
- [Remix Discord](https://discord.gg/remix)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/remix)

## 📄 授權條款

本專案採用 MIT License 授權 - 詳見 [LICENSE](LICENSE) 檔案

## 🙏 致謝

感謝以下開源專案與社群的貢獻：
- [Remix](https://remix.run/) - 優秀的全端 React 框架
- [Google Identity](https://developers.google.com/identity) - 可靠的身份驗證服務
- [SQLite](https://www.sqlite.org/) - 輕量級資料庫引擎
- [Tailwind CSS](https://tailwindcss.com/) - 實用的 CSS 框架

---

## 📞 技術支援

如果您在使用過程中遇到問題，請：

1. **查看文件**: 首先檢查本 README 與相關文件
2. **系統診斷**: 執行 `npm run diagnose` 進行自動診斷
3. **查看日誌**: 啟用詳細日誌模式尋找錯誤訊息
4. **搜尋問題**: 在 GitHub Issues 中搜尋類似問題
5. **提交問題**: 如果問題仍未解決，請提交詳細的 issue

**Happy Coding! 🎉**