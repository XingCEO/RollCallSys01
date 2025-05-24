import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";
import { getUserBinding } from "../lib/simple-binding.server";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface AttendanceRecord {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  status: string;
}

interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  record?: AttendanceRecord;
}

interface LoaderData {
  user: any;
  binding: any;
  hasAttended: boolean;
  todayRecord?: AttendanceRecord;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  
  const binding = getUserBinding(user.id);
  
  if (!binding?.isbound) {
    throw new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/bind-student?error=binding_required",
      },
    });
  }

  // 檢查今日點名狀態（這裡模擬，實際應該查資料庫）
  const today = new Date().toDateString();
  const hasAttended = false; // 實際應該從資料庫查詢
  
  // 如果已點名，返回今日記錄
  const todayRecord = hasAttended ? {
    id: "mock_id",
    timestamp: new Date().toISOString(),
    latitude: 25.0174,
    longitude: 121.5398,
    accuracy: 15,
    status: "present"
  } : undefined;

  return json<LoaderData>({ 
    user,
    binding,
    hasAttended,
    todayRecord
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUserSession(request);
  const formData = await request.formData();
  
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const accuracy = parseFloat(formData.get("accuracy") as string);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return json<ActionResponse>({ 
      success: false,
      error: "無效的地理位置資料"
    });
  }

  const binding = getUserBinding(user.id);
  if (!binding?.isbound || !binding.student) {
    return json<ActionResponse>({ 
      success: false,
      error: "請先綁定學號才能點名"
    });
  }
  
  // 模擬點名記錄保存
  const record: AttendanceRecord = {
    id: `record_${Date.now()}`,
    timestamp: new Date().toISOString(),
    latitude,
    longitude,
    accuracy,
    status: "present"
  };
  
  console.log('點名記錄已保存:', {
    userId: user.id,
    studentId: binding.student.studentId,
    ...record
  });
  
  return json<ActionResponse>({ 
    success: true,
    message: "點名成功！",
    record
  });
}

export default function Attendance() {
  const { user, binding, hasAttended, todayRecord } = useLoaderData<LoaderData>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
  // 狀態管理
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [attendanceStep, setAttendanceStep] = useState<"initial" | "locating" | "ready" | "completed">("initial");
  
  const isSubmitting = navigation.state === "submitting";
  
  // 判斷實際的點名狀態
  const actuallyAttended = hasAttended || actionData?.success;
  const actualRecord = actionData?.record || todayRecord;

  // 重置狀態
  useEffect(() => {
    if (actuallyAttended) {
      setAttendanceStep("completed");
    } else {
      setAttendanceStep("initial");
    }
  }, [actuallyAttended]);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError("");
    setAttendanceStep("locating");
    
    if (!navigator.geolocation) {
      setLocationError("您的瀏覽器不支援地理位置服務");
      setIsGettingLocation(false);
      setAttendanceStep("initial");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        
        setLocation(locationData);
        setIsGettingLocation(false);
        setAttendanceStep("ready");
        console.log('定位成功:', locationData);
      },
      (error) => {
        let errorMessage = "無法獲取位置資訊";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "位置存取被拒絕，請允許位置權限並重試";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "位置資訊不可用，請確認GPS已開啟";
            break;
          case error.TIMEOUT:
            errorMessage = "定位超時，請重試";
            break;
        }
        
        setLocationError(errorMessage);
        setIsGettingLocation(false);
        setAttendanceStep("initial");
        console.error('定位失敗:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleSubmitAttendance = () => {
    if (location) {
      const form = document.querySelector('form[method="post"]') as HTMLFormElement;
      if (form) {
        form.submit();
      }
    }
  };

  const resetLocationOnly = () => {
    setLocation(null);
    setLocationError("");
    setAttendanceStep("locating");
    // 立即開始重新定位，不回到初始狀態
    getCurrentLocation();
  };
  
  const formatCoordinate = (coord: number) => {
    return coord.toFixed(6);
  };
  
  const formatAccuracy = (accuracy: number) => {
    if (accuracy < 1000) {
      return `${Math.round(accuracy)} 公尺`;
    } else {
      return `${(accuracy / 1000).toFixed(1)} 公里`;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-8">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📍 課程點名系統
          </h1>
          <p className="text-gray-600">
            GPS定位點名 - 確保您在指定地點完成簽到
          </p>
        </div>

        {/* 用戶資訊 */}
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
              {binding?.student && (
                <p className="text-sm text-blue-600">
                  學號：{binding.student.studentId} | {binding.student.department || '資訊工程系'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 點名狀態顯示 */}
        <div className="mb-8">
          {attendanceStep === "completed" || actuallyAttended ? (
            /* 已完成點名 - 簡化顯示 */
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <div className="text-center">
                <div className="text-6xl mb-6">✅</div>
                <h2 className="text-3xl font-bold text-green-800 mb-4">點名完成</h2>
                
                {actualRecord && (
                  <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
                    <div className="space-y-4">
                      {/* 點名時間 */}
                      <div className="text-center">
                        <div className="text-2xl mb-2">🕐</div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">點名時間</h3>
                        <p className="text-xl font-mono text-gray-900">
                          {formatDateTime(actualRecord.timestamp)}
                        </p>
                      </div>
                      
                      <div className="border-t border-gray-200 pt-4">
                        <div className="text-center">
                          <div className="text-2xl mb-2">📍</div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">目前位置</h3>
                          <div className="space-y-2 text-sm text-gray-700">
                            <p><span className="font-medium">緯度：</span>{formatCoordinate(actualRecord.latitude)}</p>
                            <p><span className="font-medium">經度：</span>{formatCoordinate(actualRecord.longitude)}</p>
                            <p><span className="font-medium">定位精度：</span>{formatAccuracy(actualRecord.accuracy)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 尚未點名 */
            <div className="space-y-6">
              {/* 點名進度指示器 */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className={`flex items-center space-x-2 ${attendanceStep === "initial" ? "text-blue-600" : "text-gray-400"}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    attendanceStep === "initial" ? "border-blue-600 bg-blue-50" : 
                    ["locating", "ready"].includes(attendanceStep) ? "border-green-600 bg-green-50" : "border-gray-300"
                  }`}>
                    {["locating", "ready"].includes(attendanceStep) ? "✓" : "1"}
                  </div>
                  <span className="text-sm font-medium">準備點名</span>
                </div>
                
                <div className={`w-8 h-0.5 ${["locating", "ready"].includes(attendanceStep) ? "bg-green-600" : "bg-gray-300"}`}></div>
                
                <div className={`flex items-center space-x-2 ${attendanceStep === "locating" ? "text-blue-600" : attendanceStep === "ready" ? "text-green-600" : "text-gray-400"}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    attendanceStep === "locating" ? "border-blue-600 bg-blue-50" : 
                    attendanceStep === "ready" ? "border-green-600 bg-green-50" : "border-gray-300"
                  }`}>
                    {attendanceStep === "ready" ? "✓" : "2"}
                  </div>
                  <span className="text-sm font-medium">位置定位</span>
                </div>
                
                <div className={`w-8 h-0.5 ${attendanceStep === "ready" ? "bg-green-600" : "bg-gray-300"}`}></div>
                
                <div className={`flex items-center space-x-2 ${attendanceStep === "ready" ? "text-blue-600" : "text-gray-400"}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    attendanceStep === "ready" ? "border-blue-600 bg-blue-50" : "border-gray-300"
                  }`}>
                    3
                  </div>
                  <span className="text-sm font-medium">確認點名</span>
                </div>
              </div>

              {/* 步驟1: 初始狀態 */}
              {attendanceStep === "initial" && (
                <div className="text-center">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                    <div className="text-4xl mb-4">📍</div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">準備開始點名</h3>
                    <p className="text-yellow-700 text-sm mb-4">
                      系統將使用GPS定位確認您的位置，請確保：
                    </p>
                    <ul className="text-yellow-700 text-sm text-left max-w-md mx-auto space-y-1">
                      <li>• 已開啟手機/電腦的位置服務</li>
                      <li>• 在空曠地區以獲得更好的GPS信號</li>
                      <li>• 允許瀏覽器存取位置權限</li>
                    </ul>
                  </div>
                  
                  <button
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="w-full bg-blue-500 text-white py-4 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-lg transition-colors shadow-lg"
                  >
                    開始定位點名
                  </button>
                </div>
              )}

              {/* 步驟2: 定位中 */}
              {attendanceStep === "locating" && (
                <div className="text-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="text-4xl mb-4 animate-pulse">📡</div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">正在定位中...</h3>
                    <p className="text-blue-700 text-sm">
                      請稍候，正在獲取您的GPS位置
                    </p>
                    <div className="mt-4">
                      <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* 步驟3: 定位完成，準備點名 */}
              {attendanceStep === "ready" && location && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">🎯</div>
                      <h3 className="text-lg font-semibold text-green-800">定位成功</h3>
                      <p className="text-green-700 text-sm">GPS位置已獲取，可以進行點名</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">📍 定位資訊</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">緯度</p>
                          <p className="font-mono text-gray-900">{formatCoordinate(location.latitude)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">經度</p>
                          <p className="font-mono text-gray-900">{formatCoordinate(location.longitude)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">定位精度</p>
                          <p className={`font-bold ${
                            location.accuracy <= 10 ? 'text-green-600' : 
                            location.accuracy <= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {formatAccuracy(location.accuracy)}
                            {location.accuracy <= 10 ? ' 🎯' : location.accuracy > 50 ? ' ⚠️' : ' ✅'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">定位時間</p>
                          <p className="text-gray-900">{new Date().toLocaleTimeString('zh-TW')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 點名按鈕區域 */}
                  <div className="flex gap-3">
                    <button
                      onClick={resetLocationOnly}
                      disabled={isSubmitting}
                      className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 disabled:bg-gray-400 transition-colors"
                    >
                      重新定位
                    </button>
                    
                    <button
                      onClick={handleSubmitAttendance}
                      disabled={isSubmitting}
                      className="flex-2 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors shadow-lg"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span>
                          點名中...
                        </span>
                      ) : (
                        "確認點名"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 錯誤訊息 - 僅在未完成點名時顯示 */}
        {!actuallyAttended && locationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <p className="text-red-800 font-medium">{locationError}</p>
            </div>
            <button
              onClick={resetLocationOnly}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              重試定位
            </button>
          </div>
        )}

        {/* 隱藏的表單 - 僅在未完成點名時存在 */}
        {!actuallyAttended && (
          <Form method="post" className="hidden">
            {location && (
              <>
                <input type="hidden" name="latitude" value={location.latitude} />
                <input type="hidden" name="longitude" value={location.longitude} />
                <input type="hidden" name="accuracy" value={location.accuracy} />
              </>
            )}
          </Form>
        )}

        {/* 導航按鈕 */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4 justify-center">
          <Link 
            to="/dashboard" 
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            返回儀表板
          </Link>
          
          <Link 
            to="/attendance-history" 
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            查看記錄
          </Link>
        </div>
        
        {/* 使用說明 - 僅在未完成點名時顯示 */}
        {!actuallyAttended && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-2">💡 使用提示</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 每日只能點名一次，請在指定時間內完成</li>
              <li>• 定位精度越高，點名越準確</li>
              <li>• 建議在戶外空曠處使用以獲得最佳GPS信號</li>
              <li>• 點名記錄將永久保存，不可修改</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}