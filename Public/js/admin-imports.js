document.addEventListener('DOMContentLoaded', () => {
  // التحقق من صلاحية المسؤول للوصول للميزات
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  if (!token || user.role !== 'admin') {
    alert('غير مسموح بالدخول. هذه الصفحة مخصصة للمسؤولين فقط.');
    window.location.href = '../index.html';
    return;
  }

  // عناصر واجهة المستخدم
  const matchSelect = document.getElementById('matchSelect');
  const uploadStatsForm = document.getElementById('uploadStatsForm');
  const imageFileInput = document.getElementById('imageFile');
  const fileSelectedName = document.getElementById('fileSelectedName');
  const submitUploadBtn = document.getElementById('submitUploadBtn');
  const aiLoader = document.getElementById('aiLoader');
  const reviewSection = document.getElementById('reviewSection');
  const logoutBtn = document.getElementById('logoutBtn');

  // عناصر نموذج المراجعة
  const reviewStatsForm = document.getElementById('reviewStatsForm');
  const homeScoreInput = document.getElementById('homeScore');
  const awayScoreInput = document.getElementById('awayScore');
  const possessionHomeInput = document.getElementById('possessionHome');
  const possessionAwayInput = document.getElementById('possessionAway');
  const eventsListContainer = document.getElementById('eventsListContainer');
  const addNewEventBtn = document.getElementById('addNewEventBtn');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const rejectImportBtn = document.getElementById('rejectImportBtn');
  const importStatusBadge = document.getElementById('importStatusBadge');

  // متغيرات تتبع الحالة لعملية الاستيراد النشطة
  let activeImportId = null;
  let activeMatchId = null;

  // جلب قائمة المباريات لتعبئة القائمة المنسدلة
  async function loadActiveMatches() {
    try {
      // جلب كل المباريات (المكتملة والجارية وغير الملعوبة)
      const matches = await apiFetch('/api/matches');
      matchSelect.innerHTML = '<option value="">-- اختر مباراة من الجدول التالي --</option>';

      if (!matches || matches.length === 0) {
        matchSelect.innerHTML = '<option value="">لا توجد مباريات مسجلة حالياً</option>';
        return;
      }

      // فرز وتنسيق الخيارات لعرضها للمسؤول
      matches.forEach(match => {
        // تحديد ترميز الحالة لتسهيل الاختيار
        let statusText = 'لم تبدأ بعد';
        if (match.status === 'being_played_right_now') statusText = 'تُلعب الآن 🟢';
        if (match.status === 'finished') statusText = 'انتهت 🏁';

        const option = document.createElement('option');
        option.value = match.id;
        option.textContent = `مباراة رقم ${match.id}: [مستضيف] ID ${match.homeTeamId} ضد [ضيف] ID ${match.awayTeamId} (${statusText})`;
        matchSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading matches:', error);
      matchSelect.innerHTML = '<option value="">فشل تحميل مباريات الدوري</option>';
    }
  }

  // مستمع التغييرات لحقل رفع الصورة لإظهار اسم الملف المختار تجميلياً
  imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileSelectedName.textContent = `الملف المختار: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} ميجابايت)`;
      fileSelectedName.style.display = 'block';
    } else {
      fileSelectedName.style.display = 'none';
    }
  });

  // حدث رفع الصورة ومعالجتها بالذكاء الاصطناعي
  uploadStatsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const matchId = matchSelect.value;
    const file = imageFileInput.files[0];

    if (!matchId || !file) {
      alert('الرجاء التأكد من اختيار مباراة ورفع ملف صورة التقرير.');
      return;
    }

    // إعداد واجهة التحميل وتعطيل المدخلات
    submitUploadBtn.disabled = true;
    aiLoader.style.display = 'block';
    reviewSection.style.display = 'none';

    if (window.gsap) {
      gsap.fromTo('#aiLoader', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 });
    }

    // بناء كائن FormData الخاص بنقل البيانات المتعددة الأشكال (multipart/form-data)
    const formData = new FormData();
    formData.append('matchId', matchId);
    formData.append('image', file);

    try {
      // إرسال الطلب للخادم عبر استخدام fetch الأصلي بدلاً من apiFetch لدعم الـ FormData مباشرة وسهولة معالجة ترويسة التحميل
      const response = await fetch('/api/imports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في استخراج البيانات من الصورة.');
      }

      // تخزين معرف العملية الحالي
      activeImportId = result.importId;
      activeMatchId = matchId;

      // تهيئة وعرض قسم المراجعة
      setupReviewForm(result.extractedData, result.status);

    } catch (error) {
      console.error('Error processing upload:', error);
      alert(`عذراً، حدث خطأ أثناء المعالجة: ${error.message}`);
    } finally {
      // إيقاف مؤشر التحميل واستعادة الزر
      submitUploadBtn.disabled = false;
      aiLoader.style.display = 'none';
    }
  });

  // دالة إعداد واجهة تصحيح البيانات المستخرجة
  function setupReviewForm(data, status) {
    reviewSection.style.display = 'block';
    importStatusBadge.textContent = status === 'pending_review' ? 'بانتظار المراجعة' : status;

    // تعبئة البيانات الوصفية والإحصائيات الكلية
    homeScoreInput.value = data.homeScore || 0;
    awayScoreInput.value = data.awayScore || 0;
    possessionHomeInput.value = data.possessionHome || 50;
    possessionAwayInput.value = data.possessionAway || 50;

    // تفريغ قائمة الأحداث السابقة
    eventsListContainer.innerHTML = '';

    // معالجة قائمة الأحداث الراجعة وتجسيدها
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(event => {
        addEventRowToDOM(event);
      });
    }

    // حركة ظهور سلسة لواجهة التعديل والمراجعة
    if (window.gsap) {
      gsap.fromTo('#reviewSection', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
    }
  }

  // دالة لإنشاء صف حدث تفاعلي وإضافته لواجهة المراجعة
  function addEventRowToDOM(event = {}) {
    const row = document.createElement('div');
    row.className = 'event-review-row';

    // هيكلة مدخلات السطر
    row.innerHTML = `
      <div class="event-field-group">
        <label>الفريق:</label>
        <select class="ev-team" required>
          <option value="home" ${event.team === 'home' ? 'selected' : ''}>مستضيف (Home)</option>
          <option value="away" ${event.team === 'away' ? 'selected' : ''}>ضيف (Away)</option>
        </select>
      </div>

      <div class="event-field-group">
        <label>اسم اللاعب المستخرج:</label>
        <input type="text" class="ev-playerName" value="${event.playerName || ''}" placeholder="أدخل اسم اللاعب" required>
      </div>

      <div class="event-field-group">
        <label>النوع:</label>
        <select class="ev-type" required>
          <option value="goal" ${event.type === 'goal' ? 'selected' : ''}>هدف ⚽</option>
          <option value="yellow_card" ${event.type === 'yellow_card' ? 'selected' : ''}>بطاقة صفراء 🟨</option>
          <option value="red_card" ${event.type === 'red_card' ? 'selected' : ''}>بطاقة حمراء 🟥</option>
          <option value="substitution" ${event.type === 'substitution' ? 'selected' : ''}>تبديل 🔄</option>
          <option value="shot" ${event.type === 'shot' ? 'selected' : ''}>تسديدة 🏹</option>
          <option value="tackle" ${event.type === 'tackle' ? 'selected' : ''}>تدخل/قطع 🛡️</option>
        </select>
      </div>

      <div class="event-field-group">
        <label>الدقيقة:</label>
        <input type="number" class="ev-minute" value="${event.minute || 1}" min="1" max="130" required>
      </div>

      <div class="event-field-group size-sm">
        <label>X (0-100):</label>
        <input type="number" class="ev-x" value="${event.x !== undefined ? event.x : 50}" min="0" max="100" required>
      </div>

      <div class="event-field-group size-sm">
        <label>Y (0-100):</label>
        <input type="number" class="ev-y" value="${event.y !== undefined ? event.y : 50}" min="0" max="100" required>
      </div>

      <button type="button" class="btn-danger-outline btn-delete-event-row" title="حذف الحدث">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    // ربط ميزة الحذف الفوري للسطر المختار
    row.querySelector('.btn-delete-event-row').addEventListener('click', () => {
      if (window.gsap) {
        gsap.to(row, {
          opacity: 0,
          x: -30,
          duration: 0.3,
          onComplete: () => row.remove()
        });
      } else {
        row.remove();
      }
    });

    eventsListContainer.appendChild(row);

    // حركة تجميلية خفيفة لدخول السطر الجديد
    if (window.gsap) {
      gsap.from(row, { opacity: 0, x: 20, duration: 0.3 });
    }
  }

  // مستمع حدث زر إضافة حدث جديد فارغ
  addNewEventBtn.addEventListener('click', () => {
    addEventRowToDOM({
      team: 'home',
      playerName: '',
      type: 'goal',
      minute: 1,
      x: 50,
      y: 50
    });
  });

  // دالة مساعدة لتجميع وقراءة البيانات المدخلة في صفحة المراجعة وصياغتها بهيكل الكائن
  function collectCorrectedData() {
    const eventRows = eventsListContainer.querySelectorAll('.event-review-row');
    const events = [];

    eventRows.forEach(row => {
      events.push({
        team: row.querySelector('.ev-team').value,
        playerName: row.querySelector('.ev-playerName').value.trim(),
        type: row.querySelector('.ev-type').value,
        minute: parseInt(row.querySelector('.ev-minute').value) || 1,
        x: parseFloat(row.querySelector('.ev-x').value) || 50,
        y: parseFloat(row.querySelector('.ev-y').value) || 50
      });
    });

    return {
      homeScore: parseInt(homeScoreInput.value) || 0,
      awayScore: parseInt(awayScoreInput.value) || 0,
      possessionHome: parseInt(possessionHomeInput.value) || 50,
      possessionAway: parseInt(possessionAwayInput.value) || 50,
      events: events
    };
  }

  // حدث زر حفظ المسودة كملف تعديل مؤقت
  saveDraftBtn.addEventListener('click', async () => {
    if (!activeImportId) return;

    try {
      const correctedData = collectCorrectedData();

      const result = await apiFetch(`/api/imports/${activeImportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ correctedData })
      });

      if (result.success) {
        alert('تم حفظ البيانات كمسودة مراجعة بنجاح.');
      }
    } catch (error) {
      alert(`خطأ أثناء حفظ المسودة: ${error.message}`);
    }
  });

  // حدث رفض المسودة بالكامل دون ترحيل
  rejectImportBtn.addEventListener('click', async () => {
    if (!activeImportId) return;

    if (!confirm('هل أنت متأكد من رغبتك في إلغاء ورفض سجل الاستيراد هذا بشكل نهائي؟ لن تُجرى أي تعديلات على بيانات المباراة الحالية.')) {
      return;
    }

    try {
      const result = await apiFetch(`/api/imports/${activeImportId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (result.success) {
        alert(result.message || 'تم رفض السجل وإغلاقه بنجاح.');
        // مسح وتصفير الواجهات
        uploadStatsForm.reset();
        fileSelectedName.style.display = 'none';
        reviewSection.style.display = 'none';
        activeImportId = null;
        loadActiveMatches();
      }
    } catch (error) {
      alert(`خطأ أثناء رفض الملف: ${error.message}`);
    }
  });

  // حدث الاعتماد والترحيل النهائي للبيانات وتحديث المباراة رسمياً في جدول الدوري
  reviewStatsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeImportId) return;

    if (!confirm('أنت الآن بصدد اعتماد ونشر هذه الإحصائيات والأحداث رسمياً للجمهور والبدء في حساب الفروقات وتعديل نقاط الترتيب. هل تود الاستمرار؟')) {
      return;
    }

    try {
      // 1. إجراء حفظ أخير للمدخلات والتحديثات المدونة من قِبل المسؤول أولاً لضمان استلام الخادم للبيانات المصححة
      const correctedData = collectCorrectedData();
      await apiFetch(`/api/imports/${activeImportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ correctedData })
      });

      // 2. إرسال أمر الاعتماد والبدء في توزيع البيانات وتغيير حالة المباراة تلقائياً لـ finished
      const result = await apiFetch(`/api/imports/${activeImportId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (result.success) {
        alert(`تهانينا، تم اعتماد بيانات الإحصائيات وتطبيقها بنجاح.\nتمت معالجة وإنشاء عدد (${result.eventsCreated}) من الأحداث والتسديدات والبطاقات التلقائية بنجاح.`);
        
        // إعادة تهيئة وتنظيف لوحة العمل والبيانات
        uploadStatsForm.reset();
        fileSelectedName.style.display = 'none';
        reviewSection.style.display = 'none';
        activeImportId = null;
        
        // إعادة تحميل القائمة لتحديث الحالات
        loadActiveMatches();
      }
    } catch (error) {
      alert(`خطأ أثناء اعتماد السجل ونشره: ${error.message}`);
    }
  });

  // حدث تسجيل خروج المسؤول
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('anadol_token');
      localStorage.removeItem('anadol_user');
      window.location.href = '../index.html';
    });
  }

  // البدء الفوري في تحميل المباريات النشطة
  loadActiveMatches();
});