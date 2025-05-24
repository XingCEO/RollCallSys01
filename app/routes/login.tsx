// app/routes/login.tsx
// 登入頁面 (更新版本，包含更多錯誤處理)

import * as React from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  
  return json({ error });
}

export default function Login() {
  const { error } = useLoaderData<typeof loader>();
  
  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "oauth_error":
        return "Google 認證過程中發生錯誤，請重試";
      case "missing_code":
        return "認證碼遺失，請重新登入";
      case "auth_failed":
        return "認證失敗，請重試";
      case "google_auth_failed":
        return "Google 認證失敗，請檢查網路連線後重試";
      case "account_exists":
        return "此 Google 帳號或電子郵件已存在";
      case "create_user_failed":
        return "建立帳號失敗，請重試";
      case "database_error":
        return "系統暫時無法使用，請稍後再試";
      case "insufficient_permissions":
        return "權限不足，無法存取該頁面";
      case "admin_required":
        return "需要管理員權限才能存取";
      default:
        return null;
    }
  };
  
  const errorMessage = getErrorMessage(error);
  const isSystemError = ['database_error', 'create_user_failed'].includes(error || '');
  
  return (
    <main className="relative w-full min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="font-bold text-3xl text-center mb-6 text-gray-800">
          登入系統
        </h1>
        
        {errorMessage && (
          <div className={`mb-4 p-3 border rounded ${
            isSystemError 
              ? 'bg-orange-100 border-orange-400 text-orange-700' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {errorMessage}
          </div>
        )}
        
        <p className="text-center text-gray-600 mb-6">
          使用您的 Google 帳號登入
        </p>
        
        <Link
          to="/auth/google"
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          使用 Google 登入
        </Link>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>首次登入將自動建立帳號</p>
        </div>
      </div>
      
      {/* 開發環境顯示系統狀態 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 text-center">
          <p>開發模式 - 資料庫: SQLite</p>
        </div>
      )}
    </main>
  );
}