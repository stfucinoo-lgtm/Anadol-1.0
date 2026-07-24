document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  if (!token || (user.role !== 'admin' && user.role !== 'editor')) {
    window.location.href = '/admin/login.html';
    return;
  }

  const userRoleEl = document.getElementById('user-role');
  if (userRoleEl) {
    userRoleEl.textContent = user.role === 'admin' ? 'مشرف رئيسي' : 'محرر محتوى';
  }

  initMatchesManagement();
  initTabsManagement();
  initTacticalPickerModal();
});

let allMatches = [];
let allTeams = [];
let selectedMatchId = null;
let activeMatchData = null;
let currentMatchLineup = []; // كافة التشكيلة المسجلة للمباراة
let currentTeamRoster = [];  // كافة لاعبي النادي المختار من السيرفر
let activeSlotIndex = null;  // المركز المحدد حالياً على الملعب للتعيين
let isSubstituteMode = false;// تحديد هل الاختيار لبديل أم لأساسي

// مكتبة الإحداثيات والخطط التكتيكية المتقدمة (13 خطة)
const FORMATIONS_LIBRARY = {
  '4-3-3': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 72 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 74 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 74 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 72 },
    { role: 'CM', label: 'وسط أيسر', x: 28, y: 48 },
    { role: 'DM', label: 'وسط دفاعي', x: 50, y: 54 },
    { role: 'CM', label: 'وسط أيمن', x: 72, y: 48 },
    { role: 'LW', label: 'جناح أيسر', x: 20, y: 22 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 18 },
    { role: 'RW', label: 'جناح أيمن', x: 80, y: 22 }
  ],
  '4-2-3-1': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 74 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 76 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 76 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 74 },
    { role: 'DM', label: 'محور أيسر', x: 35, y: 58 },
    { role: 'DM', label: 'محور أيمن', x: 65, y: 58 },
    { role: 'LAM', label: 'جناح أيسر', x: 20, y: 38 },
    { role: 'CAM', label: 'صانع ألعاب', x: 50, y: 36 },
    { role: 'RAM', label: 'جناح أيمن', x: 80, y: 38 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 18 }
  ],
  '4-4-2': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 72 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 74 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 74 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 72 },
    { role: 'LM', label: 'وسط أيسر', x: 16, y: 46 },
    { role: 'CM', label: 'وسط أيسر', x: 38, y: 48 },
    { role: 'CM', label: 'وسط أيمن', x: 62, y: 48 },
    { role: 'RM', label: 'وسط أيمن', x: 84, y: 46 },
    { role: 'ST', label: 'مهاجم أيسر', x: 38, y: 20 },
    { role: 'ST', label: 'مهاجم أيمن', x: 62, y: 20 }
  ],
  '3-5-2': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'CB', label: 'دفاع أيسر', x: 25, y: 74 },
    { role: 'CB', label: 'دفاع أوسط', x: 50, y: 76 },
    { role: 'CB', label: 'دفاع أيمن', x: 75, y: 74 },
    { role: 'LWB', label: 'جناح أيسر', x: 12, y: 48 },
    { role: 'CM', label: 'وسط أيسر', x: 32, y: 52 },
    { role: 'DM', label: 'وسط ارتكاز', x: 50, y: 50 },
    { role: 'CM', label: 'وسط أيمن', x: 68, y: 52 },
    { role: 'RWB', label: 'جناح أيمن', x: 88, y: 48 },
    { role: 'ST', label: 'مهاجم أيسر', x: 38, y: 20 },
    { role: 'ST', label: 'مهاجم أيمن', x: 62, y: 20 }
  ],
  '5-3-2': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LWB', label: 'ظهير أيسر', x: 12, y: 68 },
    { role: 'CB', label: 'دفاع أيسر', x: 31, y: 74 },
    { role: 'CB', label: 'دفاع أوسط', x: 50, y: 76 },
    { role: 'CB', label: 'دفاع أيمن', x: 69, y: 74 },
    { role: 'RWB', label: 'ظهير أيمن', x: 88, y: 68 },
    { role: 'CM', label: 'وسط أيسر', x: 30, y: 48 },
    { role: 'DM', label: 'وسط دفاعي', x: 50, y: 50 },
    { role: 'CM', label: 'وسط أيمن', x: 70, y: 48 },
    { role: 'ST', label: 'مهاجم أيسر', x: 38, y: 20 },
    { role: 'ST', label: 'مهاجم أيمن', x: 62, y: 20 }
  ],
  '3-4-3': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'CB', label: 'دفاع أيسر', x: 25, y: 74 },
    { role: 'CB', label: 'دفاع أوسط', x: 50, y: 76 },
    { role: 'CB', label: 'دفاع أيمن', x: 75, y: 74 },
    { role: 'LM', label: 'وسط أيسر', x: 15, y: 48 },
    { role: 'CM', label: 'وسط أيسر', x: 38, y: 50 },
    { role: 'CM', label: 'وسط أيمن', x: 62, y: 50 },
    { role: 'RM', label: 'وسط أيمن', x: 85, y: 48 },
    { role: 'LW', label: 'جناح أيسر', x: 22, y: 22 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 18 },
    { role: 'RW', label: 'جناح أيمن', x: 78, y: 22 }
  ],
  '4-1-4-1': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 74 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 74 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 74 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 74 },
    { role: 'DM', label: 'وسط ارتكاز', x: 50, y: 60 },
    { role: 'LM', label: 'وسط أيسر', x: 16, y: 40 },
    { role: 'CM', label: 'وسط أيسر', x: 38, y: 38 },
    { role: 'CM', label: 'وسط أيمن', x: 62, y: 38 },
    { role: 'RM', label: 'وسط أيمن', x: 84, y: 40 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 18 }
  ],
  '4-5-1': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 74 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 74 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 74 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 74 },
    { role: 'LM', label: 'وسط أيسر', x: 15, y: 48 },
    { role: 'CM', label: 'وسط أيسر', x: 35, y: 52 },
    { role: 'CM', label: 'وسط صريح', x: 50, y: 50 },
    { role: 'CM', label: 'وسط أيمن', x: 65, y: 52 },
    { role: 'RM', label: 'وسط أيمن', x: 85, y: 48 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 20 }
  ],
  '5-4-1': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LWB', label: 'ظهير أيسر', x: 12, y: 70 },
    { role: 'CB', label: 'دفاع أيسر', x: 31, y: 76 },
    { role: 'CB', label: 'دفاع أوسط', x: 50, y: 78 },
    { role: 'CB', label: 'دفاع أيمن', x: 69, y: 76 },
    { role: 'RWB', label: 'ظهير أيمن', x: 88, y: 70 },
    { role: 'LM', label: 'وسط أيسر', x: 15, y: 48 },
    { role: 'CM', label: 'وسط أيسر', x: 38, y: 50 },
    { role: 'CM', label: 'وسط أيمن', x: 62, y: 50 },
    { role: 'RM', label: 'وسط أيمن', x: 85, y: 48 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 20 }
  ],
  '4-1-2-1-2': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 74 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 74 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 74 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 74 },
    { role: 'DM', label: 'ارتكاز دفاعي', x: 50, y: 62 },
    { role: 'CM', label: 'وسط أيسر', x: 32, y: 46 },
    { role: 'CM', label: 'وسط أيمن', x: 68, y: 46 },
    { role: 'CAM', label: 'صانع ألعاب', x: 50, y: 32 },
    { role: 'ST', label: 'مهاجم أيسر', x: 38, y: 18 },
    { role: 'ST', label: 'مهاجم أيمن', x: 62, y: 18 }
  ],
  '4-3-2-1': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 74 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 74 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 74 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 74 },
    { role: 'CM', label: 'وسط أيسر', x: 28, y: 54 },
    { role: 'CM', label: 'وسط أوسط', x: 50, y: 56 },
    { role: 'CM', label: 'وسط أيمن', x: 72, y: 54 },
    { role: 'CAM', label: 'صانع أيسر', x: 35, y: 34 },
    { role: 'CAM', label: 'صانع أيمن', x: 65, y: 34 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 18 }
  ],
  '3-4-2-1': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'CB', label: 'دفاع أيسر', x: 25, y: 74 },
    { role: 'CB', label: 'دفاع أوسط', x: 50, y: 76 },
    { role: 'CB', label: 'دفاع أيمن', x: 75, y: 74 },
    { role: 'LM', label: 'وسط أيسر', x: 15, y: 52 },
    { role: 'CM', label: 'وسط أيسر', x: 38, y: 54 },
    { role: 'CM', label: 'وسط أيمن', x: 62, y: 54 },
    { role: 'RM', label: 'وسط أيمن', x: 85, y: 52 },
    { role: 'CAM', label: 'صانع أيسر', x: 35, y: 32 },
    { role: 'CAM', label: 'صانع أيمن', x: 65, y: 32 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 18 }
  ],
  '5-2-3': [
    { role: 'GK', label: 'حارس', x: 50, y: 88 },
    { role: 'LWB', label: 'ظهير أيسر', x: 12, y: 70 },
    { role: 'CB', label: 'دفاع أيسر', x: 31, y: 76 },
    { role: 'CB', label: 'دفاع أوسط', x: 50, y: 78 },
    { role: 'CB', label: 'دفاع أيمن', x: 69, y: 76 },
    { role: 'RWB', label: 'ظهير أيمن', x: 88, y: 70 },
    { role: 'CM', label: 'وسط أيسر', x: 38, y: 50 },
    { role: 'CM', label: 'وسط أيمن', x: 62, y: 50 },
    { role: 'LW', label: 'جناح أيسر', x: 22, y: 22 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 18 },
    { role: 'RW', label: 'جناح أيمن', x: 78, y: 22 }
  ]
};

// عناصر الواجهة الرئيسية
const matchesLoadingEl = document.getElementById('matches-loading');
const matchesEmptyEl = document.getElementById('matches-empty');
const matchesListEl = document.getElementById('matches-list');
const filterStatusEl = document.getElementById('filter-status');

// النموذج الفرعي لإنشاء مباراة
const btnOpenMatchModal = document.getElementById('btn-open-match-modal');
const matchModal = document.getElementById('match-modal');
const matchForm = document.getElementById('match-form');
const selectHomeTeam = document.getElementById('match-home-team');
const selectAwayTeam = document.getElementById('match-away-team');

// اللوحة الفعالة وتفاصيل اللقاء
const matchPanelPlaceholder = document.getElementById('match-panel-placeholder');
const matchPanelActive = document.getElementById('match-panel-active');
const activeMatchStatusBadge = document.getElementById('active-match-status-badge');
const activeHomeName = document.getElementById('active-home-name');
const activeAwayName = document.getElementById('active-away-name');

// التحديث السريع
const matchQuickStatsForm = document.getElementById('match-quick-stats-form');
const quickScoreHome = document.getElementById('quick-score-home');
const quickScoreAway = document.getElementById('quick-score-away');
const quickPossHome = document.getElementById('quick-poss-home');
const quickPossAway = document.getElementById('quick-poss-away');

// الأحداث
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

// التشكيلات والتقييمات SofaScore
const lineupTeamSelect = document.getElementById('lineup-team-select');
const lineupFormationSelect = document.getElementById('lineup-formation-select');
const sofascorePitchSlots = document.getElementById('sofascore-pitch-slots');
const lineupSubstitutesContainer = document.getElementById('lineup-substitutes-container');
const btnAddSubstitute = document.getElementById('btn-add-substitute');
const btnSaveLineup = document.getElementById('btn-save-lineup');
const btnSaveRatings = document.getElementById('btn-save-ratings');
const ratingsHomeList = document.getElementById('ratings-home-list');
const ratingsAwayList = document.getElementById('ratings-away-list');
const ratingHomeTitle = document.getElementById('rating-home-title');
const ratingAwayTitle = document.getElementById('rating-away-title');

// المودال التفاعلي لاختيار اللاعبين
const playerPickerModal = document.getElementById('player-picker-modal');
const pickerModalTitle = document.getElementById('picker-modal-title');
const pickerModalSubtitle = document.getElementById('picker-modal-subtitle');
const pickerPlayerSearch = document.getElementById('picker-player-search');
const pickerPlayersList = document.getElementById('picker-players-list');
const btnClosePickerModal = document.getElementById('btn-close-picker-modal');
const btnCancelPicker = document.getElementById('btn-cancel-picker');
const btnUnassignSlot = document.getElementById('btn-unassign-slot');

// حالة التشكيلة الجارية التعديل في الواجهة
let activeLineupState = {
  teamId: null,
  formation: '4-3-3',
  starters: new Array(11).fill(null), // يحتوي على 11 عنصراً: { playerId, role, x, y }
  substitutes: []                     // يحتوي على مصفوفة معرّفات اللاعبين البدلاء [playerId, ...]
};

async function initMatchesManagement() {
  await loadTeamsData();
  await loadMatches();

  if (filterStatusEl) filterStatusEl.addEventListener('change', loadMatches);
  if (btnOpenMatchModal) btnOpenMatchModal.addEventListener('click', openMatchModal);

  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeMatchModal);
  });

  if (matchForm) matchForm.addEventListener('submit', handleMatchCreation);
  if (matchQuickStatsForm) matchQuickStatsForm.addEventListener('submit', handleQuickStatsSubmit);
  if (matchEventForm) matchEventForm.addEventListener('submit', handleEventSubmit);
  if (interactivePitch) interactivePitch.addEventListener('click', handlePitchClick);

  if (eventTeamSelect) {
    eventTeamSelect.addEventListener('change', (e) => populatePlayersDropdownForTeam(e.target.value));
  }

  // تغيير الفريق أو الخطة في التشكيلة
  if (lineupTeamSelect) {
    lineupTeamSelect.addEventListener('change', (e) => loadTeamLineupState(parseInt(e.target.value)));
  }

  if (lineupFormationSelect) {
    lineupFormationSelect.addEventListener('change', (e) => {
      activeLineupState.formation = e.target.value;
      renderSofaScorePitch();
    });
  }

  if (btnAddSubstitute) {
    btnAddSubstitute.addEventListener('click', () => openPlayerPickerForSubstitute());
  }

  if (btnSaveLineup) btnSaveLineup.addEventListener('click', handleSaveLineup);
  if (btnSaveRatings) btnSaveRatings.addEventListener('click', handleSaveRatings);

  document.querySelectorAll('.btn-status-switch').forEach(btn => {
    btn.addEventListener('click', (e) => handleStatusSwitch(e.currentTarget.getAttribute('data-status')));
  });
}

// تهيئة تبديل التبويبات الثلاثة
function initTabsManagement() {
  const tabs = ['tab-events', 'tab-lineups', 'tab-ratings'];
  tabs.forEach(tabId => {
    const btn = document.getElementById(tabId);
    if (btn) {
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          const b = document.getElementById(t);
          if (b) {
            b.classList.remove('active', 'border-brand-accent', 'text-brand-accent');
            b.classList.add('text-slate-400');
          }
        });
        
        btn.classList.add('active', 'border-brand-accent', 'text-brand-accent');
        btn.classList.remove('text-slate-400');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        const targetContentId = `tab-content-${tabId.split('-')[1]}`;
        const targetContent = document.getElementById(targetContentId);
        if (targetContent) targetContent.classList.remove('hidden');

        if (tabId === 'tab-ratings') {
          loadRatingsLists();
        }
      });
    }
  });
}

// تهيئة النافذة المنبثقة لاختيار اللاعبين
function initTacticalPickerModal() {
  if (btnClosePickerModal) btnClosePickerModal.addEventListener('click', closePickerModal);
  if (btnCancelPicker) btnCancelPicker.addEventListener('click', closePickerModal);
  if (btnUnassignSlot) btnUnassignSlot.addEventListener('click', unassignCurrentSlot);

  if (pickerPlayerSearch) {
    pickerPlayerSearch.addEventListener('input', (e) => filterPickerPlayersList(e.target.value.toLowerCase()));
  }
}

// تحميل الفرق
async function loadTeamsData() {
  try {
    const teams = await fetchAPI('/api/teams');
    allTeams = teams || [];
    
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

  document.querySelectorAll('.btn-delete-match').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('هل أنت متأكد من حذف هذه المباراة نهائياً من الأرشيف؟')) {
        try {
          const response = await fetchAPI(`/api/matches/${id}`, 'DELETE');
          if (response && response.success) {
            alert('تم حذف المباراة بنجاح.');
            if (selectedMatchId == id) {
              selectedMatchId = null;
              hideEl(matchPanelActive);
              showEl(matchPanelPlaceholder);
            }
            await loadMatches();
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
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, clearProps: "all" }
    );
  }
}

// تفعيل لوحة الإدارة للمباراة المحددة
async function selectMatchForManagement(matchId) {
  selectedMatchId = matchId;
  
  try {
    hideEl(matchPanelPlaceholder);
    showEl(matchPanelActive);

    const match = await fetchAPI(`/api/matches/${matchId}`);
    activeMatchData = match;

    const homeTeam = allTeams.find(t => t.id === match.homeTeamId) || { name: 'صاحب الأرض' };
    const awayTeam = allTeams.find(t => t.id === match.awayTeamId) || { name: 'الضيف' };

    activeHomeName.textContent = homeTeam.name;
    activeAwayName.textContent = awayTeam.name;

    quickScoreHome.value = match.homeScore ?? 0;
    quickScoreAway.value = match.awayScore ?? 0;
    quickPossHome.value = match.possessionHome ?? 50;
    quickPossAway.value = match.possessionAway ?? 50;

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

    if (lineupTeamSelect) {
      lineupTeamSelect.innerHTML = `
        <option value="">اختر فريقاً لتعديله</option>
        <option value="${match.homeTeamId}">${homeTeam.name} (الأرض)</option>
        <option value="${match.awayTeamId}">${awayTeam.name} (الضيف)</option>
      `;
    }

    if (eventCoordX) eventCoordX.value = '';
    if (eventCoordY) eventCoordY.value = '';
    if (coordinateDot) coordinateDot.classList.add('hidden');

    updateStatusInterface(match.status);

    // جلب التشكيلة الحالية المسجلة للمباراة
    const lineup = await fetchAPI(`/api/matches/${matchId}/lineup`);
    currentMatchLineup = lineup || [];

    renderActiveMatchEvents(match.events || []);

    // اختيار الفريق الأول تلقائياً في التشكيلة
    if (match.homeTeamId) {
      lineupTeamSelect.value = match.homeTeamId;
      await loadTeamLineupState(match.homeTeamId);
    }

    const firstTab = document.getElementById('tab-events');
    if (firstTab) firstTab.click();

  } catch (err) {
    console.error('فشل في جلب تفاصيل المباراة:', err);
    alert('تعذر تفعيل إدارة هذه المباراة حالياً.');
  }
}

// تحميل حالة تشكيلة النادي المختار على الملعب
async function loadTeamLineupState(teamId) {
  if (!teamId) {
    sofascorePitchSlots.innerHTML = '<p class="text-slate-500 text-xs text-center py-24">اختر فريقاً لعرض ملعبه التكتيكي</p>';
    if (lineupSubstitutesContainer) lineupSubstitutesContainer.innerHTML = '';
    return;
  }

  activeLineupState.teamId = teamId;

  try {
    // جلب قائمة كافة لاعبي النادي
    const response = await fetchAPI(`/api/teams/${teamId}`);
    currentTeamRoster = response.players || [];

    // جلب اللاعبين المسجلين مسبقاً لهذا الفريق في هذه المباراة
    const savedTeamRecords = currentMatchLineup.filter(lp => lp.teamId === teamId);

    // إعادة ضبط حالة التشكيلة النشطة
    activeLineupState.starters = new Array(11).fill(null);
    activeLineupState.substitutes = [];

    if (savedTeamRecords.length > 0) {
      // تفقد إذا كان هناك لاعبون أساسيون
      const startingRecords = savedTeamRecords.filter(lp => lp.isStarting);
      const subRecords = savedTeamRecords.filter(lp => !lp.isStarting);

      activeLineupState.substitutes = subRecords.map(s => s.playerId);

      // ربط اللاعبين الأساسيين بالخطط
      const formationSlots = FORMATIONS_LIBRARY[activeLineupState.formation] || FORMATIONS_LIBRARY['4-3-3'];
      
      formationSlots.forEach((slot, index) => {
        if (startingRecords[index]) {
          activeLineupState.starters[index] = {
            playerId: startingRecords[index].playerId,
            role: startingRecords[index].position || slot.role
          };
        }
      });
    }

    renderSofaScorePitch();
    renderSubstitutesBench();

  } catch (err) {
    console.error('خطأ في جلب تشكيلة الفريق للملعب التكتيكي:', err);
  }
}

// رسم الملعب التكتيكي التفاعلي بأسلوب SofaScore
function renderSofaScorePitch() {
  if (!sofascorePitchSlots) return;
  sofascorePitchSlots.innerHTML = '';

  const formation = activeLineupState.formation || '4-3-3';
  const slots = FORMATIONS_LIBRARY[formation] || FORMATIONS_LIBRARY['4-3-3'];

  slots.forEach((slotDef, index) => {
    const assignedStarter = activeLineupState.starters[index];
    const player = assignedStarter ? currentTeamRoster.find(p => p.id === assignedStarter.playerId) : null;

    const slotNode = document.createElement('div');
    slotNode.className = 'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group flex flex-col items-center transition-all duration-300';
    slotNode.style.left = `${slotDef.x}%`;
    slotNode.style.top = `${slotDef.y}%`;

    if (player) {
      // دائرة اللاعب بالصورة واسمه ورقم قميصه (طراز SofaScore)
      slotNode.innerHTML = `
        <div class="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-brand-accent bg-slate-900 p-0.5 shadow-lg flex items-center justify-center group-hover:scale-110 transition duration-200">
          <img src="${player.photoUrl || '/img/default-player.png'}" class="w-full h-full rounded-full object-cover" onerror="this.src='/img/default-player.png'">
          <span class="absolute -bottom-1 -right-1 bg-brand-accent text-brand-dark text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 shadow">
            ${player.jerseyNumber}
          </span>
        </div>
        <div class="mt-1 bg-slate-950/90 backdrop-blur-sm border border-slate-800 px-2 py-0.5 rounded-full text-center shadow">
          <p class="text-[10px] font-bold text-white truncate max-w-[70px] leading-tight">${player.name.split(' ').pop()}</p>
          <span class="text-[8px] font-extrabold text-brand-accent uppercase tracking-tighter">${slotDef.role}</span>
        </div>
      `;
    } else {
      // مركز فارغ قابل للتعيين
      slotNode.innerHTML = `
        <div class="w-10 h-10 rounded-full border-2 border-dashed border-emerald-400/60 bg-emerald-950/70 hover:bg-emerald-800/80 hover:border-brand-accent transition duration-200 flex items-center justify-center text-emerald-300 shadow-md">
          <i class="fa-solid fa-plus text-xs group-hover:scale-125 transition"></i>
        </div>
        <div class="mt-1 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded-full text-center">
          <span class="text-[9px] font-bold text-emerald-300 uppercase">${slotDef.role}</span>
        </div>
      `;
    }

    slotNode.addEventListener('click', () => {
      openPlayerPickerForSlot(index, slotDef);
    });

    sofascorePitchSlots.appendChild(slotNode);
  });
}

// عرض شريط مقاعد البدلاء
function renderSubstitutesBench() {
  if (!lineupSubstitutesContainer) return;
  lineupSubstitutesContainer.innerHTML = '';

  if (activeLineupState.substitutes.length === 0) {
    lineupSubstitutesContainer.innerHTML = '<span class="text-slate-600 text-xs">لا يوجد لاعبين بدلاء معينين حالياً. انقر على "+ تعيين بديل" للإضافة.</span>';
    return;
  }

  activeLineupState.substitutes.forEach(subPlayerId => {
    const player = currentTeamRoster.find(p => p.id === subPlayerId);
    if (!player) return;

    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg text-xs';
    chip.innerHTML = `
      <span class="font-mono text-brand-accent font-bold">#${player.jerseyNumber}</span>
      <span class="text-slate-200 font-semibold">${player.name}</span>
      <button type="button" class="btn-remove-sub text-slate-500 hover:text-red-400 mr-1" data-id="${player.id}">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    `;

    chip.querySelector('.btn-remove-sub').addEventListener('click', (e) => {
      e.stopPropagation();
      activeLineupState.substitutes = activeLineupState.substitutes.filter(id => id !== player.id);
      renderSubstitutesBench();
    });

    lineupSubstitutesContainer.appendChild(chip);
  });
}

// فتح النافذة المنبثقة لاختيار لاعب لمركز أساسي في الملعب
function openPlayerPickerForSlot(slotIndex, slotDef) {
  activeSlotIndex = slotIndex;
  isSubstituteMode = false;

  if (pickerModalTitle) pickerModalTitle.textContent = `تعيين لاعب لمركز: ${slotDef.label} (${slotDef.role})`;
  if (pickerModalSubtitle) pickerModalSubtitle.textContent = `خطة المباراة: ${activeLineupState.formation}`;
  if (btnUnassignSlot) btnUnassignSlot.classList.remove('hidden');

  renderPickerPlayersList();
  openPickerModal();
}

// فتح النافذة المنبثقة لاختيار لاعب بديل
function openPlayerPickerForSubstitute() {
  isSubstituteMode = true;
  activeSlotIndex = null;

  if (pickerModalTitle) pickerModalTitle.textContent = 'تعيين لاعب لمقاعد البدلاء';
  if (pickerModalSubtitle) pickerModalSubtitle.textContent = 'اختر لاعباً من القائمة لإضافته كبديل';
  if (btnUnassignSlot) btnUnassignSlot.classList.add('hidden');

  renderPickerPlayersList();
  openPickerModal();
}

// تعبئة قائمة اللاعبين في المودال التفاعلي
function renderPickerPlayersList(filterText = '') {
  if (!pickerPlayersList) return;
  pickerPlayersList.innerHTML = '';

  if (currentTeamRoster.length === 0) {
    pickerPlayersList.innerHTML = '<p class="text-slate-500 text-xs text-center py-4">لم يتم العثور على لاعبي لهذا النادي.</p>';
    return;
  }

  const assignedStarterIds = activeLineupState.starters.filter(Boolean).map(s => s.playerId);
  const assignedSubIds = activeLineupState.substitutes;

  currentTeamRoster.forEach(player => {
    if (filterText && !player.name.toLowerCase().includes(filterText) && !player.jerseyNumber.toString().includes(filterText)) {
      return;
    }

    const isStarter = assignedStarterIds.includes(player.id);
    const isSub = assignedSubIds.includes(player.id);

    let badgeText = '';
    if (isStarter) badgeText = '<span class="text-[9px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded font-bold">أساسي</span>';
    else if (isSub) badgeText = '<span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">بديل</span>';

    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 cursor-pointer transition';
    item.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="w-6 h-6 rounded bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-xs font-bold text-slate-300">
          ${player.jerseyNumber}
        </span>
        <img src="${player.photoUrl || '/img/default-player.png'}" class="w-7 h-7 rounded-full object-cover bg-slate-950" onerror="this.src='/img/default-player.png'">
        <div>
          <p class="text-xs font-bold text-white leading-tight">${player.name}</p>
          <span class="text-[9px] text-slate-400">${player.position || 'لاعب'}</span>
        </div>
      </div>
      <div>${badgeText}</div>
    `;

    item.addEventListener('click', () => {
      selectPlayerInPicker(player.id);
    });

    pickerPlayersList.appendChild(item);
  });
}

function filterPickerPlayersList(text) {
  renderPickerPlayersList(text);
}

// اختيار لاعب وتعيينه في المركز المختار بالملعب أو البدلاء
function selectPlayerInPicker(playerId) {
  // إزالة اللاعب إذا كان معيناً في مركز آخر لعدم التكرار
  activeLineupState.starters = activeLineupState.starters.map(s => (s && s.playerId === playerId) ? null : s);
  activeLineupState.substitutes = activeLineupState.substitutes.filter(id => id !== playerId);

  if (isSubstituteMode) {
    activeLineupState.substitutes.push(playerId);
    renderSubstitutesBench();
  } else if (activeSlotIndex !== null) {
    const formationSlots = FORMATIONS_LIBRARY[activeLineupState.formation] || FORMATIONS_LIBRARY['4-3-3'];
    const currentSlotDef = formationSlots[activeSlotIndex];
    
    activeLineupState.starters[activeSlotIndex] = {
      playerId: playerId,
      role: currentSlotDef ? currentSlotDef.role : 'CM'
    };
    renderSofaScorePitch();
  }

  closePickerModal();
}

// تفريغ المركز
function unassignCurrentSlot() {
  if (activeSlotIndex !== null) {
    activeLineupState.starters[activeSlotIndex] = null;
    renderSofaScorePitch();
  }
  closePickerModal();
}

function openPickerModal() {
  if (!playerPickerModal) return;
  if (pickerPlayerSearch) pickerPlayerSearch.value = '';
  playerPickerModal.classList.remove('hidden');
  setTimeout(() => {
    playerPickerModal.classList.add('opacity-100');
    const transformEl = playerPickerModal.querySelector('.transform');
    if (transformEl) transformEl.classList.remove('scale-95');
  }, 10);
}

function closePickerModal() {
  if (!playerPickerModal) return;
  playerPickerModal.classList.remove('opacity-100');
  const transformEl = playerPickerModal.querySelector('.transform');
  if (transformEl) transformEl.classList.add('scale-95');
  setTimeout(() => {
    playerPickerModal.classList.add('hidden');
  }, 300);
}

// حفظ التشكيلة بالكامل لقاعدة البيانات
async function handleSaveLineup() {
  if (!selectedMatchId || !activeMatchData || !activeLineupState.teamId) {
    alert('الرجاء اختيار النادي وضبط تشكيلته أولاً.');
    return;
  }

  const teamId = activeLineupState.teamId;
  const isHome = (teamId === activeMatchData.homeTeamId);
  const formationSlots = FORMATIONS_LIBRARY[activeLineupState.formation] || FORMATIONS_LIBRARY['4-3-3'];

  const selectedTeamRecords = [];

  // 1. معالجة الأساسيين
  activeLineupState.starters.forEach((starter, index) => {
    if (starter && starter.playerId) {
      const slotDef = formationSlots[index] || { role: 'CM', x: 50, y: 50 };
      
      // تحويل الإحداثيات العمودية بالملعب التكتيكي لمتغير x,y متوافق مع المخطط المائل
      let coords = { x: slotDef.x, y: slotDef.y };
      if (!isHome) {
        coords = { x: 100 - slotDef.x, y: 100 - slotDef.y };
      }

      selectedTeamRecords.push({
        teamId: teamId,
        playerId: starter.playerId,
        isStarting: true,
        position: starter.role || slotDef.role,
        positionX: coords.x,
        positionY: coords.y,
        rating: 6.0
      });
    }
  });

  // 2. معالجة البدلاء
  activeLineupState.substitutes.forEach(subPlayerId => {
    selectedTeamRecords.push({
      teamId: teamId,
      playerId: subPlayerId,
      isStarting: false,
      position: 'SUB',
      positionX: null,
      positionY: null,
      rating: 6.0
    });
  });

  // الحفاظ على تشكيلة الفريق الآخر دون مساس
  const otherTeamRecords = currentMatchLineup
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
      alert('تم حفظ وتحديث التشكيلة التكتيكية للنادي بنجاح!');
      currentMatchLineup = result.lineup || [];
    }
  } catch (err) {
    console.error('فشل في حفظ التشكيلة التكتيكية:', err);
    alert('حدث خطأ أثناء حفظ التشكيلة.');
  }
}

// جلب وتعبئة التقييمات
async function loadRatingsLists() {
  if (!ratingsHomeList || !ratingsAwayList || !selectedMatchId || !activeMatchData) return;

  try {
    ratingsHomeList.innerHTML = '<p class="text-slate-500 text-xs">جاري تحميل التشكيلة...</p>';
    ratingsAwayList.innerHTML = '<p class="text-slate-500 text-xs">جاري تحميل التشكيلة...</p>';

    const homeTeam = allTeams.find(t => t.id === activeMatchData.homeTeamId) || { name: 'صاحب الأرض' };
    const awayTeam = allTeams.find(t => t.id === activeMatchData.awayTeamId) || { name: 'الضيف' };
    
    if (ratingHomeTitle) ratingHomeTitle.innerHTML = `<span class="w-2 h-2 rounded bg-brand-accent"></span> تقييمات لاعبي: ${homeTeam.name}`;
    if (ratingAwayTitle) ratingAwayTitle.innerHTML = `<span class="w-2 h-2 rounded bg-slate-500"></span> تقييمات لاعبي: ${awayTeam.name}`;

    const lineup = await fetchAPI(`/api/matches/${selectedMatchId}/lineup`);
    currentMatchLineup = lineup || [];

    const homePlayers = currentMatchLineup.filter(lp => lp.teamId === activeMatchData.homeTeamId);
    const awayPlayers = currentMatchLineup.filter(lp => lp.teamId === activeMatchData.awayTeamId);

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

// حفظ التقييمات
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
      await loadRatingsLists();
    }
  } catch (err) {
    console.error('فشل في حفظ التقييمات الرقمية:', err);
    alert('فشل حفظ وتحديث التقييمات.');
  }
}

// تحديث الواجهة لحالة المباراة
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
      await loadMatches();
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

// التقاط النقرات على مخطط الأحداث
function handlePitchClick(e) {
  if (!interactivePitch) return;

  const rect = interactivePitch.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const percentX = Math.round((clickX / rect.width) * 100);
  const percentY = Math.round((clickY / rect.height) * 100);

  if (eventCoordX) eventCoordX.value = percentX;
  if (eventCoordY) eventCoordY.value = percentY;

  if (coordinateDot) {
    coordinateDot.style.left = `${percentX}%`;
    coordinateDot.style.top = `${percentY}%`;
    coordinateDot.classList.remove('hidden');
  }
}

// حفظ بيانات النتيجة العامة
async function handleQuickStatsSubmit(e) {
  e.preventDefault();
  if (!selectedMatchId) return;

  const payload = {
    homeScore: parseInt(quickScoreHome.value),
    awayScore: parseInt(quickScoreAway.value),
    status: activeMatchData.status,
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

// إرسال وتسجيل حدث المباراة
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
      eventPlayerSelect.value = '';
      eventCoordX.value = '';
      eventCoordY.value = '';
      if (coordinateDot) coordinateDot.classList.add('hidden');

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

// النوافذ المنبثقة
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

function showEl(el) { if (el) el.classList.remove('hidden'); }
function hideEl(el) { if (el) el.classList.add('hidden'); }
