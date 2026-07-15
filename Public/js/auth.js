/**
 * ANADOL League - Frontend Authentication & Session Manager
 * إدارة الجلسات، التوكنات، وحماية مسارات الواجهة الأمامية والربط البرمجي مع نموذج تسجيل الدخول والتسجيل.
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
  const registerForm = document.getElementById('admin-register-form');
  const errorContainer = document.getElementById('error-container');

  // عناصر التبديل بين النموذجين
  const toggleToRegister = document.getElementById('toggle-to-register');
  const toggleToLogin = document.getElementById('toggle-to-login');
  const portalTitle = document.getElementById('portal-title');
  const portalDesc = document.getElementById('portal-desc');

  // وظيفة إخفاء الخطأ وتجهيز الشاشة للتبديل
  const resetError = () => {
    if (errorContainer) {
      errorContainer.classList.add('hidden');
      errorContainer.textContent = '';
    }
  };

  // تبديل الواجهة لعرض نموذج التسجيل
  if (toggleToRegister && loginForm && registerForm) {
    toggleToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      resetError();
      loginForm.classList.add('hidden-form');
      registerForm.classList.remove('hidden-form');
      if (portalTitle) portalTitle.textContent = 'إنشاء حساب جديد';
      if (portalDesc) portalDesc.textContent = 'انضم إلى مجتمع دوري الأناضول كزائر';
    });
  }

  // تبديل الواجهة لعرض نموذج تسجيل الدخول
  if (toggleToLogin && loginForm && registerForm) {
    toggleToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      resetError();
      registerForm.classList.add('hidden-form');
      loginForm.classList.remove('hidden-form');
      if (portalTitle) portalTitle.textContent = 'دوري الأناضول الرياضي';
      if (portalDesc) portalDesc.textContent = 'بوابة الإدارة والتنسيق الفني للمشروع';
    });
  }

  // أولاً: معالجة تسجيل الدخول
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const emailEl = document.getElementById('email');
      const passwordEl = document.getElementById('password');
      const submitBtn = document.getElementById('login-submit-btn');

      const email = emailEl ? emailEl.value.trim() : '';
      const password = passwordEl ? passwordEl.value : '';

      resetError();

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري التحقق من الهوية الفنية...';
      }

      try {
        const response = await api.post('/auth/login', { email, password });

        localStorage.setItem('anadol_token', response.token);
        localStorage.setItem('anadol_user', JSON.stringify(response.user));

        if (response.user.role === 'admin' || response.user.role === 'editor') {
          window.location.href = 'dashboard.html';
        } else {
          window.location.href = '../index.html';
        }

      } catch (error) {
        console.error('Login action failed:', error);
        
        if (errorContainer) {
          errorContainer.textContent = error.message || 'فشل الاتصال بالخادم، يرجى المحاولة لاحقاً.';
          errorContainer.classList.remove('hidden');
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'دخول لوحة التحكم';
        }
      }
    });
  }

  // ثانياً: معالجة تسجيل الحساب الجديد (Visitor)
  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const usernameEl = document.getElementById('reg-username');
      const emailEl = document.getElementById('reg-email');
      const passwordEl = document.getElementById('reg-password');
      const submitBtn = document.getElementById('register-submit-btn');

      const username = usernameEl ? usernameEl.value.trim() : '';
      const email = emailEl ? emailEl.value.trim() : '';
      const password = passwordEl ? passwordEl.value : '';

      resetError();

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'جاري معالجة طلب الانضمام...';
      }

      try {
        // إرسال البيانات للمسار الخلفي المخصص للإنشاء
        const response = await api.post('/auth/register', { username, email, password });

        // تخزين البيانات تلقائياً وتفعيل الجلسة فوراً
        localStorage.setItem('anadol_token', response.token);
        localStorage.setItem('anadol_user', JSON.stringify(response.user));

        alert('تم تسجيل حسابك بنجاح كزائر، جاري توجيهك للموقع الرئيسي.');
        window.location.href = '../index.html';

      } catch (error) {
        console.error('Registration action failed:', error);

        if (errorContainer) {
          errorContainer.textContent = error.message || 'فشل إنشاء الحساب، الاسم أو البريد قد يكون مسجلاً مسبقاً.';
          errorContainer.classList.remove('hidden');
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'إنشاء الحساب والانضمام';
        }
      }
    });
  }
});
