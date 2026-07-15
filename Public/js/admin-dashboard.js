/**
 * ANADOL League - Admin Dashboard Controller
 * تشغيل وإدارة لوحة التحكم المركزية، التحقق من الصلاحيات التفاعلية، والتحكم بوضع الصيانة العام.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. تأمين الصفحة الإدارية فورياً ضد المتطفلين والزوار (متاح فقط لـ admin و editor)
  if (!AnadolAuth.protectPage(['admin', 'editor'])) {
    return;
  }

  const user = AnadolAuth.getUser();

  // 2. تحديث واجهة ترحيب المستخدم وبياناته
  const userDisplayName = document.getElementById('user-display-name');
  const userDisplayRole = document.getElementById('user-display-role');

  if (userDisplayName) userDisplayName.textContent = user.username;
  if (userDisplayRole) {
    userDisplayRole.textContent = user.role === 'admin' ? 'مدير النظام (Admin)' : 'منسق المحتوى (Editor)';
  }

  // 3. التحكم بالظهور التفاعلي للبطاقات والخيارات الأمنية حسب الدور (مصفوفة الصلاحيات - القسم 5)
  if (user.role === 'admin') {
    // إظهار البطاقات الحصرية للمسؤول
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    
    // تشغيل وتحميل لوحة إعدادات وضع الصيانة
    const maintenancePanel = document.getElementById('maintenance-panel');
    if (maintenancePanel) {
      maintenancePanel.classList.remove('hidden');
      loadMaintenanceStatus();
    }
  } else {
    // إذا كان المنسق من دور "editor"
    // نقوم بحجب بطاقة رفع واستيراد البيانات بالذكاء الاصطناعي (حيث أنها حصرية لـ admin بالقسم 5)
    const cardImports = document.getElementById('card-imports');
    if (cardImports) {
      cardImports.classList.add('hidden');
    }
  }

  // 4. نظام التحكم المركزي بوضع الصيانة (Maintenance Mode)
  const maintenanceToggleBtn = document.getElementById('maintenance-toggle-btn');
  const maintenanceStatusText = document.getElementById('maintenance-status-text');
  let isMaintenanceActive = false;

  async function loadMaintenanceStatus() {
    try {
      const response = await api.get('/admin/settings');
      isMaintenanceActive = response.maintenanceMode;
      updateMaintenanceUI();
    } catch (error) {
      console.error('Failed to fetch maintenance settings:', error);
      if (maintenanceStatusText) {
        maintenanceStatusText.textContent = 'خطأ في جلب حالة الصيانة.';
      }
    }
  }

  function updateMaintenanceUI() {
    if (!maintenanceToggleBtn || !maintenanceStatusText) return;

    if (isMaintenanceActive) {
      maintenanceStatusText.textContent = 'وضع الصيانة نشط - الزوار محجوبون حالياً';
      maintenanceStatusText.className = 'text-[10px] text-red-500 font-bold';
      
      maintenanceToggleBtn.textContent = 'تعطيل وضع الصيانة';
      maintenanceToggleBtn.className = 'px-4 py-2 rounded-lg text-xs font-black transition duration-200 bg-red-600 hover:bg-red-700 text-white cursor-pointer';
    } else {
      maintenanceStatusText.textContent = 'غير نشط - الموقع متاح للجميع حالياً';
      maintenanceStatusText.className = 'text-[10px] text-neutral-500';
      
      maintenanceToggleBtn.textContent = 'تفعيل وضع الصيانة';
      maintenanceToggleBtn.className = 'px-4 py-2 rounded-lg text-xs font-black transition duration-200 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer';
    }
  }

  if (maintenanceToggleBtn) {
    maintenanceToggleBtn.addEventListener('click', async () => {
      const confirmationMsg = isMaintenanceActive 
        ? 'هل أنت متأكد من رغبتك في إيقاف وضع الصيانة وإتاحة الموقع لجميع الزوار مجدداً؟' 
        : 'هل أنت متأكد من تفعيل وضع الصيانة؟ هذا الإجراء سيمنع جميع زوار الفئة visitor من تصفح الموقع.';

      if (!confirm(confirmationMsg)) {
        return;
      }

      try {
        const response = await api.put('/admin/settings', { maintenanceMode: !isMaintenanceActive });
        isMaintenanceActive = response.settings.maintenanceMode;
        updateMaintenanceUI();
      } catch (error) {
        console.error('Failed to toggle maintenance mode:', error);
        alert(error.message || 'فشل تحديث حالة وضع الصيانة، يرجى مراجعة الخادم.');
      }
    });
  }

  // 5. ربط عملية تسجيل الخروج الآمنة
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('هل ترغب فعلياً في تسجيل الخروج وإنهاء جلسة الإدارة الآمنة الحالية؟')) {
        AnadolAuth.logout();
      }
    });
  }

  // 6. تحديث عام السنة التلقائي في الذيل
  const currentYearEl = document.getElementById('current-year');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  // 7. تأثير حركات الدخول التدريجي لبطاقات لوحة التحكم الإدارية عبر GSAP
  if (typeof gsap !== 'undefined') {
    gsap.from('.admin-card:not(.hidden)', {
      opacity: 0,
      y: 16,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power2.out'
    });
  }
});