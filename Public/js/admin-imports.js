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

  // دالة مساعدة لتنسيق التاريخ بالعربية
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateString.split('T')[0];
    }
  }

  // جلب قائمة المباريات لتعبئة القائمة المنسدلة بأسماء الفرق والنتائج والتواريخ
  async function loadActiveMatches() {
    try {
      const response = await apiFetch('/matches');
      const matches = Array.isArray(response) ? response : (response.matches || []);

      matchSelect.innerHTML = '<option value="">-- اختر مباراة من الجدول التالي --</option>';

      if (!matches || matches.length === 0) {
        matchSelect.innerHTML = '<option value="">لا توجد مباريات مسجلة حالياً</option>';
        return;
      }

      matches.forEach(match => {
        // أسماء الفرق
        const homeName = match.homeTeam ? match.homeTeam.name : `فريق مستضيف #${match.homeTeamId}`;
        const awayName = match.awayTeam ? match.awayTeam.name : `فريق ضيف #${match.awayTeamId}`;

        // النتيجة إن وجدت
        let scoreStr = '';
        if (match.status === 'finished' || match.homeScore !== null) {
          scoreStr = ` (${match.homeScore ?? 0} - ${match.awayScore ?? 0})`;
        }

        // التاريخ
        const dateStr = formatDate(match.matchDate);

        // الحالة
        let statusText = 'لم تبدأ بعد';
        if (match.status === 'being_played_right_now') statusText = 'تُلعب الآن 🟢';
        if (match.status === 'finished') statusText = 'انتهت 🏁';

        const option = document.createElement('option');
        option.value = match.id;
        option.textContent = `${homeName}${scoreStr} ضد ${awayName} | ${dateStr} [${statusText}]`;
        matchSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading matches:', error);
      matchSelect.innerHTML = `<option value="">فشل التحميل: ${error.message}</option>`;
    }
  }

  // مستمع التغييرات لحقل رفع الصورة لإظهار اسم الملف المختار تجميلياً
  if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        fileSelectedName.textContent = `الملف المختار: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} ميجابايت)`;
        fileSelectedName.style.display = 'block';
      } else {
        fileSelectedName.style.display = 'none';
      }
    });
  }

  // حدث رفع الصورة ومعالجتها بالذكاء الاصطناعي
  uploadStatsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const matchId = matchSelect.value;
    const file = imageFileInput.files[0];

    if (!matchId || !file) {
      alert('الرجاء التأكد من اختيار مباراة ورفع ملف صورة التقرير.');
      return;
    }

    submitUploadBtn.disabled = true;
    aiLoader.style.display = 'block';
    reviewSection.style.display = 'none';

    if (window.gsap) {
      gsap.fromTo('#aiLoader', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 });
    }

    const formData = new FormData();
    formData.append('matchId', matchId);
    formData.append('image', file);

    try {
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

      activeImportId = result.importId;
      setupReviewForm(result.extractedData, result.status);

    } catch (error) {
      console.error('Error processing upload:', error);
      alert(`عذراً، حدث خطأ أثناء المعالجة: ${error.message}`);
    } finally {
      submitUploadBtn.disabled = false;
      aiLoader.style.display = 'none';
    }
  });

  // دالة إعداد واجهة تصحيح البيانات المستخرجة
  function setupReviewForm(data, status) {
    reviewSection.style.display = 'block';
    importStatusBadge.textContent = status === 'pending_review' ? 'بانتظار المراجعة' : status;

    homeScoreInput.value = data.homeScore || 0;
    awayScoreInput.value = data.awayScore || 0;
    possessionHomeInput.value = data.possessionHome || 50;
    possessionAwayInput.value = data.possessionAway || 50;

    eventsListContainer.innerHTML = '';

    if (data.events && Array.isArray(data.events)) {
      data.events.forEach(event => {
        addEventRowToDOM(event);
      });
    }

    if (window.gsap) {
      gsap.fromTo('#reviewSection', { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
    }
  }

  // دالة لإنشاء صف حدث تفاعلي وإضافته لواجهة المراجعة
  function addEventRowToDOM(event = {}) {
    const row = document.createElement('div');
    row.className = 'event-review-row';

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

    if (window.gsap) {
      gsap.from(row, { opacity: 0, x: 20, duration: 0.3 });
    }
  }

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

  saveDraftBtn.addEventListener('click', async () => {
    if (!activeImportId) return;

    try {
      const correctedData = collectCorrectedData();
      const result = await apiFetch(`/imports/${activeImportId}`, {
        method: 'PUT',
        body: JSON.stringify({ correctedData })
      });

      if (result.success) {
        alert('تم حفظ البيانات كمسودة مراجعة بنجاح.');
      }
    } catch (error) {
      alert(`خطأ أثناء حفظ المسودة: ${error.message}`);
    }
  });

  rejectImportBtn.addEventListener('click', async () => {
    if (!activeImportId) return;

    if (!confirm('هل أنت متأكد من رغبتك في إلغاء ورفض سجل الاستيراد هذا بشكل نهائي؟')) {
      return;
    }

    try {
      const result = await apiFetch(`/imports/${activeImportId}/reject`, {
        method: 'POST'
      });

      if (result.success) {
        alert(result.message || 'تم رفض السجل وإغلاقه بنجاح.');
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

  reviewStatsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeImportId) return;

    if (!confirm('أنت الآن بصدد اعتماد ونشر هذه الإحصائيات والأحداث رسمياً للجمهور. هل تود الاستمرار؟')) {
      return;
    }

    try {
      const correctedData = collectCorrectedData();
      await apiFetch(`/imports/${activeImportId}`, {
        method: 'PUT',
        body: JSON.stringify({ correctedData })
      });

      const result = await apiFetch(`/imports/${activeImportId}/approve`, {
        method: 'POST'
      });

      if (result.success) {
        alert(`تهانينا، تم اعتماد بيانات الإحصائيات وتطبيقها بنجاح.\nتمت معالجة وإنشاء عدد (${result.eventsCreated}) من الأحداث والتسديدات والبطاقات التلقائية بنجاح.`);
        
        uploadStatsForm.reset();
        fileSelectedName.style.display = 'none';
        reviewSection.style.display = 'none';
        activeImportId = null;
        
        loadActiveMatches();
      }
    } catch (error) {
      alert(`خطأ أثناء اعتماد السجل ونشره: ${error.message}`);
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('anadol_token');
      localStorage.removeItem('anadol_user');
      window.location.href = '../index.html';
    });
  }

  loadActiveMatches();
});
