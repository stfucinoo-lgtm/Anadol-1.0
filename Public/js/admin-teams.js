// حماية الصفحة والتحقق من هوية وصلاحية المستخدم كـ admin
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  if (!token || user.role !== 'admin') {
    // توجيه الزوار غير المصرح لهم إلى صفحة الدخول
    window.location.href = '/admin/login.html';
    return;
  }

  // عرض اسم المستخدم في واجهة الإدارة
  const adminUsernameEl = document.getElementById('admin-username');
  if (adminUsernameEl && user.username) {
    adminUsernameEl.textContent = user.username;
    const userBadge = document.getElementById('admin-user-badge');
    if (userBadge) {
      userBadge.classList.remove('hidden');
    }
  }

  // تهيئة الإعدادات وجلب البيانات الأولية
  initTeamManagement();
});

let allTeams = [];
let selectedTeamId = null;

// عناصر الواجهة الرئيسية
const teamsLoadingEl = document.getElementById('teams-loading');
const teamsEmptyEl = document.getElementById('teams-empty');
const teamsGridEl = document.getElementById('teams-grid');
const teamsCountEl = document.getElementById('teams-count');

// أزرار ونماذج الفرق
const btnOpenTeamModal = document.getElementById('btn-open-team-modal');
const teamModal = document.getElementById('team-modal');
const teamForm = document.getElementById('team-form');
const teamIdInput = document.getElementById('team-id-input');
const teamModalTitle = document.getElementById('team-modal-title');
const teamColorPicker = document.getElementById('team-color-picker');
const teamColorInput = document.getElementById('team-color');

// عناصر إدارة اللاعبين في الجزء الأيسر
const playerPanelPlaceholder = document.getElementById('player-panel-placeholder');
const playerPanelActive = document.getElementById('player-panel-active');
const selectedTeamCrest = document.getElementById('selected-team-crest');
const selectedTeamName = document.getElementById('selected-team-name');
const selectedTeamYear = document.getElementById('selected-team-year');
const selectedTeamStadium = document.getElementById('selected-team-stadium');
const selectedTeamColor = document.getElementById('selected-team-color');

const playersLoadingEl = document.getElementById('players-loading');
const playersEmptyEl = document.getElementById('players-empty');
const playersListEl = document.getElementById('players-list');

// أزرار ونماذج اللاعبين
const btnOpenPlayerModal = document.getElementById('btn-open-player-modal');
const playerModal = document.getElementById('player-modal');
const playerForm = document.getElementById('player-form');
const playerIdInput = document.getElementById('player-id-input');
const playerModalTitle = document.getElementById('player-modal-title');

function initTeamManagement() {
  loadTeams();

  // ربط أحداث النوافذ المنبثقة للفرق
  if (btnOpenTeamModal) {
    btnOpenTeamModal.addEventListener('click', () => openTeamModal());
  }

  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeTeamModal);
  });

  // مزامنة حقل اللون المختار مع منتقي الألوان
  if (teamColorPicker && teamColorInput) {
    teamColorPicker.addEventListener('input', (e) => {
      teamColorInput.value = e.target.value;
    });
    teamColorInput.addEventListener('change', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        teamColorPicker.value = e.target.value;
      }
    });
  }

  // معالجة إرسال نموذج الفريق
  if (teamForm) {
    teamForm.addEventListener('submit', handleTeamSubmit);
  }

  // ربط أحداث النوافذ المنبثقة للاعبين
  if (btnOpenPlayerModal) {
    btnOpenPlayerModal.addEventListener('click', () => openPlayerModal());
  }

  document.querySelectorAll('.btn-close-player-modal').forEach(btn => {
    btn.addEventListener('click', closePlayerModal);
  });

  // معالجة إرسال نموذج اللاعبين
  if (playerForm) {
    playerForm.addEventListener('submit', handlePlayerSubmit);
  }
}

// جلب الفرق من الخادم
async function loadTeams() {
  try {
    showEl(teamsLoadingEl);
    hideEl(teamsGridEl);
    hideEl(teamsEmptyEl);

    const response = await api.get('/teams');
    allTeams = response || [];
    if (teamsCountEl) {
      teamsCountEl.textContent = allTeams.length;
    }

    if (allTeams.length === 0) {
      hideEl(teamsLoadingEl);
      showEl(teamsEmptyEl);
      return;
    }

    renderTeamsGrid(allTeams);
    hideEl(teamsLoadingEl);
    showEl(teamsGridEl);
  } catch (error) {
    console.error('حدث خطأ أثناء جلب قائمة الفرق:', error);
    alert('تعذر جلب قائمة الفرق من الخادم.');
  }
}

// عرض الفرق في الشبكة
function renderTeamsGrid(teams) {
  if (!teamsGridEl) return;
  teamsGridEl.innerHTML = '';

  teams.forEach(team => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-4 team-card-item hover:border-slate-700 transition duration-150';
    card.style.borderRight = `4px solid ${team.primaryColor || '#f59e0b'}`;

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <img src="${team.crestUrl || '/img/default-crest.png'}" alt="شعار ${team.name}" class="w-12 h-12 object-contain rounded-md bg-slate-950/60 p-1">
          <div>
            <h3 class="font-bold text-white text-sm leading-snug">${team.name}</h3>
            <p class="text-xs text-slate-400 mt-0.5">${team.stadium || 'دون ملعب رسمي'}</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button class="btn-edit-team text-slate-400 hover:text-brand-accent p-1.5 transition" title="تعديل بيانات الفريق" data-id="${team.id}">
            <i class="fa-solid fa-pen text-xs"></i>
          </button>
          <button class="btn-delete-team text-slate-400 hover:text-brand-danger p-1.5 transition" title="حذف الفريق" data-id="${team.id}">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
      <div class="flex items-center justify-between pt-3 border-t border-slate-800/60">
        <span class="text-[10px] text-slate-500">تأسس عام: ${team.foundedYear || '-'}</span>
        <button class="btn-manage-players bg-brand-card hover:bg-slate-800 text-slate-300 hover:text-brand-accent px-3 py-1.5 rounded-lg text-xs font-semibold transition" data-id="${team.id}">
          <i class="fa-solid fa-users text-xs mr-1"></i> إدارة اللاعبين
        </button>
      </div>
    `;

    teamsGridEl.appendChild(card);
  });

  // ربط الأحداث للأزرار المولدة ديناميكياً
  document.querySelectorAll('.btn-edit-team').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      editTeam(id);
    });
  });

  document.querySelectorAll('.btn-delete-team').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      deleteTeam(id);
    });
  });

  document.querySelectorAll('.btn-manage-players').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      selectTeamForPlayers(id);
    });
  });

  // إضافة حركات GSAP لظهور العناصر إذا كانت المكتبة محملة
  if (window.gsap) {
    gsap.from('.team-card-item', { opacity: 0, y: 15, duration: 0.3, stagger: 0.05, ease: 'power2.out' });
  }
}

// تشغيل محاذاة إدارة اللاعبين لفريق محدد
async function selectTeamForPlayers(teamId) {
  selectedTeamId = teamId;
  const team = allTeams.find(t => t.id == teamId);
  if (!team) return;

  // إخفاء العنصر المؤقت وعرض القسم الفعلي
  hideEl(playerPanelPlaceholder);
  showEl(playerPanelActive);

  // تعبئة بيانات لوحة معلومات الفريق
  if (selectedTeamCrest) selectedTeamCrest.src = team.crestUrl || '/img/default-crest.png';
  if (selectedTeamName) selectedTeamName.textContent = team.name;
  if (selectedTeamYear) selectedTeamYear.textContent = team.foundedYear || '-';
  if (selectedTeamStadium) selectedTeamStadium.textContent = team.stadium || '-';
  if (selectedTeamColor) selectedTeamColor.style.backgroundColor = team.primaryColor || '#f59e0b';

  await loadPlayers(teamId);
}

// جلب التشكيلة الحالية للفريق المختار
async function loadPlayers(teamId) {
  try {
    showEl(playersLoadingEl);
    hideEl(playersListEl);
    hideEl(playersEmptyEl);

    const response = await api.get(`/teams/${teamId}`);
    const players = response.players || [];

    if (players.length === 0) {
      hideEl(playersLoadingEl);
      showEl(playersEmptyEl);
      return;
    }

    renderPlayersList(players);
    hideEl(playersLoadingEl);
    showEl(playersListEl);
  } catch (error) {
    console.error('فشل في جلب قائمة اللاعبين:', error);
    alert('تعذر تحميل تشكيلة اللاعبين.');
  }
}

// بناء صفوف قائمة اللاعبين ديناميكياً
function renderPlayersList(players) {
  if (!playersListEl) return;
  playersListEl.innerHTML = '';

  players.forEach(player => {
    const row = document.createElement('div');
    row.className = 'bg-slate-950 p-2.5 rounded-lg border border-slate-900 flex items-center justify-between gap-3 player-row-item';

    row.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
          ${player.jerseyNumber}
        </div>
        <div>
          <h4 class="font-bold text-white text-xs">${player.name}</h4>
          <p class="text-[10px] text-slate-400 mt-0.5">${player.position}</p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button class="btn-edit-player text-slate-500 hover:text-brand-accent p-1 transition" title="تعديل بيانات اللاعب" data-id="${player.id}">
          <i class="fa-solid fa-pen text-[10px]"></i>
        </button>
        <button class="btn-delete-player text-slate-500 hover:text-brand-danger p-1 transition" title="حذف اللاعب" data-id="${player.id}">
          <i class="fa-solid fa-trash-can text-[10px]"></i>
        </button>
      </div>
    `;

    playersListEl.appendChild(row);
  });

  // ربط الأحداث
  document.querySelectorAll('.btn-edit-player').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      editPlayer(id, players);
    });
  });

  document.querySelectorAll('.btn-delete-player').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      deletePlayer(id);
    });
  });
}

// نافذة الفريق المنبثقة
function openTeamModal(team = null) {
  if (!teamModal) return;

  const crestInput = document.getElementById('team-crest');

  if (team) {
    if (teamModalTitle) teamModalTitle.textContent = 'تعديل بيانات الفريق';
    if (teamIdInput) teamIdInput.value = team.id;
    document.getElementById('team-name').value = team.name;
    
    // تفريغ حقل الملف وتخزين مسار الشعار الحالي للاحتفاظ به إذا لم يتم رفع شعار جديد
    crestInput.value = '';
    crestInput.dataset.existingUrl = team.crestUrl || '';

    document.getElementById('team-color').value = team.primaryColor || '#f59e0b';
    document.getElementById('team-color-picker').value = team.primaryColor || '#f59e0b';
    document.getElementById('team-stadium').value = team.stadium || '';
    document.getElementById('team-founded').value = team.foundedYear || '';
  } else {
    if (teamModalTitle) teamModalTitle.textContent = 'إضافة فريق جديد';
    if (teamForm) teamForm.reset();
    if (teamIdInput) teamIdInput.value = '';
    crestInput.value = '';
    delete crestInput.dataset.existingUrl;
    document.getElementById('team-color').value = '#f59e0b';
    document.getElementById('team-color-picker').value = '#f59e0b';
  }

  teamModal.classList.remove('hidden');
  setTimeout(() => {
    teamModal.classList.add('opacity-100');
    const transformEl = teamModal.querySelector('.transform');
    if (transformEl) transformEl.classList.remove('scale-95');
  }, 10);
}

function closeTeamModal() {
  if (!teamModal) return;
  teamModal.classList.remove('opacity-100');
  const transformEl = teamModal.querySelector('.transform');
  if (transformEl) transformEl.classList.add('scale-95');
  setTimeout(() => {
    teamModal.classList.add('hidden');
  }, 300);
}

// معالجة إرسال نموذج الفريق لحفظ أو تعديل البيانات باستخدام ترميز Base64
async function handleTeamSubmit(e) {
  e.preventDefault();

  const id = teamIdInput ? teamIdInput.value : '';
  const crestInput = document.getElementById('team-crest');
  let crestUrlValue = crestInput.dataset.existingUrl || null;

  // في حال قام المستخدم برفع ملف شعار جديد، نقوم بتحويله لـ Base64
  if (crestInput.files.length > 0) {
    const file = crestInput.files[0];
    crestUrlValue = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // تنظيف رمز اللون لضمان توافقه مع صيغة Hex القياسية ومنع فشل التحقق في السيرفر
  let colorValue = document.getElementById('team-color').value.trim();
  if (colorValue) {
    colorValue = colorValue.replace(/#/g, ''); // حذف أي علامة # موجودة
    colorValue = '#' + colorValue; // إعادة إضافتها في البداية بشكل صحيح
  } else {
    colorValue = '#f59e0b';
  }

  // صياغة البيانات في JSON عادي دون الحاجة لمكتبة Multer
  const payload = {
    name: document.getElementById('team-name').value,
    crestUrl: crestUrlValue,
    primaryColor: colorValue,
    stadium: document.getElementById('team-stadium').value || null,
    foundedYear: parseInt(document.getElementById('team-founded').value) || null
  };

  try {
    let result;
    if (id) {
      result = await api.put(`/teams/${id}`, payload);
    } else {
      result = await api.post('/teams', payload);
    }

    if (result && result.success) {
      closeTeamModal();
      await loadTeams();
      
      if (selectedTeamId && selectedTeamId == id) {
        selectTeamForPlayers(id);
      }
    }
  } catch (error) {
    console.error('خطأ أثناء حفظ الفريق:', error);
    // إظهار رسالة الخطأ الدقيقة القادمة من السيرفر لمعرفتها فوراً
    alert('تعذر حفظ بيانات الفريق: ' + (error.message || 'يرجى التحقق من المدخلات وصحة البيانات.'));
  }
}

// جلب بيانات الفريق بهدف تعديلها
function editTeam(id) {
  const team = allTeams.find(t => t.id == id);
  if (team) {
    openTeamModal(team);
  }
}

// حذف فريق
async function deleteTeam(id) {
  const team = allTeams.find(t => t.id == id);
  if (!team) return;

  if (confirm(`هل أنت متأكد من حذف الفريق "${team.name}" وكل البيانات المرتبطة به؟ لا يمكن التراجع.`)) {
    try {
      const response = await api.delete(`/teams/${id}`);
      if (response && response.success) {
        if (selectedTeamId == id) {
          selectedTeamId = null;
          showEl(playerPanelPlaceholder);
          hideEl(playerPanelActive);
        }
        await loadTeams();
      }
    } catch (error) {
      console.error('حدث خطأ أثناء حذف الفريق:', error);
      alert('فشل في إكمال عملية حذف الفريق.');
    }
  }
}

// نافذة اللاعبين المنبثقة
function openPlayerModal(player = null) {
  if (!playerModal) return;

  if (player) {
    if (playerModalTitle) playerModalTitle.textContent = 'تعديل بيانات اللاعب';
    if (playerIdInput) playerIdInput.value = player.id;
    document.getElementById('player-name').value = player.name;
    document.getElementById('player-number').value = player.jerseyNumber;
    document.getElementById('player-position').value = player.position;
    document.getElementById('player-photo').value = player.photoUrl || '';
  } else {
    if (playerModalTitle) playerModalTitle.textContent = 'إضافة لاعب للتشكيلة';
    if (playerForm) playerForm.reset();
    if (playerIdInput) playerIdInput.value = '';
  }

  playerModal.classList.remove('hidden');
  setTimeout(() => {
    playerModal.classList.add('opacity-100');
    const transformEl = playerModal.querySelector('.transform');
    if (transformEl) transformEl.classList.remove('scale-95');
  }, 10);
}

function closePlayerModal() {
  if (!playerModal) return;
  playerModal.classList.remove('opacity-100');
  const transformEl = playerModal.querySelector('.transform');
  if (transformEl) transformEl.classList.add('scale-95');
  setTimeout(() => {
    playerModal.classList.add('hidden');
  }, 300);
}

// حفظ أو تعديل لاعب
async function handlePlayerSubmit(e) {
  e.preventDefault();
  if (!selectedTeamId) return;

  const id = playerIdInput ? playerIdInput.value : '';
  const payload = {
    name: document.getElementById('player-name').value,
    jerseyNumber: parseInt(document.getElementById('player-number').value),
    position: document.getElementById('player-position').value,
    photoUrl: document.getElementById('player-photo').value || null
  };

  try {
    let result;
    if (id) {
      result = await api.put(`/players/${id}`, payload);
    } else {
      result = await api.post(`/teams/${selectedTeamId}/players`, payload);
    }

    if (result && result.success) {
      closePlayerModal();
      await loadPlayers(selectedTeamId);
    }
  } catch (error) {
    console.error('خطأ أثناء حفظ اللاعب:', error);
    alert('فشل حفظ بيانات اللاعب. تأكد من الرقم وصحة المدخلات.');
  }
}

// تفعيل وضعية تعديل اللاعب
function editPlayer(id, players) {
  const player = players.find(p => p.id == id);
  if (player) {
    openPlayerModal(player);
  }
}

// حذف لاعب
async function deletePlayer(id) {
  if (confirm('هل أنت متأكد من رغبتك في حذف هذا اللاعب نهائياً من تشكيلة الفريق؟')) {
    try {
      const response = await api.delete(`/players/${id}`);
      if (response && response.success) {
        await loadPlayers(selectedTeamId);
      }
    } catch (error) {
      console.error('حدث خطأ أثناء حذف اللاعب:', error);
      alert('تعذر إتمام عملية الحذف للاعب المطلوب.');
    }
  }
}

// دوال مساعدة لإظهار وإخفاء العناصر بشكل آمن
function showEl(el) {
  if (el) el.classList.remove('hidden');
}

// إخفاء العناصر
function hideEl(el) {
  if (el) el.classList.add('hidden');
}
