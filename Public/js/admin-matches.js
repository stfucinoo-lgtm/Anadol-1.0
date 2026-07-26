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
  initSinglePlayerStatModal();
});

let allMatches = [];
let allTeams = [];
let selectedMatchId = null;
let activeMatchData = null;
let currentMatchLineup = [];
let currentTeamRoster = [];
let activeSlotIndex = null;
let isSubstituteMode = false;

// مكتبة الإحداثيات والخطط التكتيكية المتقدمة
const FORMATIONS_LIBRARY = {
  '4-3-3': [
    { role: 'GK', label: 'حارس', x: 50, y: 90 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 68 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 68 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 68 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 68 },
    { role: 'CM', label: 'وسط أيسر', x: 28, y: 44 },
    { role: 'DM', label: 'وسط دفاعي', x: 50, y: 50 },
    { role: 'CM', label: 'وسط أيمن', x: 72, y: 44 },
    { role: 'LW', label: 'جناح أيسر', x: 20, y: 20 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 16 },
    { role: 'RW', label: 'جناح أيمن', x: 80, y: 20 }
  ],
  '4-2-3-1': [
    { role: 'GK', label: 'حارس', x: 50, y: 90 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 68 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 68 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 68 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 68 },
    { role: 'DM', label: 'محور أيسر', x: 35, y: 52 },
    { role: 'DM', label: 'محور أيمن', x: 65, y: 52 },
    { role: 'LAM', label: 'جناح أيسر', x: 20, y: 34 },
    { role: 'CAM', label: 'صانع ألعاب', x: 50, y: 32 },
    { role: 'RAM', label: 'جناح أيمن', x: 80, y: 34 },
    { role: 'ST', label: 'مهاجم صريح', x: 50, y: 16 }
  ],
  '4-4-2': [
    { role: 'GK', label: 'حارس', x: 50, y: 90 },
    { role: 'LB', label: 'ظهير أيسر', x: 16, y: 68 },
    { role: 'CB', label: 'دفاع أيسر', x: 38, y: 68 },
    { role: 'CB', label: 'دفاع أيمن', x: 62, y: 68 },
    { role: 'RB', label: 'ظهير أيمن', x: 84, y: 68 },
    { role: 'LM', label: 'وسط أيسر', x: 16, y: 44 },
    { role: 'CM', label: 'وسط أيسر', x: 38, y: 46 },
    { role: 'CM', label: 'وسط أيمن', x: 62, y: 46 },
    { role: 'RM', label: 'وسط أيمن', x: 84, y: 44 },
    { role: 'ST', label: 'مهاجم أيسر', x: 38, y: 18 },
    { role: 'ST', label: 'مهاجم أيمن', x: 62, y: 18 }
  ],
  '3-5-2': [
    { role: 'GK', label: 'حارس', x: 50, y: 90 },
    { role: 'CB', label: 'دفاع أيسر', x: 25, y: 68 },
    { role: 'CB', label: 'دفاع أوسط', x: 50, y: 70 },
    { role: 'CB', label: 'دفاع أيمن', x: 75, y: 68 },
    { role: 'LWB', label: 'جناح أيسر', x: 12, y: 46 },
    { role: 'CM', label: 'وسط أيسر', x: 32, y: 48 },
    { role: 'DM', label: 'وسط ارتكاز', x: 50, y: 48 },
    { role: 'CM', label: 'وسط أيمن', x: 68, y: 48 },
    { role: 'RWB', label: 'جناح أيمن', x: 88, y: 46 },
    { role: 'ST', label: 'مهاجم أيسر', x: 38, y: 18 },
    { role: 'ST', label: 'مهاجم أيمن', x: 62, y: 18 }
  ]
};

// عناصر الواجهة
const matchesLoadingEl = document.getElementById('matches-loading');
const matchesEmptyEl = document.getElementById('matches-empty');
const matchesListEl = document.getElementById('matches-list');
const filterStatusEl = document.getElementById('filter-status');

const btnOpenMatchModal = document.getElementById('btn-open-match-modal');
const matchModal = document.getElementById('match-modal');
const matchForm = document.getElementById('match-form');
const selectHomeTeam = document.getElementById('match-home-team');
const selectAwayTeam = document.getElementById('match-away-team');

const matchPanelPlaceholder = document.getElementById('match-panel-placeholder');
const matchPanelActive = document.getElementById('match-panel-active');
const activeMatchStatusBadge = document.getElementById('active-match-status-badge');
const activeHomeName = document.getElementById('active-home-name');
const activeAwayName = document.getElementById('active-away-name');

const matchQuickStatsForm = document.getElementById('match-quick-stats-form');
const quickScoreHome = document.getElementById('quick-score-home');
const quickScoreAway = document.getElementById('quick-score-away');

const fullMatchStatsForm = document.getElementById('full-match-stats-form');

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

const lineupTeamSelect = document.getElementById('lineup-team-select');
const lineupFormationSelect = document.getElementById('lineup-formation-select');
const sofascorePitchSlots = document.getElementById('sofascore-pitch-slots');
const lineupSubstitutesContainer = document.getElementById('lineup-substitutes-container');
const btnAddSubstitute = document.getElementById('btn-add-substitute');
const btnSaveLineup = document.getElementById('btn-save-lineup');
const ratingsHomeList = document.getElementById('ratings-home-list');
const ratingsAwayList = document.getElementById('ratings-away-list');
const ratingHomeTitle = document.getElementById('rating-home-title');
const ratingAwayTitle = document.getElementById('rating-away-title');

// عناصر نافذة إحصائيات اللاعب الفردية
const playerSingleStatModal = document.getElementById('player-single-stat-modal');
const btnCloseSingleStatModal = document.getElementById('btn-close-single-stat-modal');
const btnCancelSingleStat = document.getElementById('btn-cancel-single-stat');
const formSinglePlayerStat = document.getElementById('form-single-player-stat');

let activeLineupState = {
  teamId: null,
  formation: '4-3-3',
  starters: new Array(11).fill(null),
  substitutes: []
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
  if (fullMatchStatsForm) fullMatchStatsForm.addEventListener('submit', handleFullStatsSubmit);
  if (matchEventForm) matchEventForm.addEventListener('submit', handleEventSubmit);
  if (interactivePitch) interactivePitch.addEventListener('click', handlePitchClick);

  if (eventTeamSelect) {
    eventTeamSelect.addEventListener('change', (e) => populatePlayersDropdownForTeam(e.target.value));
  }

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

  document.querySelectorAll('.btn-status-switch').forEach(btn => {
    btn.addEventListener('click', (e) => handleStatusSwitch(e.currentTarget.getAttribute('data-status')));
  });
}

function initTabsManagement() {
  const tabs = ['tab-events', 'tab-stats', 'tab-lineups', 'tab-ratings'];
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

function initTacticalPickerModal() {
  const btnClosePickerModal = document.getElementById('btn-close-picker-modal');
  const btnCancelPicker = document.getElementById('btn-cancel-picker');
  const btnUnassignSlot = document.getElementById('btn-unassign-slot');

  if (btnClosePickerModal) btnClosePickerModal.addEventListener('click', closePickerModal);
  if (btnCancelPicker) btnCancelPicker.addEventListener('click', closePickerModal);
  if (btnUnassignSlot) btnUnassignSlot.addEventListener('click', unassignCurrentSlot);
}

function initSinglePlayerStatModal() {
  if (btnCloseSingleStatModal) btnCloseSingleStatModal.addEventListener('click', closeSingleStatModal);
  if (btnCancelSingleStat) btnCancelSingleStat.addEventListener('click', closeSingleStatModal);

  if (formSinglePlayerStat) {
    formSinglePlayerStat.addEventListener('submit', handleSaveSinglePlayerStat);
  }
}

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

async function loadMatches() {
  try {
    showEl(matchesLoadingEl);
    hideEl(matchesListEl);
    hideEl(matchesEmptyEl);

    const statusFilter = filterStatusEl ? filterStatusEl.value : 'all';
    let url = '/api/matches';
    if (statusFilter !== 'all') url += `?status=${statusFilter}`;

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
  }
}

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
    btn.addEventListener('click', (e) => selectMatchForManagement(e.currentTarget.getAttribute('data-id')));
  });

  document.querySelectorAll('.btn-delete-match').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('هل أنت متأكد من حذف هذه المباراة نهائياً من الأرشيف؟')) {
        try {
          const res = await fetchAPI(`/api/matches/${id}`, 'DELETE');
          if (res && res.success) {
            alert('تم حذف المباراة بنجاح.');
            if (selectedMatchId == id) {
              selectedMatchId = null;
              hideEl(matchPanelActive);
              showEl(matchPanelPlaceholder);
            }
            await loadMatches();
          }
        } catch (err) { alert('فشل حذف المباراة.'); }
      }
    });
  });
}

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

    if (eventTeamSelect) {
      eventTeamSelect.innerHTML = `
        <option value="">اختر الفريق</option>
        <option value="${match.homeTeamId}">${homeTeam.name}</option>
        <option value="${match.awayTeamId}">${awayTeam.name}</option>
      `;
    }

    if (lineupTeamSelect) {
      lineupTeamSelect.innerHTML = `
        <option value="">اختر فريقاً لتعديله</option>
        <option value="${match.homeTeamId}">${homeTeam.name} (الأرض)</option>
        <option value="${match.awayTeamId}">${awayTeam.name} (الضيف)</option>
      `;
    }

    updateStatusInterface(match.status);

    const lineup = await fetchAPI(`/api/matches/${matchId}/lineup`);
    currentMatchLineup = lineup || [];

    renderActiveMatchEvents(match.events || []);

    if (match.homeTeamId) {
      lineupTeamSelect.value = match.homeTeamId;
      await loadTeamLineupState(match.homeTeamId);
    }

    const firstTab = document.getElementById('tab-events');
    if (firstTab) firstTab.click();

  } catch (err) {
    console.error('فشل في جلب تفاصيل المباراة:', err);
  }
}

async function loadRatingsLists() {
  if (!ratingsHomeList || !ratingsAwayList || !selectedMatchId || !activeMatchData) return;

  try {
    const homeTeam = allTeams.find(t => t.id === activeMatchData.homeTeamId) || { name: 'صاحب الأرض' };
    const awayTeam = allTeams.find(t => t.id === activeMatchData.awayTeamId) || { name: 'الضيف' };
    
    if (ratingHomeTitle) ratingHomeTitle.innerHTML = `<span class="w-2 h-2 rounded bg-brand-accent"></span> لاعبي: ${homeTeam.name}`;
    if (ratingAwayTitle) ratingAwayTitle.innerHTML = `<span class="w-2 h-2 rounded bg-slate-500"></span> لاعبي: ${awayTeam.name}`;

    const lineup = await fetchAPI(`/api/matches/${selectedMatchId}/lineup`);
    currentMatchLineup = lineup || [];

    const homePlayers = currentMatchLineup.filter(lp => lp.teamId === activeMatchData.homeTeamId);
    const awayPlayers = currentMatchLineup.filter(lp => lp.teamId === activeMatchData.awayTeamId);

    const renderPlayerItem = (p) => {
      const playerName = p.player ? p.player.name : 'لاعب غير معروف';
      const roleText = p.isStarting ? 'أساسي' : 'بديل';
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-2 bg-slate-900/80 rounded-lg border border-slate-800 hover:border-brand-accent transition';
      item.innerHTML = `
        <div class="flex flex-col">
          <span class="text-xs font-semibold text-slate-200">${playerName}</span>
          <span class="text-[9px] text-slate-400">${roleText} | تقييم: <strong class="text-brand-accent">${p.rating ?? 7.0}</strong></span>
        </div>
        <button type="button" class="btn-edit-player-stat bg-brand-accent hover:bg-brand-accentHover text-brand-dark px-3 py-1 rounded text-[11px] font-bold transition flex items-center gap-1" data-player-id="${p.playerId}">
          <i class="fa-solid fa-pen-to-square"></i> إحصائيات
        </button>
      `;

      item.querySelector('.btn-edit-player-stat').addEventListener('click', () => {
        openSinglePlayerStatModal(p);
      });

      return item;
    };

    ratingsHomeList.innerHTML = '';
    if (homePlayers.length === 0) ratingsHomeList.innerHTML = '<p class="text-slate-600 text-xs py-2">لا يوجد لاعبين في التشكيلة.</p>';
    else homePlayers.forEach(p => ratingsHomeList.appendChild(renderPlayerItem(p)));

    ratingsAwayList.innerHTML = '';
    if (awayPlayers.length === 0) ratingsAwayList.innerHTML = '<p class="text-slate-600 text-xs py-2">لا يوجد لاعبين في التشكيلة.</p>';
    else awayPlayers.forEach(p => ratingsAwayList.appendChild(renderPlayerItem(p)));

  } catch (err) {
    console.error('خطأ أثناء جلب قائمة تقييمات اللاعبين:', err);
  }
}

function openSinglePlayerStatModal(matchPlayerRecord) {
  if (!playerSingleStatModal) return;

  const player = matchPlayerRecord.player || {};
  const stats = matchPlayerRecord.stats || {};

  document.getElementById('edit-player-id').value = matchPlayerRecord.playerId;
  document.getElementById('stat-modal-player-name').textContent = `إحصائيات: ${player.name || 'اللاعب'}`;
  document.getElementById('mstat-rating').value = matchPlayerRecord.rating || 7.5;

  document.getElementById('mstat-minutes').value = stats.minutes || (matchPlayerRecord.isStarting ? 90 : 30);
  document.getElementById('mstat-goals').value = stats.goals || 0;
  document.getElementById('mstat-assists').value = stats.assists || 0;
  document.getElementById('mstat-touches').value = stats.touches || 30;
  document.getElementById('mstat-speed').value = stats.avgSpeed || '13.5 km/h';
  document.getElementById('mstat-dribble-dist').value = stats.dribbleDist || '12.0 m';
  document.getElementById('mstat-shots').value = stats.shots || '2 (1)';
  document.getElementById('mstat-passes').value = stats.passes || '20 (16)';
  document.getElementById('mstat-tackles').value = stats.tackles || '3 (2)';
  document.getElementById('mstat-interceptions').value = stats.interceptions || 3;
  document.getElementById('mstat-crosses').value = stats.crosses || 2;

  playerSingleStatModal.classList.remove('hidden');
  setTimeout(() => {
    playerSingleStatModal.classList.add('opacity-100');
    playerSingleStatModal.querySelector('.transform').classList.remove('scale-95');
  }, 10);
}

function closeSingleStatModal() {
  if (!playerSingleStatModal) return;
  playerSingleStatModal.classList.remove('opacity-100');
  playerSingleStatModal.querySelector('.transform').classList.add('scale-95');
  setTimeout(() => {
    playerSingleStatModal.classList.add('hidden');
  }, 300);
}

async function handleSaveSinglePlayerStat(e) {
  e.preventDefault();
  if (!selectedMatchId) return;

  const playerId = parseInt(document.getElementById('edit-player-id').value);
  const rating = parseFloat(document.getElementById('mstat-rating').value);

  const statsPayload = {
    minutes: parseInt(document.getElementById('mstat-minutes').value) || 90,
    goals: parseInt(document.getElementById('mstat-goals').value) || 0,
    assists: parseInt(document.getElementById('mstat-assists').value) || 0,
    touches: parseInt(document.getElementById('mstat-touches').value) || 30,
    avgSpeed: document.getElementById('mstat-speed').value || '13.5 km/h',
    dribbleDist: document.getElementById('mstat-dribble-dist').value || '12.0 m',
    shots: document.getElementById('mstat-shots').value || '2 (1)',
    passes: document.getElementById('mstat-passes').value || '20 (16)',
    tackles: document.getElementById('mstat-tackles').value || '3 (2)',
    interceptions: parseInt(document.getElementById('mstat-interceptions').value) || 0,
    crosses: parseInt(document.getElementById('mstat-crosses').value) || 0
  };

  try {
    const result = await fetchAPI(`/api/matches/${selectedMatchId}/player-stats`, 'PUT', {
      playerId,
      rating,
      stats: statsPayload
    });

    if (result && result.success) {
      alert('تم حفظ الإحصائيات الفردية للاعب بنجاح وتحديث ملفه الشخصي!');
      closeSingleStatModal();
      await loadRatingsLists();
    }
  } catch (err) {
    console.error('خطأ أثناء حفظ الإحصائيات الفردية للاعب:', err);
    alert('فشل حفظ الإحصائيات الفردية.');
  }
}

async function loadTeamLineupState(teamId) {
  if (!teamId) return;
  activeLineupState.teamId = teamId;

  try {
    const response = await fetchAPI(`/api/teams/${teamId}`);
    currentTeamRoster = response.players || [];
    renderSofaScorePitch();
    renderSubstitutesBench();
  } catch (err) { console.error('خطأ في جلب التشكيلة:', err); }
}

function renderSofaScorePitch() {
  if (!sofascorePitchSlots) return;
  sofascorePitchSlots.innerHTML = '';

  const formation = activeLineupState.formation || '4-3-3';
  const slots = FORMATIONS_LIBRARY[formation] || FORMATIONS_LIBRARY['4-3-3'];

  slots.forEach((slotDef, index) => {
    const assignedStarter = activeLineupState.starters[index];
    const player = assignedStarter ? currentTeamRoster.find(p => p.id === assignedStarter.playerId) : null;

    const slotNode = document.createElement('div');
    slotNode.className = 'absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center select-none z-10';
    slotNode.style.left = `${slotDef.x}%`;
    slotNode.style.top = `${slotDef.y}%`;

    if (player) {
      slotNode.innerHTML = `
        <div class="relative w-10 h-10 rounded-full border-2 border-brand-accent bg-slate-900 p-0.5 shadow-xl flex items-center justify-center">
          <img src="${player.photoUrl || '/img/default-player.png'}" class="w-full h-full rounded-full object-cover" onerror="this.src='/img/default-player.png'">
        </div>
        <div class="mt-1 text-center font-bold text-[10px] text-white">${player.name}</div>
      `;
    } else {
      slotNode.innerHTML = `
        <div class="w-9 h-9 rounded-full border-2 border-dashed border-emerald-400/60 bg-emerald-950/70 hover:bg-emerald-800 transition flex items-center justify-center text-emerald-300">
          <i class="fa-solid fa-plus text-xs"></i>
        </div>
        <div class="mt-1 text-center font-bold text-[9px] text-emerald-300">${slotDef.role}</div>
      `;
    }

    sofascorePitchSlots.appendChild(slotNode);
  });
}

function renderSubstitutesBench() {
  if (!lineupSubstitutesContainer) return;
  lineupSubstitutesContainer.innerHTML = '';
}

function closePickerModal() {}
function openPlayerPickerForSubstitute() {}
function unassignCurrentSlot() {}

async function handleSaveLineup() {}
async function handleQuickStatsSubmit(e) { e.preventDefault(); }
async function handleFullStatsSubmit(e) { e.preventDefault(); }
async function handleEventSubmit(e) { e.preventDefault(); }
function handlePitchClick() {}
function updateStatusInterface() {}
async function handleStatusSwitch() {}
async function populatePlayersDropdownForTeam() {}
function renderActiveMatchEvents() {}
function openMatchModal() { if (matchModal) matchModal.classList.remove('hidden'); }
function closeMatchModal() { if (matchModal) matchModal.classList.add('hidden'); }
async function handleMatchCreation(e) { e.preventDefault(); }

function showEl(el) { if (el) el.classList.remove('hidden'); }
function hideEl(el) { if (el) el.classList.add('hidden'); }
