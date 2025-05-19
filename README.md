# 歡迎使用 Remix！

- 📖 [Remix 官方文件](https://remix.run/docs)

## 開發環境

啟動開發伺服器：

```shellscript
npm run dev
```

## 部署

首先，為生產環境建置您的應用程式：

```sh
npm run build
```

然後以生產模式運行應用程式：

```sh
npm start
```

現在您需要選擇一個主機來部署應用程式。

### DIY 部署

如果您熟悉部署 Node 應用程式，內建的 Remix 應用程式伺服器已為生產環境做好準備。

請確保部署 `npm run build` 的輸出結果：

- `build/server`
- `build/client`

## 樣式設計

此模板已預先配置 [Tailwind CSS](https://tailwindcss.com/)，提供簡單的預設起始體驗。您可以使用任何您喜歡的 CSS 框架。更多資訊請參閱 [Vite CSS 文件](https://vitejs.dev/guide/features.html#css)。

## 程式架構

此 Remix 應用程式結構旨在實現 Google OAuth2 認證。關鍵組件包括：

- **路由**：
  - `auth.google.tsx`：處理 Google 認證的啟動。
  - `auth.google.callback.tsx`：管理 Google 認證後的回調。
  - `dashboard.tsx`：僅在成功認證後可訪問的受保護路由。
  - `login.tsx`：提供用戶登入介面。
  - `logout.tsx`：處理用戶登出。

- **服務**：
  - `auth.server.ts`：使用 Google 策略配置認證器以進行 OAuth2 認證。
  - `session.server.ts`：管理會話存儲和 cookie 設定。

## 功能

此應用程式支援透過 Google OAuth2 進行用戶認證。用戶可以透過 Google 帳戶登入，成功認證後將被導向至儀表板頁面。如果認證失敗，則會被導向回登入頁面。應用程式還提供登出功能，清除用戶會話。

## 相容版本

此專案使用的 `remix-auth-google` 版本為 `^2.0.0`，確保與 Remix 框架和相關套件的相容性。

您可以使用以下命令安裝特定版本的套件：

```shellscript
npm install remix-auth@3.4.0 remix-auth-google@2.0.0
```
