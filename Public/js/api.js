/**
 * ANADOL League - API Fetch Wrapper
 * يوفر واجهة موحدة لجميع نداءات الـ API مع إرفاق التوكن تلقائياً والتعامل مع وضع الصيانة.
 */

const API_BASE_URL = '/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  options.headers = options.headers || {};

  const token = localStorage.getItem('anadol_token');
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  try {
    const response = await fetch(url, options);

    if (response.status === 503) {
      const maintenanceData = await response.json().catch(() => ({}));
      alert(maintenanceData.message || 'الموقع قيد الصيانة حالياً. يرجى المحاولة لاحقاً.');
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // التعامل الذكي عند انتهاء صلاحية الجلسة (401 / 403)
      if (response.status === 401 || response.status === 403) {
        const msg = data && (data.message || data.error) ? (data.message || data.error) : '';
        if (msg.includes('رمز الدخول') || msg.includes('تسجيل الدخول') || msg.includes('انتهت صلاحيته')) {
          localStorage.removeItem('anadol_token');
          localStorage.removeItem('anadol_user');
          
          if (window.location.pathname.includes('/admin/') && !window.location.pathname.includes('/login.html')) {
            alert('انتهت صلاحية جلسة الدخول الخاصة بك. يرجى إعادة تسجيل الدخول لمتابعة العمل.');
            window.location.href = '/admin/login.html';
            return;
          }
        }
      }

      const errorMsg = data && (data.message || data.error) ? (data.message || data.error) : `طلب غير ناجح: ${response.status}`;
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

const api = {
  get: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' })
};

async function fetchAPI(endpoint, method = 'GET', body = null) {
  let targetEndpoint = endpoint;
  if (targetEndpoint.startsWith('/api')) {
    targetEndpoint = targetEndpoint.substring(4);
  }

  const options = {
    method: method.toUpperCase()
  };

  if (body) {
    options.body = body;
  }

  return apiFetch(targetEndpoint, options);
}

window.api = api;
window.fetchAPI = fetchAPI;
