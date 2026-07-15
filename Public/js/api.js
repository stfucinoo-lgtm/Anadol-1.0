/**
 * ANADOL League - API Fetch Wrapper
 * يوفر واجهة موحدة لجميع نداءات الـ API مع إرفاق التوكن تلقائياً والتعامل مع وضع الصيانة.
 */

const API_BASE_URL = '/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // تهيئة الرأسيات إن لم تكن موجودة
  options.headers = options.headers || {};

  // جلب التوكن من localStorage وإرفاقه برأس الطلب إذا كان متوفراً
  const token = localStorage.getItem('anadol_token');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  // تحديد نوع المحتوى تلقائياً كـ JSON إذا كان هناك جسم للطلب ولم يكن FormData
  if (options.body && !(options.body instanceof FormData) && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  try {
    const response = await fetch(url, options);

    // التحقق من حالة وضع الصيانة (الرد بـ 503 أو رسالة صيانة مخصصة)
    if (response.status === 503) {
      const maintenanceData = await response.json().catch(() => ({}));
      // إشعار المستخدم بوضع الصيانة
      alert(maintenanceData.message || 'الموقع قيد الصيانة حالياً. يرجى المحاولة لاحقاً.');
    }

    // قراءة البيانات بصيغة JSON بأمان
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data && data.message ? data.message : `طلب غير ناجح: ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}

// كائن الخدمات لتسهيل الاستدعاء في واجهات المشروع المختلفة
const api = {
  get: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' })
};

// إتاحة الكائن دولياً في المتصفح
window.api = api;