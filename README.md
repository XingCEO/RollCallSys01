# Remix Google OAuth 認證系統

基於 Remix 框架建構的 Google OAuth 認證系統，使用 Google Auth Library 實作安全的使用者登入功能。

## 🚀 功能特色

- ✅ Google OAuth 2.0 認證
- ✅ Session 管理
- ✅ 路由保護
- ✅ 現代化 UI (Tailwind CSS)
- ✅ TypeScript 支援
- ✅ 完整的錯誤處理

## 📂 專案結構

```
remix-google-oauth2-tutorial/
├── app/
│   ├── lib/
│   │   └── google-auth.server.ts     # Google OAuth 認證邏輯
│   ├── routes/
│   │   ├── services/
│   │   │   └── session.server.ts     # Session 管理
│   │   ├── _index.tsx                # 首頁 (需登入)
│   │   ├── auth.google.tsx           # Google 認證入口
│   │   ├── auth.google.callback.tsx  # OAuth 回調處理
│   │   ├── dashboard.tsx             # 使用者儀表板
│   │   ├── login.tsx                 # 登入頁面
│   │   ├── logout.tsx                # 登出處理
│   │   ├── profile.tsx               # 個人資料頁面
│   │   └── $.tsx                     # Catch-all 路由
│   ├── root.tsx                      # 應用程式根組件
│   └── tailwind.css                  # 樣式檔案
├── .env                              # 環境變數
├── package.json                      # 依賴管理
├── tsconfig.json                     # TypeScript 配置
├── vite.config.ts                    # Vite 配置
├── tailwind.config.ts                # Tailwind 配置
├── global.d.ts                       # 全域類型定義
└── remix.env.d.ts                    # Remix 類型定義
```

## 🔧 核心組件說明

### 🔐 認證系統

#### `app/lib/google-auth.server.ts`
Google OAuth 認證的核心邏輯：
- **`generateAuthUrl()`**: 生成 Google 認證 URL
- **`verifyGoogleToken()`**: 驗證 Google 回傳的認證碼
- **環境變數檢查**: 確保必要的 OAuth 配置存在

#### `app/routes/services/session.server.ts`
Session 管理系統：
- **`sessionStorage`**: Cookie-based session 儲存
- **`getUserFromSession()`**: 從 session 中取得使用者資料
- **`requireUserSession()`**: 路由保護中間件

### 🛡️ 路由保護

#### `app/root.tsx`
應用程式根組件，實作全域路由保護：
- 檢查公開路由（登入、認證相關）
- 驗證使用者 session
- 未登入使用者自動重新導向到登入頁面

### 📄 頁面組件

#### `app/routes/login.tsx`
登入頁面：
- Google OAuth 登入按鈕
- 錯誤訊息顯示
- 響應式設計

#### `app/routes/auth.google.tsx`
Google 認證入口：
- 產生 Google OAuth URL
- 重新導向到 Google 登入頁面

#### `app/routes/auth.google.callback.tsx`
OAuth 回調處理：
- 處理 Google 回傳的認證碼
- 驗證使用者身份
- 建立 session
- 錯誤處理

#### `app/routes/dashboard.tsx`
使用者儀表板：
- 顯示使用者資訊
- 頭像、姓名、Email
- 導航選項

#### `app/routes/logout.tsx`
登出處理：
- 清除 session
- 重新導向到登入頁面

## ⚙️ 環境設定

### 1. 環境變數配置

建立 `.env` 檔案：

```env
# Google OAuth 設定
GOOGLE_CLIENT_ID=你的Google客戶端ID
GOOGLE_CLIENT_SECRET=你的Google客戶端密鑰
GOOGLE_CALLBACK_URL=http://localhost:5173/auth/google/callback

# Session 密鑰 (至少 32 個字符)
AUTH_SECRET=你的超級機密Session密鑰至少32個字符長
```

### 2. Google Cloud Console 設定

1. **前往 [Google Cloud Console](https://console.cloud.google.com/)**
2. **建立新專案或選擇現有專案**
3. **啟用 Google+ API 或 People API**
4. **建立 OAuth 2.0 憑證：**
   - 應用程式類型：網路應用程式
   - 已授權的 JavaScript 來源：`http://localhost:5173`
   - 已授權的重新導向 URI：`http://localhost:5173/auth/google/callback`
5. **複製 Client ID 和 Client Secret 到 .env 檔案**

## 🚀 安裝與執行

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

建立並配置 `.env` 檔案（參考上方說明）

### 3. 啟動開發伺服器

```bash
npm run dev
```

### 4. 開啟瀏覽器

前往 `http://localhost:5173`

## 📝 可用腳本

```bash
# 開發模式
npm run dev

# 建構生產版本
npm run build

# 啟動生產伺服器
npm start

# 類型檢查
npm run typecheck

# 代碼檢查
npm run lint
```

## 🔒 安全特性

- **HttpOnly Cookies**: 防止 XSS 攻擊
- **SameSite Cookie**: 防止 CSRF 攻擊
- **HTTPS in Production**: 生產環境強制使用安全連接
- **Session 驗證**: 每個請求都驗證 session 有效性
- **環境變數隔離**: 敏感資訊不暴露給客戶端

## 🛣️ 認證流程

1. **使用者點擊「使用 Google 登入」**
2. **重新導向到 `/auth/google`**
3. **生成 Google OAuth URL 並重新導向**
4. **使用者在 Google 頁面登入**
5. **Google 重新導向到 `/auth/google/callback`**
6. **驗證認證碼並建立 session**
7. **重新導向到儀表板**

## 🎨 UI/UX 特色

- **響應式設計**: 支援桌面和行動裝置
- **Tailwind CSS**: 現代化樣式框架
- **載入狀態**: 優雅的載入提示
- **錯誤處理**: 友善的錯誤訊息
- **無障礙設計**: 支援鍵盤導航和螢幕閱讀器

## 🐛 常見問題

### CJS 警告
```
The CJS build of Vite's Node API is deprecated
```
這是 Remix 框架的已知問題，不影響功能，可以安全忽略。

### 認證錯誤
- 檢查 Google Cloud Console 的重新導向 URI 設定
- 確認環境變數正確設定
- 檢查 Client ID 和 Secret 是否正確

### Hydration 錯誤
專案已包含 hydration 錯誤的修正，如遇到問題請清除瀏覽器快取。

## 🔄 版本資訊

- **Remix**: 2.12.0
- **React**: 18.2.0
- **TypeScript**: 5.1.6
- **Tailwind CSS**: 3.4.4
- **Google Auth Library**: 9.14.1

## 📄 授權

MIT License
