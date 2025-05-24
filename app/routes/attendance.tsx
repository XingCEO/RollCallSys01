import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { require// app/routes/attendance.tsx
// 點名頁面 - 支援地理位置定位

import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";
import { getUserBinding } from "../lib/simple-binding.server";
import { 
  createAttendanceRecord, 
  hasTodayAttendance, 
  getTodayAttendance,
  getAttendanceStats 
} from "../lib/attendance.server";
import type { AttendanceRecord } from "../lib/attendance.server";
  
// 地理位置相關類型
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// 統一的 Action 回應類型
interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  record?: AttendanceRecord | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  
  // 檢查用戶是否已綁定學號
  const binding = getUserBinding(user.id);
  
  if (!binding?.isbound) {
    throw new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/bind-student?error=binding_required",
      },
    });
  }

  try {
    // 檢查今日是否已點名
    const hasAttended = hasTodayAttendance(user.id);
    
    // 取得今日點名記錄
    const todayRecords = getTodayAttendance(user.id);
    
    // 取得點名統計
    const stats = getAttendanceStats(user.id);
    
    return json({ 
      user,
      binding,
      hasAttended,
      todayRecords,
      stats
    });
  } catch (error) {
    console.error('載入點名資料失敗:', error);
    
    // 如果資料庫還沒有點名表，返回基本資訊
    return json({ 
      user,
      binding,
      hasAttended: false,
      todayRecords: [],
      stats: null,
      dbError: true
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUserSession(request);
  const formData = await request.formData();
  
  const action = formData.get("_action") as string;
  
  if (action === "checkin") {
    const latitude = parseFloat(formData.get("latitude") as string);
    const longitude = parseFloat(formData.get("longitude") as string);
    const accuracy = parseFloat(formData.get("accuracy") as string);
    const timestamp = formData.get("timestamp") as string;
    
    // 驗證地理位置資料
    if (isNaN(latitude) || isNaN(longitude)) {
      return json<ActionResponse>({ 
        success: false,
        error: "無效的地理位置資料",
        record: null
      });
    }

    // 取得用戶綁定資訊
    const binding = getUserBinding(user.id);
    if (!binding?.isbound || !binding.student) {
      return json<ActionResponse>({ 
        success: false,
        error: "請先綁定學號才能點名",
        record: null
      });
    }
    
    try {
      // 檢查今日是否已點名
      const hasAttended = hasTodayAttendance(user.id);
      if (hasAttended) {
        return json<ActionResponse>({ 
          success: false,
          error: "今日已完成點名，無法重複點名",
          record: null
        });
      }

      // 取得客戶端 IP (簡單實作)
      const ipAddress = request.headers.get("x-forwarded-for") || 
                       request.headers.get("x-real-ip") || 
                       "unknown";

      // 取得 User-Agent 作為設備資訊
      const deviceInfo = request.headers.get("user-agent") || "unknown";
      
      // 創建點名記錄
      const attendanceRecord = createAttendanceRecord({
        userId: user.id,
        studentId: binding.student.studentId,
        latitude,
        longitude,
        accuracy,
        deviceInfo,
        ipAddress,
        notes: `GPS點名 - 準確度: ${Math.round(accuracy)}公尺`
      });
      
      console.log('點名記錄創建成功:', attendanceRecord);
      
      return json<ActionResponse>({ 
        success: true,
        message: "點名成功！",
        record: attendanceRecord
      });
    } catch (error) {
      console.error('點名失敗:', error);
      return json<ActionResponse>({ 
        success: false,
        error: error instanceof Error ? error.message : "點名失敗，請重試",
        record: null
      });
    }
  }
  
  return json<ActionResponse>({ 
    success: false,
    error: "無效的操作",
    record: null
  });
}

export default function Attendance() {
  const { user, binding, hasAttended, todayRecords, stats, dbError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  
  const isSubmitting = navigation.state === "submitting";
  
  
  // 清理位置監聽
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError("");
    
    if (!navigator.geolocation) {
      setLocationError("您的瀏覽器不支援地理位置服務");
      setIsGettingLocation(false);
      return;
    }
    
    // 高精度定位設定
    const highAccuracyOptions = {
      enableHighAccuracy: true,        // 啟用高精度模式
      timeout: 30000,                  // 延長超時時間到30秒
      maximumAge: 0                    // 不使用快取，每次都重新定位
    };
    
    // 先嘗試高精度定位
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        console.log('第一次定位結果 - 準確度:', accuracy, '公尺');
        
        // 如果準確度不夠好(超過20公尺)，再嘗試一次
        if (accuracy > 20) {
          console.log('準確度不夠好，嘗試第二次定位...');
          
          // 第二次嘗試，更嚴格的設定
          const strictOptions = {
            enableHighAccuracy: true,
            timeout: 45000,              // 更長的超時時間
            maximumAge: 0                // 絕對不使用快取
          };
          
          navigator.geolocation.getCurrentPosition(
            (secondPosition) => {
              const secondAccuracy = secondPosition.coords.accuracy;
              console.log('第二次定位結果 - 準確度:', secondAccuracy, '公尺');
              
              // 選擇更準確的結果
              const finalPosition = secondAccuracy < accuracy ? secondPosition : position;
              
              const locationData: LocationData = {
                latitude: finalPosition.coords.latitude,
                longitude: finalPosition.coords.longitude,
                accuracy: finalPosition.coords.accuracy,
                timestamp: Date.now()
              };
              
              setLocation(locationData);
              setIsGettingLocation(false);
              console.log('最終位置 - 準確度:', finalPosition.coords.accuracy, '公尺');
            },
            (secondError) => {
              console.log('第二次定位失敗，使用第一次結果');
              // 第二次失敗就用第一次的結果
              const locationData: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now()
              };
              
              setLocation(locationData);
              setIsGettingLocation(false);
            },
            strictOptions
          );
        } else {
          // 準確度已經很好，直接使用
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          setLocation(locationData);
          setIsGettingLocation(false);
          console.log('定位成功 - 準確度:', position.coords.accuracy, '公尺');
        }
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
            errorMessage = "定位超時，請移動到空曠地區後重試";
            break;
        }
        
        setLocationError(errorMessage);
        setIsGettingLocation(false);
        console.error('定位失敗:', error);
      },
      highAccuracyOptions
    );
  };
  
  // 開始持續監聽位置 - 高精度版本
  const startLocationWatch = () => {
    if (!navigator.geolocation) {
      setLocationError("您的瀏覽器不支援地理位置服務");
      return;
    }
    
    const options = {
      enableHighAccuracy: true,        // 啟用高精度
      timeout: 15000,                  // 15秒超時
      maximumAge: 0                    // 不使用快取位置
    };
    
    let bestAccuracy = Infinity;
    let bestPosition: GeolocationPosition | null = null;
    
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const currentAccuracy = position.coords.accuracy;
        
        // 只保留最準確的位置
        if (currentAccuracy < bestAccuracy) {
          bestAccuracy = currentAccuracy;
          bestPosition = position;
          
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          setLocation(locationData);
          setLocationError("");
          
          console.log('位置更新 - 準確度提升至:', currentAccuracy, '公尺');
          
          // 如果達到很高的精度(5公尺以內)，可以停止監聽
          if (currentAccuracy <= 5) {
            navigator.geolocation.clearWatch(id);
            setWatchId(null);
            console.log('已達到最高精度，停止監聽');
          }
        }
      },
      (error) => {
        console.error('位置監聽錯誤:', error);
      },
      options
    );
    
    setWatchId(id);
  };
  
  // 停止位置監聽
  const stopLocationWatch = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };
  
  // 格式化座標顯示
  const formatCoordinate = (coord: number, digits: number = 6) => {
    return coord.toFixed(digits);
  };
  
  // 格式化準確度
  const formatAccuracy = (accuracy: number) => {
    if (accuracy < 1000) {
      return `${Math.round(accuracy)} 公尺`;
    } else {
      return `${(accuracy / 1000).toFixed(1)} 公里`;
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📍 課程點名
          </h1>
          <p className="text-gray-600">
            請允許位置權限並點擊點名按鈕完成簽到
          </p>
        </div>
        
        {/* 今日點名狀態 */}
        {!dbError && (
          <div className={`border rounded-lg p-4 mb-6 ${
            hasAttended 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={hasAttended ? 'text-green-600' : 'text-yellow-600'}>
                {hasAttended ? '✅' : '⏰'}
              </span>
              <div>
                <p className={`font-medium ${
                  hasAttended ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {hasAttended ? '今日已完成點名' : '今日尚未點名'}
                </p>
                {hasAttended && todayRecords.length > 0 && (
                  <p className="text-sm text-green-700">
                    點名時間：{new Date(todayRecords[0].timestamp).toLocaleString('zh-TW')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 資料庫錯誤提示 */}
        {dbError && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-orange-600">⚠️</span>
              <div>
                <p className="text-orange-800 font-medium">點名系統尚未初始化</p>
                <p className="text-orange-700 text-sm">
                  請聯繫系統管理員執行資料庫遷移：npm run db:migrate
                </p>
              </div>
            </div>
          </div>
        )}

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
                  學號：{binding.student.studentId} | {binding.student.department}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* 成功/錯誤訊息 */}
        {actionData?.success && actionData.message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <p className="text-green-800 font-medium">{actionData.message}</p>
            </div>
            {actionData.record && (
              <div className="mt-2 text-sm text-green-700">
                <p>點名時間：{new Date(actionData.record.timestamp).toLocaleString('zh-TW')}</p>
                <p>位置：{formatCoordinate(actionData.record.latitude)}, {formatCoordinate(actionData.record.longitude)}</p>
              </div>
            )}
          </div>
        )}
        
        {actionData && !actionData.success && actionData.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <p className="text-red-800 font-medium">{actionData.error}</p>
            </div>
          </div>
        )}
        
        {locationError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              <p className="text-yellow-800 font-medium">{locationError}</p>
            </div>
          </div>
        )}
        
        {/* 位置資訊 */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
            >
              {isGettingLocation ? '📍 定位中...' : '📍 獲取位置'}
            </button>
            
            <button
              type="button"
              onClick={watchId ? stopLocationWatch : startLocationWatch}
              className={`px-4 py-2 text-white rounded-lg text-sm ${
                watchId 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {watchId ? '⏹️ 停止監聽' : '🎯 持續定位'}
            </button>
          </div>
          
          {location && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📍 當前位置</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">緯度 (Latitude)</p>
                  <p className="font-mono text-gray-900">{formatCoordinate(location.latitude, 8)}</p>
                </div>
                <div>
                  <p className="text-gray-600">經度 (Longitude)</p>
                  <p className="font-mono text-gray-900">{formatCoordinate(location.longitude, 8)}</p>
                </div>
                <div>
                  <p className="text-gray-600">準確度</p>
                  <p className={`font-bold ${
                    location.accuracy <= 5 ? 'text-green-600' : 
                    location.accuracy <= 10 ? 'text-yellow-600' : 
                    location.accuracy <= 20 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {formatAccuracy(location.accuracy)}
                    {location.accuracy <= 5 && ' 🎯'}
                    {location.accuracy <= 10 && location.accuracy > 5 && ' ✅'}
                    {location.accuracy > 20 && ' ⚠️'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">精度等級</p>
                  <p className={`font-medium ${
                    location.accuracy <= 5 ? 'text-green-600' : 
                    location.accuracy <= 10 ? 'text-yellow-600' : 
                    location.accuracy <= 20 ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {location.accuracy <= 5 ? '極高精度' : 
                     location.accuracy <= 10 ? '高精度' : 
                     location.accuracy <= 20 ? '中精度' : '低精度'}
                  </p>
                </div>
              </div>
              
              {/* 精度建議 */}
              {location.accuracy > 10 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-orange-600 mb-2">💡 提升定位精度建議：</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• 移動到室外空曠地區</li>
                    <li>• 確保手機GPS已開啟</li>
                    <li>• 等待更長時間讓GPS收訊穩定</li>
                    <li>• 點擊「🎯 持續定位」獲得更精確位置</li>
                  </ul>
                </div>
              )}
              
              {/* Google Maps 連結 */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}&z=18`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  🗺️ 在 Google Maps 中查看 (高精度)
                </a>
              </div>
            </div>
          )}
        </div>
        
        {/* 點名表單 */}
        <Form method="post" className="space-y-6">
          <input type="hidden" name="_action" value="checkin" />
          {location && (
            <>
              <input type="hidden" name="latitude" value={location.latitude} />
              <input type="hidden" name="longitude" value={location.longitude} />
              <input type="hidden" name="accuracy" value={location.accuracy} />
              <input type="hidden" name="timestamp" value={new Date().toISOString()} />
            </>
          )}
          
          {/* 一鍵點名按鈕 */}
          <button
            type="button"
            onClick={() => {
              if (!location && !isGettingLocation) {
                getCurrentLocation();
              } else if (location && !hasAttended && !dbError) {
                // 如果已有位置，直接提交表單
                const form = document.querySelector('form[method="post"]') as HTMLFormElement;
                if (form) {
                  form.submit();
                }
              }
            }}
            disabled={isSubmitting || isGettingLocation || hasAttended || dbError}
            className="w-full bg-green-500 text-white py-6 px-6 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-xl transition-colors shadow-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                點名中...
              </span>
            ) : isGettingLocation ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">📍</span>
                正在獲取位置...
              </span>
            ) : hasAttended ? (
              <span className="flex items-center justify-center gap-2">
                ✅ 今日已點名
              </span>
            ) : dbError ? (
              <span className="flex items-center justify-center gap-2">
                ⚠️ 系統未就緒
              </span>
            ) : location ? (
              <span className="flex items-center justify-center gap-2">
                ✋ 立即點名
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                📍 立即點名
              </span>
            )}
          </button>
          
          {!location && !isGettingLocation && !hasAttended && !dbError && (
            <p className="text-sm text-gray-500 text-center">
              點擊按鈕將自動獲取GPS位置並完成點名
            </p>
          )}
        </Form>
        
        {/* 點名統計 */}
        {!dbError && stats && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 我的點名統計</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-600">總點名次數</p>
                <p className="text-xl font-bold text-blue-800">{stats.totalRecords}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">出席次數</p>
                <p className="text-xl font-bold text-green-800">{stats.presentCount}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-600">遲到次數</p>
                <p className="text-xl font-bold text-yellow-800">{stats.lateCount}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-600">本週點名</p>
                <p className="text-xl font-bold text-purple-800">{stats.thisWeekRecords}</p>
              </div>
            </div>
            {stats.averageAccuracy > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                <p>平均GPS準確度：{Math.round(stats.averageAccuracy)} 公尺</p>
              </div>
            )}
          </div>
        )}

        {/* 說明資訊 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-3">📋 點名說明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 點名前請確保已獲取準確的位置資訊</li>
            <li>• 建議在室外或窗邊進行定位以獲得更高準確度</li>
            <li>• 位置資訊將用於驗證出席狀況</li>
            <li>• 每次點名都會記錄時間戳記和地理位置</li>
          </ul>
        </div>
        
        {/* 導航按鈕 */}
        <div className="mt-6 flex gap-4 justify-center">
          <Link 
            to="/dashboard" 
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            返回儀表板
          </Link>
          
          <Link 
            to="/profile" 
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            個人資料
          </Link>
        </div>
      </div>
    </div>
  );
}