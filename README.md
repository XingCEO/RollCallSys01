# Remix 應用程式實現 Google OAuth2 認證

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
## 建立.env檔案
跟package.json同一層

GOOGLE_CLIENT_ID=......
GOOGLE_CLIENT_SECRET=.....
GOOGLE_CALLBACK_URL=http://localhost:5173/auth/google/callback
# 將您的秘密放在這裡，可以是任何您想要的內容，但隨機字元更好
AUTH_SECRET=亂數產生

## 建立.env檔案
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { authenticator } from "./services/auth.server";

## 受保護的個人資料頁面,增加程式碼
```ts
// app/routes/profile.tsx
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { authenticator } from "./services/auth.server";
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  return json({ user });
}
```