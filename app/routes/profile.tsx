// app/routes/profile.tsx
// 個人資料頁面

import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, Link, useSearchParams } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";
import { getUserBinding } from "../lib/simple-binding.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  
  // 從資料庫取得真實的綁定狀態
  const binding = getUserBinding(user.id);
  
  return json({ 
    user,
    binding
  });
}

export default function Profile() {
  const { user, binding } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");
  
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '從未';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 成功訊息 */}
      {success === "binding_complete" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-green-600">🎉</span>
            <p className="text-green-800 font-medium">學號綁定成功！</p>
          </div>
          <p className="text-green-700 text-sm mt-1">
            您的 Google 帳號已成功綁定到學籍資料
          </p>
        </div>
      )}
      
      {/* 錯誤訊息 */}
      {error === "already_bound" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <p className="text-yellow-800 font-medium">您已經完成學號綁定</p>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            您的帳號已綁定學號，無需重複綁定
          </p>
        </div>
      )}
      
      {/* 頁面標題 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">個人資料</h1>
          <Link
            to="/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← 返回儀表板
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {user.avatarUrl && (
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {binding?.isbound ? '已綁定學號' : '未綁定學號'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Google 帳號資訊 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Google 帳號資訊</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">電子郵件</p>
            <p className="font-medium text-gray-900">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">顯示名稱</p>
            <p className="font-medium text-gray-900">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">用戶角色</p>
            <p className="font-medium text-gray-900 capitalize">{user.role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">登入次數</p>
            <p className="font-medium text-gray-900">{user.loginCount || 1} 次</p>
          </div>
        </div>
      </div>
      
      {/* 學籍資訊 */}
      {binding?.isbound && binding.student && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">學籍資訊</h3>
            <span className="text-xs text-gray-500">已驗證</span>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">學號</p>
              <p className="font-medium text-gray-900">{binding.student.studentId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">姓名</p>
              <p className="font-medium text-gray-900">{binding.student.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">系所</p>
              <p className="font-medium text-gray-900">{binding.student.department}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">年級</p>
              <p className="font-medium text-gray-900">{binding.student.grade} 年級</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">班級</p>
              <p className="font-medium text-gray-900">{binding.student.classCode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">聯絡電話</p>
              <p className="font-medium text-gray-900">{binding.student.phone || '未提供'}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 緊急聯絡人資訊 */}
      {binding?.isbound && binding.student && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">緊急聯絡人</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">聯絡人姓名</p>
              <p className="font-medium text-gray-900">{binding.student.emergencyContact || '未提供'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">聯絡電話</p>
              <p className="font-medium text-gray-900">{binding.student.emergencyPhone || '未提供'}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 系統資訊 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">系統資訊</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">用戶 ID: {user.id}</p>
            <p className="text-gray-600">Google ID: {user.googleId}</p>
          </div>
          <div>
            <p className="text-gray-600">帳號狀態: 啟用</p>
            <p className="text-gray-600">綁定狀態: {binding?.isbound ? '已綁定' : '未綁定'}</p>
          </div>
        </div>
      </div>
      
      {/* 操作按鈕 */}
      <div className="mt-8 flex gap-4 justify-center">
        <Link
          to="/dashboard"
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          返回儀表板
        </Link>
        
        {!binding?.isbound && (
          <Link
            to="/bind-student"
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            綁定學號
          </Link>
        )}
        
        <Link
          to="/logout"
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          登出系統
        </Link>
      </div>
      
      {/* 功能提示 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">📋 個人資料功能</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 查看完整的學籍和個人資訊</li>
          <li>• 學號綁定狀態一目了然</li>
          <li>• 緊急聯絡人資訊管理</li>
          <li>• 系統使用記錄追蹤</li>
        </ul>
      </div>
    </div>
  );
}