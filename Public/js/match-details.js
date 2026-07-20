document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('id');

  if (!matchId) {
    showEl(document.getElementById('details-error'));
    hideEl(document.getElementById('details-loading'));
    return;
  }

  await loadMatchDetails(matchId);
});

// تحميل وعرض تفاصيل وإحصائيات المباراة بالكامل
async function loadMatchDetails(matchId) {
  const loadingEl = document.getElementById('details-loading');
  const errorEl = document.getElementById('details-error');
  const contentEl = document.getElementById('details-content');

  try {
    // 1. جلب بيانات المباراة الأساسية والأحداث، وجلب بيانات التشكيلة والتقييمات
    const match = await fetchAPI(`/api/matches/${matchId}`);
    if (!match) {
      showEl(errorEl);
      hideEl(loadingEl);
      return;
    }

    const lineup = await fetchAPI(`/api/matches/${matchId}/lineup`);
    const activeLineup = lineup || [];

    // 2. تحديث لوحة النتائج العلوية والاستحواذ
    updateScoreboard(match);

    // 3. رسم تشكيلة اللاعبين الـ 22 على الملعب الرسومي
    renderTacticalPitch(match, activeLineup);

    // 4. بناء قوائم اللاعبين (الأساسيون والبدلاء)
    renderRosterLists(match, activeLineup);

    // 5. بناء شريط أحداث اللقاء الزمني
    renderTimelineFeed(match.events || []);

    // عرض المحتوى وإخفاء التحميل
    hideEl(loadingEl);
    showEl(contentEl);

    // تفعيل حركات GSAP التدريجية لفقاعات اللاعبين والبطاقات فور العرض
    if (window.gsap) {
      gsap.fromTo('.player-bubble', 
        { opacity: 0, scale: 0.3 }, 
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.03, ease: "back.out(1.4)" }
      );
    }

  } catch (err) {
    console.error('فشل جلب وعرض تفاصيل اللقاء:', err);
    showEl(errorEl);
    hideEl(loadingEl);
  }
}

// تحديث النتيجة ونسب الاستحواذ والتواريخ بالأرقام العربية
function updateScoreboard(match) {
  const homeTeam = match.homeTeam || { name: 'صاحب الأرض', crestUrl: '/img/default-crest.png' };
  const awayTeam = match.awayTeam || { name: 'الضيف', crestUrl: '/img/default-crest.png' };

  // الأسماء والشعارات
  document.getElementById('home-crest').src = homeTeam.crestUrl || '/img/default-crest.png';
  document.getElementById('away-crest').src = awayTeam.crestUrl || '/img/default-crest.png';
  document.getElementById('home-name').textContent = homeTeam.name;
  document.getElementById('away-name').textContent = awayTeam.name;

  // الأهداف
  document.getElementById('score-home').textContent = match.homeScore ?? 0;
  document.getElementById('score-away').textContent = match.awayScore ?? 0;

  // التواريخ والحالة بالأرقام العربية (latn)
  const matchDateFormatted = new Date(match.matchDate).toLocaleString('ar-EG-u-nu-latn', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  document.getElementById('match-date-badge').textContent = matchDateFormatted;

  // شارة الحالة والأنماط البصرية المرافقة
  const statusBadge = document.getElementById('match-status-badge');
  let statusText = 'لم تبدأ بعد';
  let statusClass = 'bg-slate-900 border-slate-800 text-slate-400';

  if (match.status === 'being_played_right_now') {
    statusText = 'تُلعب الآن (مباشر)';
    statusClass = 'bg-red-950/40 border-red-800 text-red-400 animate-pulse';
  } else if (match.status === 'finished') {
    statusText = 'انتهت المباراة';
    statusClass = 'bg-emerald-950/40 border-emerald-800 text-emerald-400';
  }

  statusBadge.textContent = statusText;
  statusBadge.className = `px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${statusClass}`;

  // الاستحواذ
  const possHome = match.possessionHome ?? 50;
  const possAway = match.possessionAway ?? 50;

  document.getElementById('poss-home-lbl').textContent = `الاستحواذ: ${possHome}%`;
  document.getElementById('poss-away-lbl').textContent = `${possAway}% :الاستحواذ`;

  document.getElementById('poss-home-bar').style.width = `${possHome}%`;
  document.getElementById('poss-away-bar').style.width = `${possAway}%`;
}

// دالة تحديد الأنماط اللونية لتقييمات اللاعبين على أساس القيم الرقمية
function getRatingClass(rating) {
  if (!rating) return 'bg-slate-600 text-slate-100';
  const val = parseFloat(rating);
  if (val >= 7.5) return 'bg-emerald-600 text-white font-extrabold'; // تقييم ممتاز جداً
  if (val >= 6.5) return 'bg-emerald-500 text-white font-bold';    // تقييم مرتفع
  if (val >= 5.5) return 'bg-amber-500 text-slate-950 font-semibold'; // تقييم متوسط
  return 'bg-slate-600 text-slate-200'; // تقييم ضعيف
}

// رسم وإسقاط فقاعات اللاعبين على الملعب الرسومي بدقة
function renderTacticalPitch(match, lineup) {
  const pitch = document.getElementById('tactical-pitch');
  if (!pitch) return;

  // مسح أي فقاعات سابقة مع إبقاء الخطوط الأساسية
  const oldBubbles = pitch.querySelectorAll('.player-bubble');
  oldBubbles.forEach(b => b.remove());

  // تصفية اللاعبين الأساسيين فقط (الذين لديهم إحداثيات X و Y صالحة)
  const starters = lineup.filter(lp => lp.isStarting && lp.positionX !== null && lp.positionY !== null);

  starters.forEach(p => {
    const playerInfo = p.player || { name: 'لاعب', photoUrl: '', jerseyNumber: '' };
    const ratingVal = p.rating ? p.rating.toFixed(1) : '6.0';
    const ratingColorClass = getRatingClass(p.rating);

    // تصفية وحساب الأحداث الفنية الخاصة بهذا اللاعب في هذا اللقاء لعرض شارات الإحصاء فوق دائرته
    let overlayBadges = '';
    const playerEvents = (match.events || []).filter(e => e.playerId === p.playerId);
    
    // حساب الأهداف
    const goalsCount = playerEvents.filter(e => e.type === 'goal').length;
    if (goalsCount > 0) {
      overlayBadges += `<span class="bg-white text-slate-950 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">⚽</span>`;
    }

    // حساب الإنذارات
    const yellowsCount = playerEvents.filter(e => e.type === 'yellow_card').length;
    const redsCount = playerEvents.filter(e => e.type === 'red_card').length;
    if (redsCount > 0) {
      overlayBadges += `<span class="bg-red-500 text-white text-[8px] w-2.5 h-3.5 rounded flex items-center justify-center shadow">🟥</span>`;
    } else if (yellowsCount > 0) {
      overlayBadges += `<span class="bg-yellow-400 text-slate-950 text-[8px] w-2.5 h-3.5 rounded flex items-center justify-center shadow">🟨</span>`;
    }

    // بناء حاوية الفقاعة
    const bubble = document.createElement('div');
    bubble.className = 'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center player-bubble z-20';
    bubble.style.left = `${p.positionX}%`;
    bubble.style.top = `${p.positionY}%`;

    bubble.innerHTML = `
      <!-- شارات الأحداث المجهرية فوق رأس اللاعب -->
      <div class="absolute -top-3 flex items-center gap-0.5 z-30">
        ${overlayBadges}
      </div>

      <!-- دائرة الصورة والتقييم -->
      <div class="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-900 bg-slate-950 flex items-center justify-center shadow-lg overflow-visible">
        <img src="${playerInfo.photoUrl || '/img/default-player.png'}" alt="" class="w-full h-full rounded-full object-cover">
        
        <!-- التقييم ملصق بجانب الفقاعة -->
        <span class="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] shadow-md border border-slate-950 font-mono ${ratingColorClass}">
          ${ratingVal}
        </span>
      </div>

      <!-- الاسم والرقم -->
      <div class="text-[8px] sm:text-[10px] font-bold text-white bg-slate-950/85 px-1.5 py-0.5 rounded shadow mt-1.5 max-w-[75px] truncate text-center border border-slate-900/40">
        ${playerInfo.jerseyNumber} ${playerInfo.name}
      </div>
    `;

    pitch.appendChild(bubble);
  });
}

// بناء وعرض قوائم التشكيلة المفصلة (الأساسيون والبدلاء)
function renderRosterLists(match, lineup) {
  const homeStartersEl = document.getElementById('list-home-starters');
  const homeSubsEl = document.getElementById('list-home-subs');
  const awayStartersEl = document.getElementById('list-away-starters');
  const awaySubsEl = document.getElementById('list-away-subs');

  const homeTeamName = match.homeTeam ? match.homeTeam.name : 'الأرض';
  const awayTeamName = match.awayTeam ? match.awayTeam.name : 'الضيف';

  document.getElementById('list-home-team-title').textContent = homeTeamName;
  document.getElementById('list-away-team-title').textContent = awayTeamName;

  // تفريغ القوائم
  homeStartersEl.innerHTML = '';
  homeSubsEl.innerHTML = '';
  awayStartersEl.innerHTML = '';
  awaySubsEl.innerHTML = '';

  const homePlayers = lineup.filter(lp => lp.teamId === match.homeTeamId);
  const awayPlayers = lineup.filter(lp => lp.teamId === match.awayTeamId);

  // دالة مساعدة لبناء الأسطر بشكل مفصل
  const createPlayerRow = (p) => {
    const playerInfo = p.player || { name: 'لاعب', photoUrl: '', jerseyNumber: '', position: 'وسط' };
    const ratingVal = p.rating ? p.rating.toFixed(1) : '6.0';
    const ratingColorClass = getRatingClass(p.rating);

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-2 bg-slate-900/40 border border-slate-900 rounded-lg hover:bg-slate-900/75 transition';
    row.innerHTML = `
      <div class="flex items-center gap-2.5 truncate">
        <span class="text-[10px] font-bold font-mono text-slate-500 w-4">${playerInfo.jerseyNumber}</span>
        <img src="${playerInfo.photoUrl || '/img/default-player.png'}" alt="" class="w-6 h-6 rounded-full object-cover border border-slate-800">
        <span class="text-xs font-semibold text-slate-200 truncate">${playerInfo.name}</span>
        <span class="text-[9px] text-slate-500 px-1 py-0.5 bg-slate-950/40 rounded">${p.position || playerInfo.position}</span>
      </div>
      <span class="px-2 py-0.5 rounded text-[10px] font-mono shadow-sm border border-slate-950/60 ${ratingColorClass}">
        ${ratingVal}
      </span>
    `;
    return row;
  };

  // تعبئة الأرض
  const homeStarters = homePlayers.filter(p => p.isStarting);
  const homeSubs = homePlayers.filter(p => !p.isStarting);

  if (homeStarters.length === 0) homeStartersEl.innerHTML = '<p class="text-slate-600 text-xs py-1">لا توجد بيانات متاحة.</p>';
  else homeStarters.forEach(p => homeStartersEl.appendChild(createPlayerRow(p)));

  if (homeSubs.length === 0) homeSubsEl.innerHTML = '<p class="text-slate-600 text-xs py-1">لا توجد بدلاء مسجلين.</p>';
  else homeSubs.forEach(p => homeSubsEl.appendChild(createPlayerRow(p)));

  // تعبئة الضيف
  const awayStarters = awayPlayers.filter(p => p.isStarting);
  const awaySubs = awayPlayers.filter(p => !p.isStarting);

  if (awayStarters.length === 0) awayStartersEl.innerHTML = '<p class="text-slate-600 text-xs py-1">لا توجد بيانات متاحة.</p>';
  else awayStarters.forEach(p => awayStartersEl.appendChild(createPlayerRow(p)));

  if (awaySubs.length === 0) awaySubsEl.innerHTML = '<p class="text-slate-600 text-xs py-1">لا توجد بدلاء مسجلين.</p>';
  else awaySubs.forEach(p => awaySubsEl.appendChild(createPlayerRow(p)));
}

// بناء شريط أحداث اللقاء الزمني
function renderTimelineFeed(events) {
  const feed = document.getElementById('match-timeline-feed');
  if (!feed) return;

  if (events.length === 0) {
    feed.innerHTML = '<p class="text-slate-600 text-center py-12 text-xs">لا توجد أحداث فنية مسجلة لشريط المباراة حتى الآن.</p>';
    return;
  }

  // فرز الأحداث تصاعدياً (من د 1 حتى د 90+)
  const sortedEvents = [...events].sort((a, b) => a.minute - b.minute);
  feed.innerHTML = '';

  sortedEvents.forEach(evt => {
    let typeIcon = '⚽';
    let typeText = 'حدث فني';
    let typeClass = 'bg-slate-900 border-slate-800 text-white';

    if (evt.type === 'goal') {
      typeIcon = '⚽';
      typeText = 'هدف';
      typeClass = 'bg-emerald-950 text-emerald-400 border-emerald-800';
    } else if (evt.type === 'yellow_card') {
      typeIcon = '🟨';
      typeText = 'إنذار أصفر';
      typeClass = 'bg-yellow-950/40 text-yellow-500 border-yellow-800';
    } else if (evt.type === 'red_card') {
      typeIcon = '🟥';
      typeText = 'طرد أحمر';
      typeClass = 'bg-red-950/40 text-red-500 border-red-800';
    } else if (evt.type === 'substitution') {
      typeIcon = '🔄';
      typeText = 'تبديل';
      typeClass = 'bg-slate-900 text-slate-300 border-slate-800';
    } else if (evt.type === 'shot') {
      typeIcon = '🎯';
      typeText = 'تسديدة خطيرة';
      typeClass = 'bg-slate-900 text-slate-300 border-slate-800';
    } else if (evt.type === 'tackle') {
      typeIcon = '⚔️';
      typeText = 'تدخل دفاعي ممتاز';
      typeClass = 'bg-slate-900 text-slate-300 border-slate-800';
    } else if (evt.type === 'foul') {
      typeIcon = '⚠️';
      typeText = 'خطأ مرتكب';
      typeClass = 'bg-slate-900 text-slate-300 border-slate-800';
    } else if (evt.type === 'free_kick') {
      typeIcon = '📐';
      typeText = 'ركلة حرة مباشرة';
      typeClass = 'bg-slate-900 text-slate-300 border-slate-800';
    } else if (evt.type === 'penalty') {
      typeIcon = '🥅';
      typeText = 'ركلة جزاء';
      typeClass = 'bg-slate-900 text-slate-300 border-slate-800';
    }

    const playerName = evt.player ? evt.player.name : 'لاعب غير معروف';

    const item = document.createElement('div');
    item.className = 'relative flex items-center gap-3.5 border-r-2 border-slate-800/80 pr-6 pb-2 last:pb-0';
    item.innerHTML = `
      <!-- عقدة الشارة الدائرية على الخط -->
      <span class="absolute -right-[11px] top-1.5 w-5 h-5 rounded-full flex items-center justify-center border text-xs shadow-md ${typeClass}">
        ${typeIcon}
      </span>
      <div class="flex flex-col gap-0.5">
        <span class="text-xs font-bold text-white flex items-center gap-1.5">
          د ${evt.minute}' - ${typeText}
        </span>
        <span class="text-[11px] text-slate-400 font-semibold">${playerName}</span>
      </div>
    `;
    feed.appendChild(item);
  });
}

// دالتان مساعدتان آمنتان
function showEl(el) {
  if (el) el.classList.remove('hidden');
}

function hideEl(el) {
  if (el) el.classList.add('hidden');
}
