import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";
import { isUserBound, bindUserToStudent } from "../lib/simple-binding.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  
  // 檢查用戶是否已經綁定
  const alreadyBound = isUserBound(user.id);
  
  if (alreadyBound) {
    // 如果已綁定，重新導向到個人資料頁面
    throw redirect("/profile?error=already_bound");
  }
  
  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUserSession(request);
  const formData = await request.formData();
  
  const studentId = formData.get("studentId") as string;
  const confirmName = formData.get("confirmName") as string;
  const action = formData.get("_action") as string;
  
  // 雙重檢查：確保用戶未綁定
  const alreadyBound = isUserBound(user.id);
  if (alreadyBound) {
    throw redirect("/profile?error=already_bound");
  }
  
  if (action === "validate") {
    // 簡單驗證邏輯
    if (!studentId || studentId.length !== 6) {
      return json({ 
        step: "input",
        error: "學號必須是 6 位數字",
        validation: null
      });
    }
    
    if (!confirmName || confirmName.trim().length < 2) {
      return json({ 
        step: "input",
        error: "請輸入正確的姓名",
        validation: null
      });
    }
    
    // 模擬學號驗證（硬編碼測試）
    if (studentId === "123456" && confirmName.trim() === "王小明") {
      return json({ 
        step: "confirm",
        error: null,
        validation: {
          isValid: true,
          student: {
            studentId: "123456",
            name: "王小明",
            department: "資訊工程系",
            grade: 3,
            classCode: "A班"
          }
        }
      });
    } else {
      return json({ 
        step: "input",
        error: "學號與姓名不匹配",
        validation: null
      });
    }
  }
  
  if (action === "bind") {
    // 再次檢查是否已綁定
    const stillNotBound = !isUserBound(user.id);
    if (!stillNotBound) {
      throw redirect("/profile?error=already_bound");
    }
    
    // 執行真實的綁定操作
    const bindingResult = bindUserToStudent(user.id, studentId);
    
    if (bindingResult.success) {
      throw redirect('/profile?success=binding_complete');
    } else {
      return json({ 
        step: "input",
        error: bindingResult.message,
        validation: null
      });
    }
  }
  
  return json({ 
    step: "input", 
    error: null, 
    validation: null 
  });
}

export default function BindStudent() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  const [studentId, setStudentId] = useState("");
  const [confirmName, setConfirmName] = useState("");
  
  const isValidating = navigation.state === "submitting" && navigation.formData?.get("_action") === "validate";
  const isBinding = navigation.state === "submitting" && navigation.formData?.get("_action") === "bind";
  const isLoading = isValidating || isBinding;
  
  const step = actionData?.step || "input";
  const validation = actionData?.validation;
  const error = actionData?.error;
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            學號綁定
          </h1>
          <p className="text-gray-600">
            請輸入您的學號和姓名以完成帳號綁定
          </p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            {user.avatarUrl && (
              <img 
                src={user.avatarUrl} 
                alt={user.name} 
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-blue-900">{user.name}</p>
              <p className="text-sm text-blue-700">{user.email}</p>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {step === "input" && (
          <Form method="post" className="space-y-6">
            <input type="hidden" name="_action" value="validate" />
            
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                學號 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="請輸入 6 位數字學號"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg tracking-wider"
                maxLength={6}
                required
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-1">
                格式：6 位數字（例如：123456）
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmName" className="block text-sm font-medium text-gray-700 mb-2">
                姓名確認 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="confirmName"
                name="confirmName"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="請輸入您的真實姓名"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isLoading}
              />
              <p className="text-sm text-gray-500 mt-1">
                此姓名必須與學號記錄中的姓名完全一致
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !studentId || !confirmName || studentId.length !== 6}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isValidating ? '驗證中...' : '驗證學號'}
            </button>
          </Form>
        )}
        
        {step === "confirm" && validation?.student && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600">✅</span>
                <p className="text-green-800 font-medium">學號驗證成功！</p>
              </div>
              <p className="text-green-700 text-sm">
                找到您的學籍資料，請確認以下資訊是否正確
              </p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">學籍資訊</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">學號</p>
                  <p className="font-medium text-gray-900">{validation.student.studentId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">姓名</p>
                  <p className="font-medium text-gray-900">{validation.student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">系所</p>
                  <p className="font-medium text-gray-900">{validation.student.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">年級</p>
                  <p className="font-medium text-gray-900">{validation.student.grade} 年級</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 mt-0.5">⚠️</span>
                <div>
                  <p className="text-yellow-800 font-medium mb-1">請注意</p>
                  <p className="text-yellow-700 text-sm">
                    確認綁定後，此 Google 帳號將與學號 <strong>{validation.student.studentId}</strong> 永久關聯。
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Form method="post" className="flex-1">
                <input type="hidden" name="_action" value="bind" />
                <input type="hidden" name="studentId" value={validation.student.studentId} />
                <input type="hidden" name="confirmName" value={validation.student.name} />
                <button
                  type="submit"
                  disabled={isBinding}
                  className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isBinding ? '綁定中...' : '確認綁定'}
                </button>
              </Form>
              
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                disabled={isBinding}
              >
                重新輸入
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-3">綁定說明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 每個學號只能綁定一個 Google 帳號</li>
            <li>• 請確保輸入的姓名與學籍資料完全一致</li>
            <li>• 測試用學號：123456 (王小明)</li>
          </ul>
        </div>
        
        <div className="mt-6 text-center">
          <Link 
            to="/logout" 
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            使用其他帳號登入
          </Link>
        </div>
      </div>
    </div>
  );
}