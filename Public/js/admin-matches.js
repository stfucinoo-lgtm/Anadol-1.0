document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  // السماح لكل من المسؤول والمحرر بالدخول حسب مصفوفة الصلاحيات بالقسم 5
  if (!token || (user.role !== 'admin' && user.role !== 'editor')) {
    window.location.href = '/admin/login.html';
    return;
  }

  // تحديث شارة الصلاحية المعروضة
  const userRoleEl = document.getElementById('user-role');
  if (userRoleEl) {
    userRoleEl.textContent = user.role === 'admin' ? 'مشرف رئيسي' : 'محرر محتوى';
  }

  initMatchesManagement();
});

let allMatches = [];
let allTeams = [];
let selectedMatchId = null;
let activeMatchData = null;

// عناصر التحكم الرئيسية للمباريات
const matchesLoadingEl = document.getElementById('matches-loading');
const matchesEmptyEl = document.getElementById('matches-empty');
const matchesListEl = document.getElementById('matches-list');
const filterStatusEl = document.getElementById('filter-status');

// النموذج الفرعي لإنشاء مباراة جديدة
const btnOpenMatchModal = document.getElementById('btn-open-match-modal');
const matchModal = document.getElementById('match-modal');
const matchForm = document.getElementById('match-form');
const selectHomeTeam = document.getElementById('match-home-team');
const selectAwayTeam = document.getElementById('match-away-team');

// اللوحة الفعالة وتفاصيل اللقاء الجاري تعديله
const matchPanelPlaceholder = document.getElementById('match-panel-placeholder');
const matchPanelActive = document.getElementById('match-panel-active');
const activeMatchStatusBadge = document.getElementById('active-match-status-badge');
const activeHomeName = document.getElementById('active-home-name');
const activeAwayName = document.getElementById('active-away-name');

// مدخلات التحديث السريع
const matchQuickStatsForm = document.getElementById('match-quick-stats-form');
const quickScoreHome = document.getElementById('quick-score-home');
const quickScoreAway = document.getElementById('quick-score-away');
const quickPossHome = document.getElementById('quick-poss-home');
const quickPossAway = document.getElementById('quick-poss-away');

// مدخلات تسجيل حدث جديد
const matchEventForm = document.getElementById('match-event-form');
const eventTeamSelect = document.getElementById('event-team');
const eventPlayerSelect = document.getElementById('event-player');
const eventTypeSelect = document.getElementById('event-type');
const eventMinuteInput = document.getElementById('event-minute');
const eventCoordX = document.getElementById('event-coord-x');
const eventCoordY = document.getElementById('event-coord-y');
const interactivePitch = document.getElementById('interactive-pitch');
const coordinateDot = document.getElementById('coordinate-dot');
const activeMatchEventsList = document.getElementById('active-match-events-list');

// تهيئة إعدادات وأحداث الشاشة
async function initMatchesManagement() {
  await loadTeamsData(); // جلب قائمة الفرق أولاً لتعبئة القوائم المنسدلة
  await loadMatches();

  if (filterStatusEl) {
    filterStatusEl.addEventListener('change', loadMatches);
  }

  if (btnOpenMatchModal) {
    btnOpenMatchModal.addEventListener('click', openMatchModal);
  }

  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeMatchModal);
  });

  if (matchForm) {
    matchForm.addEventListener('submit', handleMatchCreation);
  }

  if (matchQuickStatsForm) {
    matchQuickStatsForm.addEventListener('submit', handleQuickStatsSubmit);
  }

  if (matchEventForm) {
    matchEventForm.addEventListener('submit', handleEventSubmit);
  }

  // ربط النقر التفاعلي على مخطط الملعب لحساب الإحداثيات (0-100)
  if (interactivePitch) {
    interactivePitch.addEventListener('click', handlePitchClick);
  }

  // تغيير اللاعبين المنسدلين بناءً على الفريق المختار في نموذج الأحداث
  if (eventTeamSelect) {
    eventTeamSelect.addEventListener('change', (e) => {
      populatePlayersDropdownForTeam(e.target.value);
    });
  }

  // تهيئة أزرار تبديل الحالة السريع
  document.querySelectorAll('.btn-status-switch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const status = e.currentTarget.getAttribute('data-status');
      handleStatusSwitch(status);
    });
  });
}

// تحميل الفرق
async function loadTeamsData() {
  try {
    const teams = await fetchAPI('/api/teams');
    allTeams = teams || [];
    
    // تعبئة حقول الاختيار لإنشاء لقاء جديد
    if (selectHomeTeam && selectAwayTeam) {
      selectHomeTeam.innerHTML = '<option value="">اختر الفريق الأول</option>';
      selectAwayTeam.innerHTML = '<option value="">اختر الفريق الثاني</option>';
      allTeams.forEach(team => {
        const opt = `<option value="${team.id}">${team.name}</option>`;
        selectHomeTeam.innerHTML += opt;
        selectAwayTeam.innerHTML += opt;
      });
    }
  } catch (err) {
    console.error('خطأ أثناء تحميل بيانات الفرق:', err);
  }
}

// تحميل المباريات
async function loadMatches() {
  try {
    showEl(matchesLoadingEl);
    hideEl(matchesListEl);
    hideEl(matchesEmptyEl);

    const statusFilter = filterStatusEl ? filterStatusEl.value : 'all';
    let url = '/api/matches';
    if (statusFilter !== 'all') {
      url += `?status=${statusFilter}`;
    }

    const matches = await fetchAPI(url);
    allMatches = matches || [];

    if (allMatches.length === 0) {
      hideEl(matchesLoadingEl);
      showEl(matchesEmptyEl);
      return;
    }

    renderMatchesList(allMatches);
    hideEl(matchesLoadingEl);
    showEl(matchesListEl);
  } catch (err) {
    console.error('خطأ في جلب المباريات:', err);
    alert('تعذر تحميل جدول المباريات.');
  }
}

// بناء بطاقات المباريات
function renderMatchesList(matches) {
  if (!matchesListEl) return;
  matchesListEl.innerHTML = '';

  matches.forEach(match => {
    const homeTeam = allTeams.find(t => t.id === match.homeTeamId) || { name: 'فريق غير معروف', crestUrl: '' };
    const awayTeam = allTeams.find(t => t.id === match.awayTeamId) || { name: 'فريق غير معروف', crestUrl: '' };
    const matchDateFormatted = new Date(match.matchDate).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

    let statusText = 'لم تبدأ بعد';
    let statusClass = 'bg-slate-800 text-slate-300';
    if (match.status === 'being_played_right_now') {
      statusText = 'تُلعب الآن';
      statusClass = 'bg-red-950 text-red-400 border border-red-800 animate-pulse';
    } else if (match.status === 'finished') {
      statusText = 'انتهت';
      statusClass = 'bg-emerald-950 text-emerald-400';
    }

    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition duration-150 match-card';
    card.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="text-slate-400 font-mono">${matchDateFormatted}</span>
        <span class="px-2 py-0.5 rounded font-bold ${statusClass}">${statusText}</span>
      </div>
      <div class="flex items-center justify-between py-1">
        <div class="flex items-center gap-2.5 w-[40%] truncate">
          <img src="${homeTeam.crestUrl || '/img/default-crest.png'}" alt="" class="w-7 h-7 object-contain">
          <span class="font-semibold text-white text-xs truncate">${homeTeam.name}</span>
        </div>
        <div class="flex items-center gap-2 font-black text-white text-sm bg-slate-950 px-3 py-1 rounded">
          <span>${match.homeScore ?? 0}</span>
          <span class="text-slate-600">:</span>
          <span>${match.awayScore ?? 0}</span>
        </div>
        <div class="flex items-center gap-2.5 w-[40%] justify-end truncate">
          <span class="font-semibold text-white text-xs truncate">${awayTeam.name}</span>
          <img src="${awayTeam.crestUrl || '/img/default-crest.png'}" alt="" class="w-7 h-7 object-contain">
        </div>
      </div>
      <div class="flex justify-end pt-2 border-t border-slate-800/60">
        <button class="btn-manage-match-events bg-brand-card hover:bg-slate-800 text-slate-300 hover:text-brand-accent px-4 py-1.5 rounded-lg text-xs font-semibold transition" data-id="${match.id}">
          <i class="fa-solid fa-gears text-xs mr-1"></i> إدارة وإدخال الأحداث
        </button>
      </div>
    `;

    matchesListEl.appendChild(card);
  });

  document.querySelectorAll('.btn-manage-match-events').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      selectMatchForManagement(id);
    });
  });

  if (window.gsap) {
    gsap.from('.match-card', { opacity: 0, y: 10, duration: 0.25, stagger: 0.04 });
  }
}

// تفعيل لوحة الإدارة للمباراة المحددة وتفصيل أحداثها
async function selectMatchForManagement(matchId) {
  selectedMatchId = matchId;
  
  try {
    hideEl(matchPanelPlaceholder);
    showEl(matchPanelActive);

    // جلب تفاصيل المباراة مع أحداثها
    const match = await fetchAPI(`/api/matches/${matchId}`);
    activeMatchData = match;

    const homeTeam = allTeams.find(t => t.id === match.homeTeamId) || { name: 'صاحب الأرض' };
    const awayTeam = allTeams.find(t => t.id === match.awayTeamId) || { name: 'الضيف' };

    // ملء معلومات الواجهة الأساسية
    activeHomeName.textContent = homeTeam.name;
    activeAwayName.textContent = awayTeam.name;

    quickScoreHome.value = match.homeScore ?? 0;
    quickScoreAway.value = match.awayScore ?? 0;
    quickPossHome.value = match.possessionHome ?? 50;
    quickPossAway.value = match.possessionAway ?? 50;

    // تهيئة خيارات اختيار الفريق لتسجيل الأحداث
    if (eventTeamSelect) {
      eventTeamSelect.innerHTML = `
        <option value="">اختر الفريق</option>
        <option value="${match.homeTeamId}">${homeTeam.name}</option>
        <option value="${match.awayTeamId}">${awayTeam.name}</option>
      `;
    }

    if (eventPlayerSelect) {
      eventPlayerSelect.innerHTML = '<option value="">اختر اللاعب</option>';
    }

    // إعادة ضبط حقول تسجيل الإحداثيات وإخفاء مؤشر النقطة
    if (eventCoordX) eventCoordX.value = '';
    if (eventCoordY) eventCoordY.value = '';
    if (coordinateDot) coordinateDot.classList.add('hidden');

    // تحديث شارات الحالة وأزرار التفعيل السريع
    updateStatusInterface(match.status);

    // تحميل وعرض الأحداث المسجلة للمباراة
    renderActiveMatchEvents(match.events || []);

  } catch (err) {
    console.error('فشل في جلب تفاصيل المباراة:', err);
    alert('تعذر تفعيل إدارة هذه المباراة حالياً.');
  }
}

// تحديث الواجهة الرسومية لحالة المباراة
function updateStatusInterface(status) {
  if (!activeMatchStatusBadge) return;

  let badgeText = 'لم تبدأ بعد';
  let badgeClass = 'bg-slate-800 text-slate-300';
  if (status === 'being_played_right_now') {
    badgeText = 'تُلعب الآن';
    badgeClass = 'bg-red-950 text-red-400 border border-red-800 animate-pulse';
  } else if (status === 'finished') {
    badgeText = 'انتهت';
    badgeClass = 'bg-emerald-950 text-emerald-400';
  }

  activeMatchStatusBadge.textContent = badgeText;
  activeMatchStatusBadge.className = `px-2.5 py-1 rounded text-[10px] font-bold uppercase ${badgeClass}`;

  // تفعيل تمييز الزر النشط في التبديل السريع
  document.querySelectorAll('.btn-status-switch').forEach(btn => {
    const btnStatus = btn.getAttribute('data-status');
    if (btnStatus === status) {
      btn.className = 'btn-status-switch text-xs py-1.5 px-2 rounded font-bold bg-brand-accent text-brand-dark transition';
    } else {
      btn.className = 'btn-status-switch text-xs py-1.5 px-2 rounded font-semibold text-slate-400 hover:text-white transition';
    }
  });
}

// تبديل حالة اللقاء السريع
async function handleStatusSwitch(newStatus) {
  if (!selectedMatchId) return;

  try {
    const response = await fetchAPI(`/api/matches/${selectedMatchId}/status`, 'PUT', { status: newStatus });
    if (response && response.success) {
      updateStatusInterface(newStatus);
      await loadMatches(); // إعادة تصفح المباريات لتحديث الحالات بالجدول
    }
  } catch (err) {
    console.error('فشل في تعديل حالة اللقاء السريع:', err);
    alert('تعذر حفظ الحالة الجديدة للمباراة.');
  }
}

// جلب التشكيلة عند اختيار الفريق لتسجيل الأحداث
async function populatePlayersDropdownForTeam(teamId) {
  if (!eventPlayerSelect) return;
  eventPlayerSelect.innerHTML = '<option value="">اختر اللاعب</option>';
  if (!teamId) return;

  try {
    const response = await fetchAPI(`/api/teams/${teamId}`);
    const players = response.players || [];
    players.forEach(player => {
      eventPlayerSelect.innerHTML += `<option value="${player.id}">${player.jerseyNumber} - ${player.name} (${player.position})</option>`;
    });
  } catch (err) {
    console.error('خطأ أثناء جلب تشكيلة الفريق:', err);
  }
}

// التقاط النقرات على مخطط الملعب لحساب الإحداثيات المئوية (0-100)
function handlePitchClick(e) {
  if (!interactivePitch) return;

  const rect = interactivePitch.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // الحساب المئوي بدقة من 0 إلى 100 لتوافق العرض المتجاوب
  const percentX = Math.round((clickX / rect.width) * 100);
  const percentY = Math.round((clickY / rect.height) * 100);

  if (eventCoordX) eventCoordX.value = percentX;
  if (eventCoordY) eventCoordY.value = percentY;

  // وضع النقطة الرسومية المؤشرة على الملعب
  if (coordinateDot) {
    coordinateDot.style.left = `${percentX}%`;
    coordinateDot.style.top = `${percentY}%`;
    coordinateDot.classList.remove('hidden');
  }
}

// حفظ بيانات الاستحواذ والنتيجة العامة للمباراة
async function handleQuickStatsSubmit(e) {
  e.preventDefault();
  if (!selectedMatchId) return;

  const payload = {
    homeScore: parseInt(quickScoreHome.value),
    awayScore: parseInt(quickScoreAway.value),
    status: activeMatchData.status, // الحفاظ على الحالة الحالية
    possessionHome: parseInt(quickPossHome.value) || 50,
    possessionAway: parseInt(quickPossAway.value) || 50
  };

  try {
    const result = await fetchAPI(`/api/matches/${selectedMatchId}`, 'PUT', payload);
    if (result && result.success) {
      alert('تم تحديث النتيجة ونسب الاستحواذ بنجاح.');
      await loadMatches();
    }
  } catch (err) {
    console.error('فشل حفظ البيانات السريعة للمباراة:', err);
    alert('فشل تحديث البيانات.');
  }
}

// إرسال وتسجيل حدث المباراة التفصيلي (x, y)
async function handleEventSubmit(e) {
  e.preventDefault();
  if (!selectedMatchId) return;

  const payload = {
    teamId: parseInt(eventTeamSelect.value),
    playerId: parseInt(eventPlayerSelect.value),
    type: eventTypeSelect.value,
    minute: parseInt(eventMinuteInput.value),
    x: parseInt(eventCoordX.value),
    y: parseInt(eventCoordY.value),
    metadata: {}
  };

  try {
    const result = await fetchAPI(`/api/matches/${selectedMatchId}/events`, 'POST', payload);
    if (result && result.success) {
      // إعادة ضبط مدخلات الحدث باستثناء الدقيقة والفريق للتسهيل
      eventPlayerSelect.value = '';
      eventCoordX.value = '';
      eventCoordY.value = '';
      if (coordinateDot) coordinateDot.classList.add('hidden');

      // إعادة تحميل اللوحة لتحديث قائمة الأحداث
      await selectMatchForManagement(selectedMatchId);
    }
  } catch (err) {
    console.error('فشل تسجيل الحدث الفني:', err);
    alert('فشل حفظ تفاصيل الحدث في قاعدة البيانات.');
  }
}

// تعبئة قائمة الأحداث المسجلة مؤخراً
function renderActiveMatchEvents(events) {
  if (!activeMatchEventsList) return;
  activeMatchEventsList.innerHTML = '';

  if (events.length === 0) {
    activeMatchEventsList.innerHTML = '<p class="text-slate-600 text-center py-2">لا توجد أحداث مسجلة لهذا اللقاء حتى الآن.</p>';
    return;
  }

  // فرز الأحداث حسب دقيقة اللعب (من الأحدث للأقدم)
  const sortedEvents = [...events].sort((a, b) => b.minute - a.minute);

  sortedEvents.forEach(evt => {
    let typeIcon = '⚽';
    let typeName = 'حدث';
    if (evt.type === 'yellow_card') { typeIcon = '🟨'; typeName = 'إنذار أصفر'; }
    else if (evt.type === 'red_card') { typeIcon = '🟥'; typeName = 'طرد أحمر'; }
    else if (evt.type === 'substitution') { typeIcon = '🔄'; typeName = 'تبديل لاعب'; }
    else if (evt.type === 'shot') { typeIcon = '🎯'; typeName = 'تسديدة'; }
    else if (evt.type === 'tackle') { typeIcon = '⚔️'; typeName = 'تدخل دفاعي'; }
    else if (evt.type === 'goal') { typeIcon = '⚽'; typeName = 'هدف'; }

    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 bg-slate-950/60 rounded border border-slate-900';
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span>${typeIcon}</span>
        <span>د ${evt.minute}'</span>
        <span class="text-slate-400">|</span>
        <span class="text-slate-300 font-bold">${typeName}</span>
      </div>
      <div class="text-[10px] text-slate-500 font-mono">الإحداثيات: [X:${evt.x}, Y:${evt.y}]</div>
    `;
    activeMatchEventsList.appendChild(item);
  });
}

// التحكم بالنوافذ المنبثقة للجدولة
function openMatchModal() {
  if (!matchModal) return;
  matchModal.classList.remove('hidden');
  setTimeout(() => {
    matchModal.classList.add('opacity-100');
    const transformEl = matchModal.querySelector('.transform');
    if (transformEl) transformEl.classList.remove('scale-95');
  }, 10);
}

function closeMatchModal() {
  if (!matchModal) return;
  matchModal.classList.remove('opacity-100');
  const transformEl = matchModal.querySelector('.transform');
  if (transformEl) transformEl.classList.add('scale-95');
  setTimeout(() => {
    matchModal.classList.add('hidden');
  }, 300);
}

// معالجة جدولة اللقاء
async function handleMatchCreation(e) {
  e.preventDefault();

  const homeId = parseInt(selectHomeTeam.value);
  const awayId = parseInt(selectAwayTeam.value);

  if (homeId === awayId) {
    alert('لا يمكن جدولة مباراة لفريق ضد نفسه.');
    return;
  }

  const payload = {
    homeTeamId: homeId,
    awayTeamId: awayId,
    matchDate: new Date(document.getElementById('match-date').value).toISOString()
  };

  try {
    const result = await fetchAPI('/api/matches', 'POST', payload);
    if (result && result.success) {
      closeMatchModal();
      await loadMatches();
    }
  } catch (err) {
    console.error('خطأ أثناء جدولة اللقاء الجديد:', err);
    alert('تعذر حفظ جدولة المباراة الجديدة.');
  }
}

// دوال مساعدة آمنة
function showEl(el) {
  if (el) el.classList.remove('hidden');
}

function hideEl(el) {
  if (el) el.classList.add('hidden');
}