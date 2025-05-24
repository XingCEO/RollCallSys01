// app/routes/auth.google.callback.tsx
// Google OAuth 回調處理 (除錯版本)

import { LoaderFunctionArgs } from "@remix-run/node";
import { verifyGoogleToken, type SessionUser } from "../lib/google-auth.server";
import { createUserSession } from "./services/session.server";

// 動態引入資料庫模組，避免初始化問題
async function importDatabaseModules() {
  try {
    const userModule = await import("../lib/user.server");
    console.log("✅ 成功載入 user.server 模組");
    return userModule;
  } catch (error) {
    console.error("❌ 載入資料庫模組失敗:", error);
    throw new Error("資料庫模組載入失敗");
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  
  console.log("🔄 開始處理 Google OAuth 回調");
  console.log("Code:", code ? "存在" : "不存在");
  console.log("Error:", error || "無");
  
  // 處理 OAuth 錯誤
  if (error) {
    console.error("❌ Google OAuth 錯誤:", error);
    return new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/login?error=oauth_error",
      },
    });
  }
  
  // 檢查授權碼
  if (!code) {
    console.error("❌ 授權碼遺失");
    return new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/login?error=missing_code",
      },
    });
  }
  
  try {
    // 1. 驗證 Google Token 並取得用戶資訊
    console.log("🔄 開始驗證 Google Token...");
    const googleUser = await verifyGoogleToken(code);
    console.log("✅ Google 用戶資訊取得成功:");
    console.log("  - Email:", googleUser.email);
    console.log("  - Name:", googleUser.name);
    console.log("  - Google ID:", googleUser.id);
    console.log("  - Avatar:", googleUser.avatarUrl ? "有" : "無");
    
    // 2. 載入資料庫模組
    console.log("🔄 載入資料庫模組...");
    const {
      findUserByGoogleId,
      createUser,
      updateUser,
      updateLastLogin,
      incrementLoginCount
    } = await importDatabaseModules();
    
    // 3. 查詢資料庫中是否已存在該用戶
    console.log("🔄 查詢資料庫中的用戶...");
    let dbUser;
    try {
      dbUser = findUserByGoogleId(googleUser.id);
      console.log("✅ 資料庫查詢完成:", dbUser ? "找到用戶" : "用戶不存在");
    } catch (dbError) {
      console.error("❌ 資料庫查詢失敗:", dbError);
      throw new Error(`資料庫查詢失敗: ${dbError instanceof Error ? dbError.message : '未知錯誤'}`);
    }
    
    let isNewUser = false;
    
    if (!dbUser) {
      // 4. 首次登入 - 建立新用戶記錄
      console.log("🔄 首次登入，準備建立新用戶...");
      
      try {
        const userData = {
          googleId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
          locale: googleUser.locale || 'zh-TW',
          verifiedEmail: googleUser.verifiedEmail ?? true,
          role: 'user'
        };
        
        console.log("🔄 建立用戶資料:", userData);
        
        dbUser = createUser(userData);
        isNewUser = true;
        
        console.log("✅ 新用戶建立成功:");
        console.log("  - 資料庫 ID:", dbUser.id);
        console.log("  - Email:", dbUser.email);
        console.log("  - Name:", dbUser.name);
        console.log("  - Role:", dbUser.role);
        
      } catch (createError) {
        console.error("❌ 建立新用戶失敗:", createError);
        throw new Error(`建立用戶失敗: ${createError instanceof Error ? createError.message : '未知錯誤'}`);
      }
      
    } else {
      // 5. 回訪用戶 - 更新用戶資訊
      console.log("🔄 回訪用戶，準備更新資訊...");
      console.log("  - 現有登入次數:", dbUser.loginCount);
      console.log("  - 最後登入:", dbUser.lastLogin || "從未");
      
      try {
        // 更新用戶資訊（可能 Google 資料有變更）
        dbUser = updateUser(googleUser.id, {
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
          email: googleUser.email,
          verifiedEmail: googleUser.verifiedEmail ?? true,
          locale: googleUser.locale,
        });
        
        // 更新登入記錄
        updateLastLogin(googleUser.id);
        incrementLoginCount(googleUser.id);
        
        // 重新查詢取得最新的 loginCount
        dbUser = findUserByGoogleId(googleUser.id)!;
        
        console.log("✅ 用戶資訊更新成功:");
        console.log("  - 新的登入次數:", dbUser.loginCount);
        console.log("  - 最後登入已更新");
        
      } catch (updateError) {
        console.error("❌ 更新用戶資訊失敗:", updateError);
        throw new Error(`更新用戶失敗: ${updateError instanceof Error ? updateError.message : '未知錯誤'}`);
      }
    }
    
    // 6. 準備 Session 用戶資料
    console.log("🔄 準備 Session 資料...");
    const sessionUser: SessionUser = {
      id: dbUser.id,
      googleId: dbUser.googleId,
      email: dbUser.email,
      name: dbUser.name,
      avatarUrl: dbUser.avatarUrl,
      role: dbUser.role,
      loginCount: dbUser.loginCount,
      isNewUser
    };
    
    console.log("✅ Session 用戶資料準備完成:");
    console.log("  - 資料庫 ID:", sessionUser.id);
    console.log("  - Google ID:", sessionUser.googleId);
    console.log("  - 是否新用戶:", sessionUser.isNewUser);
    console.log("  - 登入次數:", sessionUser.loginCount);
    
    // 7. 建立 Session 並重新導向
    const redirectTo = isNewUser ? "/welcome" : "/dashboard";
    console.log("🔄 準備重新導向到:", redirectTo);
    
    const response = await createUserSession(request, sessionUser, redirectTo);
    console.log("✅ Session 建立成功，重新導向執行");
    
    return response;
    
  } catch (error) {
    console.error("❌ 認證處理發生錯誤:", error);
    console.error("錯誤堆疊:", error instanceof Error ? error.stack : "無堆疊資訊");
    
    // 根據錯誤類型提供更具體的錯誤訊息
    let errorParam = "auth_failed";
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('google') && errorMessage.includes('認證')) {
        errorParam = "google_auth_failed";
      } else if (errorMessage.includes('已存在') || errorMessage.includes('constraint')) {
        errorParam = "account_exists";
      } else if (errorMessage.includes('建立') || errorMessage.includes('create')) {
        errorParam = "create_user_failed";
      } else if (errorMessage.includes('資料庫') || errorMessage.includes('database')) {
        errorParam = "database_error";
      } else if (errorMessage.includes('模組') || errorMessage.includes('載入')) {
        errorParam = "module_load_error";
      }
    }
    
    console.log("🔄 重新導向到登入頁面，錯誤參數:", errorParam);
    
    return new Response("Redirect", {
      status: 302,
      headers: {
        Location: `/login?error=${errorParam}`,
      },
    });
  }
}