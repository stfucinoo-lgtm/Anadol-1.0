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
  initTabsManagement();
});

let allMatches = [];
let allTeams = [];
let selectedMatchId = null;
let activeMatchData = null;
let currentLineup = []; // تخزين التشكيلة الحالية للمباراة النشطة

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

// عناصر إدارة التشكيلات والتقييمات الجديدة
const lineupTeamSelect = document.getElementById('lineup-team-select');
const lineupFormationSelect = document.getElementById('lineup-formation-select');
const lineupPlayersRoster = document.getElementById('lineup-players-roster');
const btnSaveLineup = document.getElementById('btn-save-lineup');
const btnSaveRatings = document.getElementById('btn-save-ratings');
const ratingsHomeList = document.getElementById('ratings-home-list');
const ratingsAwayList = document.getElementById('ratings-away-list');
const ratingHomeTitle = document.getElementById('rating-home-title');
const ratingAwayTitle = document.getElementById('rating-away-title');

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

  // ربط تغيير فريق التشكيلة لتحديث قائمة لاعبي الفريق المختار
  if (lineupTeamSelect) {
    lineupTeamSelect.addEventListener('change', (e) => {
      renderTeamRosterForLineup(parseInt(e.target.value));
    });
  }

  // حفظ التشكيلة
  if (btnSaveLineup) {
    btnSaveLineup.addEventListener('click', handleSaveLineup);
  }

  // حفظ التقييمات
  if (btnSaveRatings) {
    btnSaveRatings.addEventListener('click', handleSaveRatings);
  }

  // تهيئة أزرار تبديل الحالة السريع
  document.querySelectorAll('.btn-status-switch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const status = e.currentTarget.getAttribute('data-status');
      handleStatusSwitch(status);
    });
  });
}

// تهيئة تبديل التبويبات الثلاثة
function initTabsManagement() {
  const tabs = ['tab-events', 'tab-lineups', 'tab-ratings'];
  tabs.forEach(tabId => {
    const btn = document.getElementById(tabId);
    if (btn) {
      btn.addEventListener('click', () => {
        // إزالة الفاعلية عن الجميع
        tabs.forEach(t => {
          const b = document.getElementById(t);
          if (b) {
            b.classList.remove('active', 'border-brand-accent', 'text-brand-accent');
            b.classList.add('text-slate-400');
          }
        });
        
        // تفعيل التبويب المختار
        btn.classList.add('active', 'border-brand-accent', 'text-brand-accent');
        btn.classList.remove('text-slate-400');

        // إخفاء كافة محتويات التبويبات وعرض المستهدف
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        const targetContentId = `tab-content-${tabId.split('-')[1]}`;
        const targetContent = document.getElementById(targetContentId);
        if (targetContent) targetContent.classList.remove('hidden');

        // تحديث قائمة التقييمات فوراً عند الانتقال لتبويب التقييمات
        if (tabId === 'tab-ratings') {
          loadRatingsLists();
        }
      });
    }
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
    
    // استخدام ترميز ar-EG-u-nu-latn لضمان إخراج الوقت والتاريخ بالأرقام العربية (1، 2، 3...) وليس الهندية
    const matchDateFormatted = new Date(match.matchDate).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' });

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
      <div class="flex justify-between items-center pt-2 border-t border-slate-800/60 gap-2">
        <button class="btn-delete-match bg-red-950/50 hover:bg-red-900/60 text-red-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1" data-id="${match.id}">
          <i class="fa-solid fa-trash-can"></i> حذف
        </button>
        <button class="btn-manage-match-events bg-brand-card hover:bg-slate-800 text-slate-300 hover:text-brand-accent px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1" data-id="${match.id}">
          <i class="fa-solid fa-gears"></i> إدارة وإدخال الأحداث
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

  // ربط أزرار الحذف الفوري للمباريات
  document.querySelectorAll('.btn-delete-match').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('هل أنت متأكد من حذف هذه المباراة نهائياً من الأرشيف؟ لا يمكن التراجع عن هذا الإجراء.')) {
        try {
          const response = await fetchAPI(`/api/matches/${id}`, 'DELETE');
          if (response && response.success) {
            alert('تم حذف المباراة بنجاح.');
            // إذا كانت المباراة المحذوفة هي النشطة حالياً في لوحة الإدخال، نعيد تهيئة الواجهة
            if (selectedMatchId == id) {
              selectedMatchId = null;
              hideEl(matchPanelActive);
              showEl(matchPanelPlaceholder);
            }
            await loadMatches(); // إعادة تحميل المباريات
          }
        } catch (err) {
          console.error('خطأ أثناء حذف المباراة:', err);
          alert('فشل في حذف المباراة.');
        }
      }
    });
  });

  if (window.gsap) {
    gsap.fromTo('.match-card', 
      { opacity: 0, y: 12 }, 
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.3, 
        stagger: 0.04, 
        clearProps: "all"
      }
    );
  }
}

// تفعيل لوحة الإدارة للمباراة المحددة وتفصيل أحداثها وتشكيلتها
async function selectMatchForManagement(matchId) {
  selectedMatchId = matchId;
  
  try {
    hideEl(matchPanelPlaceholder);
    showEl(matchPanelActive);

    // جلب تفاصيل المباراة مع أحداثها وتشكيلتها
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

    // تهيئة خيارات تحديد الفريق لإعداد التشكيلة
    if (lineupTeamSelect) {
      lineupTeamSelect.innerHTML = `
        <option value="">اختر فريقاً لتعديله</option>
        <option value="${match.homeTeamId}">${homeTeam.name} (الأرض)</option>
        <option value="${match.awayTeamId}">${awayTeam.name} (الضيف)</option>
      `;
      lineupPlayersRoster.innerHTML = '<p class="text-slate-600 text-xs text-center py-4">اختر فريقاً من القائمة لبدء تعيين تشكيلته.</p>';
    }

    // إعادة ضبط حقول تسجيل الإحداثيات وإخفاء مؤشر النقطة
    if (eventCoordX) eventCoordX.value = '';
    if (eventCoordY) eventCoordY.value = '';
    if (coordinateDot) coordinateDot.classList.add('hidden');

    // تحديث شارات الحالة وأزرار التفعيل السريع
    updateStatusInterface(match.status);

    // جلب التشكيلة الحالية المسجلة للمباراة
    const lineup = await fetchAPI(`/api/matches/${matchId}/lineup`);
    currentLineup = lineup || [];

    // تحميل وعرض الأحداث المسجلة للمباراة
    renderActiveMatchEvents(match.events || []);

    // إعادة العودة إلى التبويب الرئيسي كحالة افتراضية
    const firstTab = document.getElementById('tab-events');
    if (firstTab) firstTab.click();

  } catch (err) {
    console.error('فشل في جلب تفاصيل المباراة:', err);
    alert('تعذر تفعيل إدارة هذه المباراة حالياً.');
  }
}

// جلب وعرض قائمة لاعبي الفريق الحالي لإعداد التشكيلة
async function renderTeamRosterForLineup(teamId) {
  if (!lineupPlayersRoster) return;
  if (!teamId) {
    lineupPlayersRoster.innerHTML = '<p class="text-slate-600 text-xs text-center py-4">اختر فريقاً من القائمة لبدء تعيين تشكيلته.</p>';
    return;
  }

  try {
    lineupPlayersRoster.innerHTML = '<p class="text-slate-400 text-xs text-center py-4"><i class="fa-solid fa-circle-notch animate-spin text-brand-accent"></i> جاري جلب لاعبي النادي...</p>';
    
    const response = await fetchAPI(`/api/teams/${teamId}`);
    const players = response.players || [];

    if (players.length === 0) {
      lineupPlayersRoster.innerHTML = '<p class="text-slate-500 text-xs text-center py-4">لم يتم العثور على أي لاعبين مسجلين لهذا النادي.</p>';
      return;
    }

    lineupPlayersRoster.innerHTML = '';
    
    players.forEach(player => {
      // التحقق مما إذا كان اللاعب مسجلاً مسبقاً في تشكيلة المباراة الحالية
      const savedRecord = currentLineup.find(lp => lp.playerId === player.id);
      
      let statusVal = 'none';
      let positionVal = player.position || 'CM';

      if (savedRecord) {
        statusVal = savedRecord.isStarting ? 'starting' : 'sub';
        positionVal = savedRecord.position || positionVal;
      }

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800/80 hover:border-slate-700/80 transition';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-xs bg-slate-950 text-slate-400 w-5 h-5 flex items-center justify-center rounded font-mono">${player.jerseyNumber}</span>
          <span class="text-xs font-semibold text-slate-200">${player.name}</span>
        </div>
        <div class="flex items-center gap-3">
          <!-- تحديد الأساسي والاحتياطي -->
          <select class="lineup-player-status bg-slate-950 border border-slate-800 focus:border-brand-accent rounded px-1.5 py-1 text-[11px] text-slate-300 focus:outline-none" data-player-id="${player.id}">
            <option value="none" ${statusVal === 'none' ? 'selected' : ''}>خارج التشكيلة</option>
            <option value="starting" ${statusVal === 'starting' ? 'selected' : ''}>أساسي (Starter)</option>
            <option value="sub" ${statusVal === 'sub' ? 'selected' : ''}>احتياطي (Sub)</option>
          </select>
          <!-- تحديد رمز المركز التكتيكي لتحديد الإحداثيات -->
          <select class="lineup-player-position bg-slate-950 border border-slate-800 focus:border-brand-accent rounded px-1.5 py-1 text-[11px] text-slate-300 focus:outline-none" data-player-id="${player.id}">
            <option value="GK" ${positionVal === 'GK' ? 'selected' : ''}>حارس (GK)</option>
            <option value="LB" ${positionVal === 'LB' ? 'selected' : ''}>ظهير أيسر (LB)</option>
            <option value="LCB" ${positionVal === 'LCB' ? 'selected' : ''}>دفاع أيسر (LCB)</option>
            <option value="RCB" ${positionVal === 'RCB' ? 'selected' : ''}>دفاع أيمن (RCB)</option>
            <option value="RB" ${positionVal === 'RB' ? 'selected' : ''}>ظهير أيمن (RB)</option>
            <option value="LM" ${positionVal === 'LM' ? 'selected' : ''}>وسط أيسر (LM)</option>
            <option value="LCM" ${positionVal === 'LCM' ? 'selected' : ''}>وسط دفاعي (LCM)</option>
            <option value="RCM" ${positionVal === 'RCM' ? 'selected' : ''}>وسط هجومي (RCM)</option>
            <option value="RM" ${positionVal === 'RM' ? 'selected' : ''}>وسط أيمن (RM)</option>
            <option value="LS" ${positionVal === 'LS' ? 'selected' : ''}>هجوم أيسر (LS)</option>
            <option value="RS" ${positionVal === 'RS' ? 'selected' : ''}>هجوم أيمن (RS)</option>
          </select>
        </div>
      `;
      lineupPlayersRoster.appendChild(row);
    });

  } catch (err) {
    console.error('فشل تحميل تشكيلة النادي للإعداد:', err);
    lineupPlayersRoster.innerHTML = '<p class="text-red-500 text-xs text-center py-4">تعذر جلب لاعبي الفريق.</p>';
  }
}

// دالة حساب الإحداثيات التكتيكية (X, Y) لتنظيم الفقاعات على الملعب
function getTacticalCoordinates(role, isHome) {
  // إحداثيات ملعب متناظر بالكامل (0-100)
  // فريق الأرض يلعب من اليسار لليمين (X من 0 لـ 50)
  // فريق الضيف يلعب من اليمين لليسار (X من 100 لـ 50)
  if (isHome) {
    switch (role) {
      case 'GK':  return { x: 8,  y: 50 };
      case 'LB':  return { x: 22, y: 15 };
      case 'LCB': return { x: 20, y: 38 };
      case 'RCB': return { x: 20, y: 62 };
      case 'RB':  return { x: 22, y: 85 };
      case 'LM':  return { x: 35, y: 15 };
      case 'LCM': return { x: 32, y: 38 };
      case 'RCM': return { x: 32, y: 62 };
      case 'RM':  return { x: 35, y: 85 };
      case 'LS':  return { x: 45, y: 32 };
      case 'RS':  return { x: 45, y: 68 };
      default:    return { x: 25, y: 50 };
    }
  } else {
    // الضيف (معاكس)
    switch (role) {
      case 'GK':  return { x: 92, y: 50 };
      case 'LB':  return { x: 78, y: 85 };
      case 'LCB': return { x: 80, y: 62 };
      case 'RCB': return { x: 80, y: 38 };
      case 'RB':  return { x: 78, y: 15 };
      case 'LM':  return { x: 65, y: 85 };
      case 'LCM': return { x: 68, y: 62 };
      case 'RCM': return { x: 68, y: 38 };
      case 'RM':  return { x: 65, y: 15 };
      case 'LS':  return { x: 55, y: 68 };
      case 'RS':  return { x: 55, y: 32 };
      default:    return { x: 75, y: 50 };
    }
  }
}

// معالجة وحفظ التشكيلة للفريق الحالي المختار
async function handleSaveLineup() {
  if (!selectedMatchId || !activeMatchData) return;
  const teamId = parseInt(lineupTeamSelect.value);
  if (!teamId) {
    alert('الرجاء اختيار النادي أولاً.');
    return;
  }

  const isHome = (teamId === activeMatchData.homeTeamId);
  const statusSelectors = document.querySelectorAll('.lineup-player-status');
  
  const selectedTeamRecords = [];

  statusSelectors.forEach(select => {
    const playerId = parseInt(select.getAttribute('data-player-id'));
    const status = select.value;
    
    if (status !== 'none') {
      const isStarting = (status === 'starting');
      const roleSelect = document.querySelector(`.lineup-player-position[data-player-id="${playerId}"]`);
      const positionRole = roleSelect ? roleSelect.value : 'CM';

      // حساب الإحداثيات للاعبين الأساسيين فقط، والاحتياط يأخذون قيمة null
      let coords = { x: null, y: null };
      if (isStarting) {
        coords = getTacticalCoordinates(positionRole, isHome);
      }

      selectedTeamRecords.push({
        teamId: teamId,
        playerId: playerId,
        isStarting: isStarting,
        position: positionRole,
        positionX: coords.x,
        positionY: coords.y,
        rating: 6.0 // التقييم الافتراضي الأولي
      });
    }
  });

  // تصفية وحفظ تشكيلة الفريق الآخر لضمان عدم فقدانها عند تحديث الفريق الحالي
  const otherTeamRecords = currentLineup
    .filter(lp => lp.teamId !== teamId)
    .map(lp => ({
      teamId: lp.teamId,
      playerId: lp.playerId,
      isStarting: lp.isStarting,
      position: lp.position,
      positionX: lp.positionX,
      positionY: lp.positionY,
      rating: lp.rating
    }));

  const fullLineupPayload = [...otherTeamRecords, ...selectedTeamRecords];

  try {
    const result = await fetchAPI(`/api/matches/${selectedMatchId}/lineup`, 'POST', { lineup: fullLineupPayload });
    if (result && result.success) {
      alert('تم حفظ وتحديث تشكيلة هذا النادي بنجاح.');
      // إعادة تحميل التشكيلة محلياً لتحديث الحالة
      currentLineup = result.lineup || [];
    }
  } catch (err) {
    console.error('فشل في حفظ التشكيلة:', err);
    alert('حدث خطأ أثناء حفظ التشكيلة.');
  }
}

// عرض وإعداد قوائم إدخال تقييمات اللاعبين المشاركين للمباراة الحالية
async function loadRatingsLists() {
  if (!ratingsHomeList || !ratingsAwayList || !selectedMatchId || !activeMatchData) return;

  try {
    ratingsHomeList.innerHTML = '<p class="text-slate-500 text-xs">جاري تحميل تشكيلة اللقاء...</p>';
    ratingsAwayList.innerHTML = '<p class="text-slate-500 text-xs">جاري تحميل تشكيلة اللقاء...</p>';

    // تحديث عناوين التقييم لتناسب أسماء فريقي اللقاء
    const homeTeam = allTeams.find(t => t.id === activeMatchData.homeTeamId) || { name: 'صاحب الأرض' };
    const awayTeam = allTeams.find(t => t.id === activeMatchData.awayTeamId) || { name: 'الضيف' };
    
    if (ratingHomeTitle) ratingHomeTitle.innerHTML = `<span class="w-2 h-2 rounded bg-brand-accent"></span> تقييمات لاعبي: ${homeTeam.name}`;
    if (ratingAwayTitle) ratingAwayTitle.innerHTML = `<span class="w-2 h-2 rounded bg-slate-500"></span> تقييمات لاعبي: ${awayTeam.name}`;

    // جلب أحدث تشكيلة لتحديث شاشة التقييمات
    const lineup = await fetchAPI(`/api/matches/${selectedMatchId}/lineup`);
    currentLineup = lineup || [];

    const homePlayers = currentLineup.filter(lp => lp.teamId === activeMatchData.homeTeamId);
    const awayPlayers = currentLineup.filter(lp => lp.teamId === activeMatchData.awayTeamId);

    // بناء واجهة الأرض
    ratingsHomeList.innerHTML = '';
    if (homePlayers.length === 0) {
      ratingsHomeList.innerHTML = '<p class="text-slate-600 text-xs py-2">لا يوجد لاعبين مشاركين بالتشكيلة حالياً.</p>';
    } else {
      homePlayers.forEach(p => {
        const playerName = p.player ? p.player.name : 'لاعب غير معروف';
        const roleText = p.isStarting ? 'أساسي' : 'بديل';
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800/80';
        item.innerHTML = `
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-slate-200 truncate max-w-[140px]">${playerName}</span>
            <span class="text-[9px] text-slate-500">${roleText} | ${p.position}</span>
          </div>
          <input type="number" step="0.1" min="1.0" max="10.0" class="rating-input bg-slate-950 border border-slate-800 focus:border-brand-accent rounded text-center w-14 py-1 text-xs font-bold text-brand-accent" data-player-id="${p.playerId}" value="${p.rating ?? 6.0}">
        `;
        ratingsHomeList.appendChild(item);
      });
    }

    // بناء واجهة الضيف
    ratingsAwayList.innerHTML = '';
    if (awayPlayers.length === 0) {
      ratingsAwayList.innerHTML = '<p class="text-slate-600 text-xs py-2">لا يوجد لاعبين مشاركين بالتشكيلة حالياً.</p>';
    } else {
      awayPlayers.forEach(p => {
        const playerName = p.player ? p.player.name : 'لاعب غير معروف';
        const roleText = p.isStarting ? 'أساسي' : 'بديل';
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-800/80';
        item.innerHTML = `
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-slate-200 truncate max-w-[140px]">${playerName}</span>
            <span class="text-[9px] text-slate-500">${roleText} | ${p.position}</span>
          </div>
          <input type="number" step="0.1" min="1.0" max="10.0" class="rating-input bg-slate-950 border border-slate-800 focus:border-brand-accent rounded text-center w-14 py-1 text-xs font-bold text-brand-accent" data-player-id="${p.playerId}" value="${p.rating ?? 6.0}">
        `;
        ratingsAwayList.appendChild(item);
      });
    }

  } catch (err) {
    console.error('خطأ أثناء جلب وإخراج التقييمات للتشكيلة:', err);
  }
}

// حفظ وتحديث التقييمات الرقمية المدخلة دفعة واحدة
async function handleSaveRatings() {
  if (!selectedMatchId) return;

  const ratingInputs = document.querySelectorAll('.rating-input');
  if (ratingInputs.length === 0) {
    alert('لا يوجد لاعبين مشاركين في تشكيلة المباراة لتعديل تقييماتهم.');
    return;
  }

  const ratingsPayload = [];
  ratingInputs.forEach(input => {
    const playerId = parseInt(input.getAttribute('data-player-id'));
    const rating = parseFloat(input.value);

    if (playerId && !isNaN(rating)) {
      ratingsPayload.push({
        playerId: playerId,
        rating: rating
      });
    }
  });

  try {
    const result = await fetchAPI(`/api/matches/${selectedMatchId}/lineup/ratings`, 'PUT', { ratings: ratingsPayload });
    if (result && result.success) {
      alert('تم حفظ وتحديث تقييمات اللاعبين للمباراة بنجاح.');
      await loadRatingsLists(); // إعادة تحميل التقييمات لتأكيد القيم
    }
  } catch (err) {
    console.error('فشل في حفظ التقييمات الرقمية:', err);
    alert('فشل حفظ وتحديث التقييمات.');
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
    else if (evt.type === 'foul') { typeIcon = '⚠️'; typeName = 'خطأ'; }
    else if (evt.type === 'free_kick') { typeIcon = '📐'; typeName = 'ركلة حرة'; }
    else if (evt.type === 'penalty') { typeIcon = '🥅'; typeName = 'ركلة جزاء'; }

    // قراءة بيانات اللاعب المرتبط بالحدث من الاستجابة المحدثة
    const playerName = evt.player ? `${evt.player.name} (${evt.player.jerseyNumber}#)` : 'لاعب غير معروف';

    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 bg-slate-950/60 rounded border border-slate-900';
    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span>${typeIcon}</span>
        <span>د ${evt.minute}'</span>
        <span class="text-slate-400">|</span>
        <span class="text-slate-300 font-bold">${typeName}</span>
        <span class="text-slate-500">-</span>
        <span class="text-slate-200 font-semibold text-xs">${playerName}</span>
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
