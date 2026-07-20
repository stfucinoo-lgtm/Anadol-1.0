document.addEventListener('DOMContentLoaded', async () => {
  initMatchCenter();
});

let allMatches = [];
let allTeams = [];
let activeFilter = 'today'; // الفلتر الافتراضي عند فتح الصفحة هو "مباريات اليوم"

// عناصر التحكم في الواجهة
const loadingEl = document.getElementById('center-loading');
const emptyEl = document.getElementById('center-empty');
const matchesListEl = document.getElementById('center-matches-list');
const emptyStateMsg = document.getElementById('empty-state-message');

// أزرار التصفية
const btnToday = document.getElementById('filter-today');
const btnLive = document.getElementById('filter-live');
const btnAll = document.getElementById('filter-all');

// تهيئة مركز المباريات
async function initMatchCenter() {
  setupFilterListeners();
  await loadMatchCenterData();
}

// ربط أحداث الضغط على الفلاتر وتحديث الأنماط البصرية للتبويب النشط
function setupFilterListeners() {
  const filters = [
    { btn: btnToday, type: 'today' },
    { btn: btnLive, type: 'live' },
    { btn: btnAll, type: 'all' }
  ];

  filters.forEach(item => {
    if (item.btn) {
      item.btn.addEventListener('click', () => {
        // إزالة الفاعلية عن كل الأزرار
        filters.forEach(f => {
          if (f.btn) {
            f.btn.classList.remove('active', 'bg-brand-accent', 'text-brand-dark', 'font-bold');
            f.btn.classList.add('text-slate-400');
          }
        });

        // تفعيل الزر الحالي
        item.btn.classList.add('active', 'bg-brand-accent', 'text-brand-dark', 'font-bold');
        item.btn.classList.remove('text-slate-400');

        activeFilter = item.type;
        renderFilteredMatches();
      });
    }
  });
}

// جلب الفرق والمباريات بالتوازي لزيادة سرعة التحميل
async function loadMatchCenterData() {
  try {
    showEl(loadingEl);
    hideEl(matchesListEl);
    hideEl(emptyEl);

    // جلب الفرق أولاً لضمان وجود الشعارات والأسماء، ثم جلب المباريات
    const [teams, matches] = await Promise.all([
      fetchAPI('/api/teams'),
      fetchAPI('/api/matches')
    ]);

    allTeams = teams || [];
    allMatches = matches || [];

    hideEl(loadingEl);
    renderFilteredMatches();

  } catch (err) {
    console.error('خطأ أثناء جلب بيانات مركز المباريات:', err);
    loadingEl.innerHTML = '<p class="text-brand-danger text-xs"><i class="fa-solid fa-circle-exclamation"></i> فشل تحميل البيانات من الخادم، يرجى التحديث.</p>';
  }
}

// التحقق مما إذا كان تاريخ اللقاء يطابق تاريخ اليوم الفعلي
function isToday(dateString) {
  const today = new Date();
  const matchDate = new Date(dateString);
  
  return today.getFullYear() === matchDate.getFullYear() &&
         today.getMonth() === matchDate.getMonth() &&
         today.getDate() === matchDate.getDate();
}

// تصفية وعرض المباريات بناءً على الفلتر النشط
function renderFilteredMatches() {
  if (!matchesListEl) return;
  matchesListEl.innerHTML = '';
  hideEl(emptyEl);

  let filtered = [];
  let emptyMsg = 'لا توجد مباريات مجدولة لهذا اليوم.';

  if (activeFilter === 'today') {
    filtered = allMatches.filter(m => isToday(m.matchDate));
    emptyMsg = 'لا توجد مباريات مجدولة لليوم الفعلي.';
  } else if (activeFilter === 'live') {
    filtered = allMatches.filter(m => m.status === 'being_played_right_now');
    emptyMsg = 'لا توجد أي مباراة جارية حالياً (مباشر).';
  } else {
    filtered = allMatches;
    emptyMsg = 'لا توجد أي مباريات مسجلة في جدول البطولة بعد.';
  }

  // معالجة حالة الفراغ
  if (filtered.length === 0) {
    if (emptyStateMsg) emptyStateMsg.textContent = emptyMsg;
    showEl(emptyEl);
    hideEl(matchesListEl);
    return;
  }

  // بناء بطاقات اللقاءات
  filtered.forEach(match => {
    const homeTeam = allTeams.find(t => t.id === match.homeTeamId) || { name: 'فريق غير معروف', crestUrl: '/img/default-crest.png' };
    const awayTeam = allTeams.find(t => t.id === match.awayTeamId) || { name: 'فريق غير معروف', crestUrl: '/img/default-crest.png' };
    
    // تنسيق الوقت والتاريخ بالأرقام العربية القياسية (latn) لمنع الأرقام الهندية
    const dateFormatted = new Date(match.matchDate).toLocaleString('ar-EG-u-nu-latn', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let statusText = 'لم تبدأ';
    let statusClass = 'bg-slate-800 text-slate-300';
    if (match.status === 'being_played_right_now') {
      statusText = 'مباشر الآن';
      statusClass = 'bg-red-950 text-red-400 border border-red-800 animate-pulse';
    } else if (match.status === 'finished') {
      statusText = 'انتهت';
      statusClass = 'bg-emerald-950 text-emerald-400';
    }

    // بناء سطر النتيجة أو التوقيت الافتراضي
    let scoreDisplay = `
      <div class="flex items-center gap-2.5 font-black text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
        <span class="text-slate-200">${match.homeScore ?? 0}</span>
        <span class="text-slate-600">:</span>
        <span class="text-slate-200">${match.awayScore ?? 0}</span>
      </div>
    `;

    // إذا كانت المباراة لم تبدأ بعد، نبرز التوقيت بشكل واضح بدلاً من النتيجة الافتراضية
    if (match.status === 'not_played_yet') {
      scoreDisplay = `
        <div class="text-[10px] font-bold text-brand-accent bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 font-mono">
          ${new Date(match.matchDate).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}
        </div>
      `;
    }

    const card = document.createElement('a');
    card.href = `/match-details.html?id=${match.id}`;
    card.className = 'block bg-slate-900/60 border border-slate-900 rounded-2xl p-4 hover:border-slate-700 hover:bg-slate-900 transition duration-150 shadow-md match-center-card';
    card.innerHTML = `
      <div class="flex items-center justify-between text-[10px] mb-3">
        <span class="text-slate-400 font-bold font-mono"><i class="fa-regular fa-clock"></i> ${dateFormatted}</span>
        <span class="px-2 py-0.5 rounded font-extrabold uppercase text-[9px] ${statusClass}">${statusText}</span>
      </div>
      <div class="flex items-center justify-between py-1">
        
        <!-- فريق الأرض -->
        <div class="flex items-center gap-2 w-[38%] truncate">
          <img src="${homeTeam.crestUrl || '/img/default-crest.png'}" alt="" class="w-6 h-6 object-contain">
          <span class="font-bold text-slate-100 text-xs truncate">${homeTeam.name}</span>
        </div>

        <!-- النتيجة أو الموعد -->
        <div class="flex items-center justify-center w-[24%]">
          ${scoreDisplay}
        </div>

        <!-- فريق الضيف -->
        <div class="flex items-center gap-2 w-[38%] justify-end truncate">
          <span class="font-bold text-slate-100 text-xs truncate">${awayTeam.name}</span>
          <img src="${awayTeam.crestUrl || '/img/default-crest.png'}" alt="" class="w-6 h-6 object-contain">
        </div>

      </div>
    `;

    matchesListEl.appendChild(card);
  });

  showEl(matchesListEl);

  // حركات ظهور تدريجية جذابة للبطاقات المصفاة باستخدام GSAP
  if (window.gsap) {
    gsap.fromTo('.match-center-card', 
      { opacity: 0, y: 15 }, 
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.35, 
        stagger: 0.03, 
        clearProps: "all"
      }
    );
  }
}

// دالتان مساعدتان آمنتان للتخاطب البصري
function showEl(el) {
  if (el) el.classList.remove('hidden');
}

function hideEl(el) {
  if (el) el.classList.add('hidden');
}
