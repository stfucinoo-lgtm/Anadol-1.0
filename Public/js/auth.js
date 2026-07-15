/**
 * ANADOL League - Frontend Authentication & Session Manager
 * إدارة الجلسات، التوكنات، وحماية مسارات الواجهة الأمامية والربط البرمجي مع نموذج تسجيل الدخول.
 */

const AnadolAuth = {
  /**
   * التحقق من تسجيل المستخدم للدخول من عدمه
   * @returns {boolean} - تذكرة دخول صالحة أم لا
   */
  isLoggedIn() {
    return !!localStorage.getItem('anadol_token');
  },

  /**
   * جلب بيانات المستخدم النشط من ذاكرة المتصفح
   * @returns {object|null} - بيانات المستخدم أو null
   */
  getUser() {
    try {
      const userStr = localStorage.getItem('anadol_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('Error parsing stored user:', e);
      return null;
    }
  },

  /**
   * تسجيل الخروج وتطهير الجلسة من الذاكرة والعودة للموقع الرئيسي أو بوابة الدخول
   */
  logout() {
    localStorage.removeItem('anadol_token');
    localStorage.removeItem('anadol_user');
    
    // توجيه تلقائي ذكي حسب المسار الحالي
    if (window.location.pathname.includes('/admin/')) {
      window.location.href = 'login.html';
    } else {
      window.location.href = 'index.html';
    }
  },

  /**
   * دالة حماية إدارية للتحقق من امتلاك المستخدم للدور المطلوب وتوجيهه إذا لم يكن مصرحاً له
   * @param {Array<string>} allowedRoles - الأدوار المسموح لها بالوصول
   * @param {string} redirectUrl - رابط التوجيه البديل في حال الرفض
   */
  protectPage(allowedRoles, redirectUrl = 'login.html') {
    const user = this.getUser();
    if (!user || !this.isLoggedIn()) {
      window.location.href = redirectUrl;
      return false;
    }
    
    if (!allowedRoles.includes(user.role)) {
      alert('غير مصرح لك بالوصول إلى هذه الصفحة الإدارية.');
      window.location.href = redirectUrl;
      return false;
    }
    
    return true;
  }
};

// جعل محرك التوثيق متاحاً لجميع الواجهات والملفات البرمجية الأخرى
window.AnadolAuth = AnadolAuth;

// تفعيل نداء الاستماع والربط الفوري بمجرد اكتمال تحميل الواجهة
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const emailEl = document.getElementById('email');
      const passwordEl = document.getElementById('password');
      const errorContainer = document.getElementById('error-container');
      const submitBtn = document.getElementById('login-submit-btn');

      const email = emailEl ? emailEl.value.trim() : '';
      const password = passwordEl ? passwordEl.value : '';

      // إخفاء التنبيهات السابقة وتأمين الزر لمنع تكرار النقرات الإرسالية
      if (errorContainer) {
        errorContainer.classList.add('hidden');
        errorContainer.textContent = '';
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري التحقق من الهوية الفنية...';
      }

      try {
        // إرسال الطلب عبر مغلّف الـ API الموحد
        const response = await api.post('/auth/login', { email, password });

        // تخزين البيانات والتوكن وفقاً للتسميات المتفق عليها بالعقد (القسم 8)
        localStorage.setItem('anadol_token', response.token);
        localStorage.setItem('anadol_user', JSON.stringify(response.user));

        // التوجيه الذكي حسب مصفوفة الصلاحيات
        if (response.user.role === 'admin' || response.user.role === 'editor') {
          // توجيه لـ لوحة التحكم الإدارية
          window.location.href = 'dashboard.html';
        } else {
          // توجيه زائر عادي للصفحة الرئيسية
          window.location.href = '../index.html';
        }

      } catch (error) {
        console.error('Login action failed:', error);
        
        // إظهار رسالة الخطأ للمستخدم بشكل مهيأ
        if (errorContainer) {
          errorContainer.textContent = error.message || 'فشل الاتصال بالخادم، يرجى المحاولة لاحقاً.';
          errorContainer.classList.remove('hidden');
        }

        // إعادة تشغيل زر الإرسال لتجربة دخول أخرى
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'دخول لوحة التحكم';
        }
      }
    });
  }
});