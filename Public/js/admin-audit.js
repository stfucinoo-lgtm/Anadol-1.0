document.addEventListener('DOMContentLoaded', () => {
  // التحقق من وجود التوكن وصلاحية المستخدم (يسمح فقط للـ admin)
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  if (!token || user.role !== 'admin') {
    alert('غير مسموح بالدخول. هذه الصفحة مخصصة للمسؤولين فقط.');
    window.location.href = '../index.html';
    return;
  }

  // مراجع عناصر الواجهة (DOM Elements)
  const auditFilterForm = document.getElementById('auditFilterForm');
  const filterUser = document.getElementById('filterUser');
  const filterFromDate = document.getElementById('filterFromDate');
  const filterToDate = document.getElementById('filterToDate');
  const resetFiltersBtn = document.getElementById('resetFilters');
  const auditLogBody = document.getElementById('auditLogBody');
  const logoutBtn = document.getElementById('logoutBtn');

  // مراجع النافذة المنبثقة (Modal)
  const detailsModal = document.getElementById('detailsModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalAction = document.getElementById('modalAction');
  const modalTable = document.getElementById('modalTable');
  const modalRecordId = document.getElementById('modalRecordId');
  const oldValueBlock = document.getElementById('oldValueBlock');
  const newValueBlock = document.getElementById('newValueBlock');

  // لتخزين السجلات المسترجعة مؤقتاً لتسهيل البحث وعرض التفاصيل دون طلبات إضافية
  let currentAuditLogs = [];

  // دالة جلب البيانات من الخادم
  async function fetchAuditLogs(filters = {}) {
    try {
      auditLogBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">
            <i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل البيانات من سجل التدقيق...
          </td>
        </tr>
      `;

      // بناء رابط الطلب مع معايير الفلترة إن وجدت
      let url = '/api/admin/audit-log';
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // استخدام الـ Wrapper الموحد apiFetch المتوقع تواجده في api.js
      const data = await apiFetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // تخزين السجلات الحالية في الذاكرة
      currentAuditLogs = data || [];
      renderAuditLogs(currentAuditLogs);

    } catch (error) {
      console.error('Error fetching audit logs:', error);
      auditLogBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-danger">
            <i class="fa-solid fa-triangle-exclamation"></i> حدث خطأ أثناء تحميل السجلات: ${error.message || 'فشل الاتصال بالخادم'}
          </td>
        </tr>
      `;
    }
  }

  // دالة عرض السجلات في جدول الصفحة
  function renderAuditLogs(logs) {
    if (!logs || logs.length === 0) {
      auditLogBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">لا توجد سجلات مطابقة لمعايير البحث في الوقت الحالي.</td>
        </tr>
      `;
      return;
    }

    auditLogBody.innerHTML = '';

    logs.forEach(log => {
      const tr = document.createElement('tr');
      
      // تنسيق التاريخ والوقت المحلي
      const formattedDate = new Date(log.createdAt).toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // تحديد لون ورمز العملية (Action badge style)
      let actionClass = 'badge-secondary';
      if (log.action.includes('delete')) {
        actionClass = 'badge-danger';
      } else if (log.action.includes('update') || log.action.includes('edit')) {
        actionClass = 'badge-warning';
      } else if (log.action.includes('approve') || log.action.includes('create')) {
        actionClass = 'badge-success';
      }

      tr.innerHTML = `
        <td><strong>#${log.id}</strong></td>
        <td>
          <span class="user-info">
            <i class="fa-solid fa-user-shield text-muted"></i> ${log.username || 'مجهول'} 
            <small class="text-muted">(ID: ${log.userId})</small>
          </span>
        </td>
        <td><span class="badge ${actionClass}">${log.action}</span></td>
        <td><code class="code-highlight">${log.tableName}</code></td>
        <td><code>${log.recordId}</code></td>
        <td><span class="text-sm">${formattedDate}</span></td>
        <td>
          <button class="btn-action btn-sm view-details-btn" data-id="${log.id}">
            <i class="fa-solid fa-eye"></i> التفاصيل
          </button>
        </td>
      `;

      auditLogBody.appendChild(tr);
    });

    // إضافة حركة دخول تدريجية لصفوف الجدول باستخدام GSAP إن أمكن
    if (window.gsap) {
      gsap.from('#auditLogBody tr', {
        opacity: 0,
        y: 10,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power1.out'
      });
    }

    // ربط الحدث لأزرار التفاصيل
    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const logId = parseInt(e.currentTarget.getAttribute('data-id'));
        openDetailsModal(logId);
      });
    });
  }

  // دالة فتح النافذة وعرض تفاصيل السجل المحدد
  function openDetailsModal(logId) {
    const log = currentAuditLogs.find(item => item.id === logId);
    if (!log) return;

    // تعبئة البيانات الوصفية في الهيدر للـ modal
    modalAction.textContent = log.action;
    modalTable.textContent = log.tableName;
    modalRecordId.textContent = log.recordId;

    // تمييز الكلاس التجميلي لنوع العملية
    modalAction.className = 'badge';
    if (log.action.includes('delete')) {
      modalAction.classList.add('badge-danger');
    } else if (log.action.includes('update')) {
      modalAction.classList.add('badge-warning');
    } else {
      modalAction.classList.add('badge-success');
    }

    // صياغة وعرض القيمة القديمة والجديدة بتمثيل JSON منسق ومقروء
    if (log.oldValue) {
      oldValueBlock.textContent = JSON.stringify(log.oldValue, null, 2);
    } else {
      oldValueBlock.textContent = '-- لا توجد بيانات سابقة (إنشاء جديد) --';
    }

    if (log.newValue) {
      newValueBlock.textContent = JSON.stringify(log.newValue, null, 2);
    } else {
      newValueBlock.textContent = '-- لا توجد قيم جديدة (عملية حذف) --';
    }

    // عرض الـ modal مع تأثير تكبير سلس عبر GSAP
    detailsModal.style.display = 'flex';
    if (window.gsap) {
      gsap.fromTo('.modal-content', 
        { scale: 0.8, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' }
      );
    }
  }

  // دالة إغلاق النافذة المنبثقة
  function closeDetailsModal() {
    if (window.gsap) {
      gsap.to('.modal-content', {
        scale: 0.8,
        opacity: 0,
        duration: 0.2,
        ease: 'power1.in',
        onComplete: () => {
          detailsModal.style.display = 'none';
        }
      });
    } else {
      detailsModal.style.display = 'none';
    }
  }

  // أحداث إغلاق الـ Modal
  closeModalBtn.addEventListener('click', closeDetailsModal);
  modalCloseBtn.addEventListener('click', closeDetailsModal);
  
  // إغلاق عند الضغط خارج نافذة المحتوى
  detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) {
      closeDetailsModal();
    }
  });

  // حدث إرسال نموذج البحث للفلترة
  auditFilterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const filters = {
      userId: filterUser.value.trim(),
      fromDate: filterFromDate.value,
      toDate: filterToDate.value
    };
    fetchAuditLogs(filters);
  });

  // حدث إعادة تعيين الفلاتر
  resetFiltersBtn.addEventListener('click', () => {
    auditFilterForm.reset();
    fetchAuditLogs();
  });

  // تسجيل الخروج
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('anadol_token');
      localStorage.removeItem('anadol_user');
      window.location.href = '../index.html';
    });
  }

  // الجلب الأولي عند تحميل الصفحة مباشرة بدون فلاتر
  fetchAuditLogs();
});