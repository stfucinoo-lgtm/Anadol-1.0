/**
 * ANADOL League - Match Details Script (SofaScore Horizontal Display Corrected)
 * يقرأ معرّف المباراة ويعرض النتيجة، الاستحواذ، مسجلي الأهداف، والملعب التكتيكي الأفقي الموجه بشكل صحيح للفريقين (Left vs Right).
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('id');

  const loadingEl = document.getElementById('details-loading');
  const errorEl = document.getElementById('details-error');
  const contentEl = document.getElementById('details-content');

  if (!matchId) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
    return;
  }

  try {
    // 1. جلب بيانات تفاصيل المباراة والتشكيلة من السيرفر
    const match = await fetchAPI(`/api/matches/${matchId}`);
    if (!match || !match.id) {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errorEl) errorEl.classList.remove('hidden');
      return;
    }

    const lineup = await fetchAPI(`/api/matches/${matchId}/lineup`).catch(() => []);

    // 2. تعبئة لوحة النتائج واسم الملعب ومسجلي الأهداف تحت الفرق
    renderScoreboard(match);

    // 3. رسم الملعب التكتيكي الأفقي الموحد والموجه بالاتجاه الصحيح
    renderHorizontalSofaScorePitch(match, lineup || []);

    // 4. عرض القوائم والبدلاء مع التقييمات الرقمية الملونة
    renderRostersList(match, lineup || []);

    // 5. عرض شريط الأحداث المباشرة
    renderTimelineFeed(match.events || []);

    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

  } catch (err) {
    console.error('حدث خطأ أثناء جلب تفاصيل المباراة:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
  }
});

// تعبئة بطاقة النتيجة ومسجلي الأهداف واسم الملعب
function renderScoreboard(match) {
  const homeTeam = match.homeTeam || { name: 'صاحب الأرض', crestUrl: '/img/default-crest.png', stadium: 'ملعب الأناضول الرئيسي' };
  const awayTeam = match.awayTeam || { name: 'الضيف', crestUrl: '/img/default-crest.png' };

  const matchDateFormatted = new Date(match.matchDate).toLocaleDateString('ar-EG-u-nu-latn', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const stadiumTextEl = document.getElementById('stadium-text');
  if (stadiumTextEl) {
    stadiumTextEl.textContent = homeTeam.stadium || 'ملعب الأناضول الرئيسي';
  }

  document.getElementById('home-name').textContent = homeTeam.name;
  document.getElementById('home-crest').src = homeTeam.crestUrl || '/img/default-crest.png';
  document.getElementById('home-crest').onerror = function() { this.src = '/img/default-crest.png'; };

  document.getElementById('away-name').textContent = awayTeam.name;
  document.getElementById('away-crest').src = awayTeam.crestUrl || '/img/default-crest.png';
  document.getElementById('away-crest').onerror = function() { this.src = '/img/default-crest.png'; };

  document.getElementById('score-home').textContent = match.homeScore ?? 0;
  document.getElementById('score-away').textContent = match.awayScore ?? 0;

  document.getElementById('match-date-badge').textContent = matchDateFormatted;

  const statusBadge = document.getElementById('match-status-badge');
  if (statusBadge) {
    if (match.status === 'being_played_right_now') {
      statusBadge.textContent = 'تُلعب الآن المباشرة';
      statusBadge.className = 'px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border bg-red-950 text-red-400 border-red-800 animate-pulse';
    } else if (match.status === 'finished') {
      statusBadge.textContent = 'انتهت المباراة';
      statusBadge.className = 'px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border bg-emerald-950 text-emerald-400 border-emerald-800';
    } else {
      statusBadge.textContent = 'لم تبدأ بعد';
      statusBadge.className = 'px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border bg-slate-800 text-slate-300 border-slate-700';
    }
  }

  // استخراج وقراءة مسجلي الأهداف تحت أسماء الفرق
  const events = match.events || [];
  const goalEvents = events.filter(e => e.type === 'goal' || e.type === 'penalty');

  const homeGoalScorers = goalEvents.filter(e => e.teamId === match.homeTeamId);
  const awayGoalScorers = goalEvents.filter(e => e.teamId === match.awayTeamId);

  const homeScorersListEl = document.getElementById('home-scorers-list');
  const awayScorersListEl = document.getElementById('away-scorers-list');

  if (homeScorersListEl) {
    homeScorersListEl.innerHTML = homeGoalScorers.length === 0 ? '' : homeGoalScorers.map(g => {
      const pName = g.player ? g.player.name : 'هدف';
      const penText = g.type === 'penalty' ? ' (ر.ج)' : '';
      return `<div class="flex items-center justify-center gap-1"><span>⚽</span> <span>${pName}</span> <strong class="text-brand-accent">${g.minute}'${penText}</strong></div>`;
    }).join('');
  }

  if (awayScorersListEl) {
    awayScorersListEl.innerHTML = awayGoalScorers.length === 0 ? '' : awayGoalScorers.map(g => {
      const pName = g.player ? g.player.name : 'هدف';
      const penText = g.type === 'penalty' ? ' (ر.ج)' : '';
      return `<div class="flex items-center justify-center gap-1"><span>⚽</span> <span>${pName}</span> <strong class="text-brand-accent">${g.minute}'${penText}</strong></div>`;
    }).join('');
  }

  // الاستحواذ
  const possHome = match.possessionHome ?? 50;
  const possAway = match.possessionAway ?? 50;

  document.getElementById('poss-home-lbl').textContent = `الاستحواذ: ${possHome}%`;
  document.getElementById('poss-away-lbl').textContent = `${possAway}% :الاستحواذ`;

  document.getElementById('poss-home-bar').style.width = `${possHome}%`;
  document.getElementById('poss-away-bar').style.width = `${possAway}%`;
}

// رسم الملعب الأفقي الموحد والموجه بشكل دقيق بأسلوب SofaScore
function renderHorizontalSofaScorePitch(match, lineup) {
  const pitchEl = document.getElementById('tactical-pitch');
  if (!pitchEl) return;

  const existingBubbles = pitchEl.querySelectorAll('.player-node-bubble');
  existingBubbles.forEach(b => b.remove());

  const homeTeam = match.homeTeam || { name: 'الأرض' };
  const awayTeam = match.awayTeam || { name: 'الضيف' };

  const homeLabelEl = document.getElementById('pitch-home-team-label');
  const awayLabelEl = document.getElementById('pitch-away-team-label');
  if (homeLabelEl) homeLabelEl.textContent = homeTeam.name;
  if (awayLabelEl) awayLabelEl.textContent = awayTeam.name;

  const homeStarters = lineup.filter(lp => lp.teamId === match.homeTeamId && lp.isStarting);
  const awayStarters = lineup.filter(lp => lp.teamId === match.awayTeamId && lp.isStarting);

  // احتساب متوسط تقييم الفريقين
  let homeAvg = 6.0, awayAvg = 6.0;
  if (homeStarters.length > 0) {
    homeAvg = homeStarters.reduce((acc, curr) => acc + (curr.rating || 6.0), 0) / homeStarters.length;
  }
  if (awayStarters.length > 0) {
    awayAvg = awayStarters.reduce((acc, curr) => acc + (curr.rating || 6.0), 0) / awayStarters.length;
  }

  const homeRatingEl = document.getElementById('pitch-home-rating');
  const awayRatingEl = document.getElementById('pitch-away-rating');
  if (homeRatingEl) homeRatingEl.textContent = homeAvg.toFixed(2);
  if (awayRatingEl) awayRatingEl.textContent = awayAvg.toFixed(2);

  // 1. صاحب الأرض (على اليسار - حارسه أقصى اليسار X=6% وهجومه نحو المنتصف X=44%)
  homeStarters.forEach(lp => {
    const rawX = lp.positionX ?? 50; // العرض العمودي 0-100
    const rawY = lp.positionY ?? 70; // العمق التكتيكي (الحارس 90 ، المهاجم 16)

    // تحويل العمق الصريح لجهة اليسار
    const depthVal = (rawY < 50) ? (100 - rawY) : rawY;
    const finalX = 6 + ((90 - depthVal) * 0.51);
    const finalY = rawX;

    createPitchPlayerNode(pitchEl, lp, finalX, finalY, true);
  });

  // 2. الضيف (على اليمين - حارسه أقصى اليمين X=94% وهجومه نحو المنتصف X=56%)
  awayStarters.forEach(lp => {
    const rawX = lp.positionX ?? 50;
    const rawY = lp.positionY ?? 70;

    // توحيد قياس عمق الفريق الأيمن ليصبح الحارس عند 94% والمهاجم عند 56%
    const depthVal = (rawY < 50) ? (100 - rawY) : rawY;
    const finalX = 94 - ((90 - depthVal) * 0.51);
    
    // ضبط الاتجاه العمودي متناظراً
    const finalY = (rawX > 50) ? (100 - rawX) : (100 - rawX);

    createPitchPlayerNode(pitchEl, lp, finalX, finalY, false);
  });
}

function createPitchPlayerNode(pitchContainer, lineupRecord, posX, posY, isHome) {
  const player = lineupRecord.player || { name: 'لاعب', jerseyNumber: '-', photoUrl: '' };
  const rating = lineupRecord.rating ?? 6.0;

  const ratingBadgeClass = getRatingBadgeClass(rating);

  const node = document.createElement('div');
  node.className = 'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none player-node-bubble transition duration-300 z-10';
  node.style.left = `${posX}%`;
  node.style.top = `${posY}%`;

  const borderColor = isHome ? 'border-brand-accent' : 'border-slate-300';

  node.innerHTML = `
    <div class="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 ${borderColor} bg-slate-950 p-0.5 shadow-2xl flex items-center justify-center">
      <img src="${player.photoUrl || '/img/default-player.png'}" class="w-full h-full rounded-full object-cover" onerror="this.src='/img/default-player.png'">
      
      <!-- شارة التقييم الملونة بأسلوب SofaScore -->
      <span class="absolute -top-2 -right-2 ${ratingBadgeClass} text-[9px] font-black px-1.5 py-0.2 rounded-full border border-slate-900 shadow">
        ${rating.toFixed(1)}
      </span>

      <!-- رقم القميص -->
      <span class="absolute -bottom-1 -left-1 bg-slate-900 text-slate-200 text-[8px] font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-800">
        ${player.jerseyNumber}
      </span>
    </div>

    <!-- اسم اللاعب بخط أبيض ناصع مع ظلال أنيقة دون حواف سوداء -->
    <div class="mt-1 text-center font-bold text-[10px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] max-w-[75px] truncate leading-tight pointer-events-none">
      ${player.name}
    </div>
  `;

  pitchContainer.appendChild(node);
}

function getRatingBadgeClass(rating) {
  if (rating >= 8.0) return 'bg-emerald-500 text-white';
  if (rating >= 7.0) return 'bg-emerald-600 text-white';
  if (rating >= 6.5) return 'bg-amber-500 text-slate-950 font-black';
  if (rating >= 6.0) return 'bg-orange-500 text-white';
  return 'bg-red-600 text-white';
}

function renderRostersList(match, lineup) {
  const homeTeam = match.homeTeam || { name: 'صاحب الأرض' };
  const awayTeam = match.awayTeam || { name: 'الضيف' };

  document.getElementById('list-home-team-title').textContent = homeTeam.name;
  document.getElementById('list-away-team-title').textContent = awayTeam.name;

  const homeStarters = lineup.filter(lp => lp.teamId === match.homeTeamId && lp.isStarting);
  const homeSubs = lineup.filter(lp => lp.teamId === match.homeTeamId && !lp.isStarting);

  const awayStarters = lineup.filter(lp => lp.teamId === match.awayTeamId && lp.isStarting);
  const awaySubs = lineup.filter(lp => lp.teamId === match.awayTeamId && !lp.isStarting);

  populateRosterGroup('list-home-starters', homeStarters);
  populateRosterGroup('list-home-subs', homeSubs);
  populateRosterGroup('list-away-starters', awayStarters);
  populateRosterGroup('list-away-subs', awaySubs);
}

function populateRosterGroup(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = '<p class="text-slate-600 text-xs py-1">غير مسجلين</p>';
    return;
  }

  items.forEach(item => {
    const player = item.player || { name: 'لاعب غير معروف', jerseyNumber: '-', photoUrl: '' };
    const rating = item.rating ?? 6.0;
    const ratingClass = getRatingBadgeClass(rating);

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80';
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 rounded bg-slate-950 font-mono text-[10px] font-bold text-slate-400 flex items-center justify-center border border-slate-800">
          ${player.jerseyNumber}
        </span>
        <img src="${player.photoUrl || '/img/default-player.png'}" class="w-6 h-6 rounded-full object-cover" onerror="this.src='/img/default-player.png'">
        <span class="text-xs font-semibold text-slate-200 truncate max-w-[120px]">${player.name}</span>
      </div>
      <span class="${ratingClass} text-[10px] px-2 py-0.5 rounded-full font-bold">
        ${rating.toFixed(1)}
      </span>
    `;
    container.appendChild(row);
  });
}

function renderTimelineFeed(events) {
  const feedEl = document.getElementById('match-timeline-feed');
  if (!feedEl) return;
  feedEl.innerHTML = '';

  if (!events || events.length === 0) {
    feedEl.innerHTML = '<p class="text-slate-500 text-xs text-center py-8">لا توجد أحداث مسجلة في شريط المباراة.</p>';
    return;
  }

  const sorted = [...events].sort((a, b) => b.minute - a.minute);

  sorted.forEach(evt => {
    let icon = '⚽';
    let title = 'حدث';
    let badgeBg = 'bg-emerald-950 border-emerald-800 text-emerald-300';

    if (evt.type === 'yellow_card') { icon = '🟨'; title = 'بطاقة صفراء'; badgeBg = 'bg-amber-950 border-amber-800 text-amber-300'; }
    else if (evt.type === 'red_card') { icon = '🟥'; title = 'بطاقة حمراء'; badgeBg = 'bg-red-950 border-red-800 text-red-300'; }
    else if (evt.type === 'substitution') { icon = '🔄'; title = 'تبديل لاعب'; badgeBg = 'bg-slate-900 border-slate-700 text-slate-300'; }
    else if (evt.type === 'shot') { icon = '🎯'; title = 'تسديدة خطيرة'; }
    else if (evt.type === 'tackle') { icon = '⚔️'; title = 'تدخل دفاعي'; }
    else if (evt.type === 'goal') { icon = '⚽'; title = 'هدف للمباراة'; badgeBg = 'bg-emerald-900 border-emerald-700 text-white font-extrabold'; }

    const playerName = evt.player ? `${evt.player.name} (#${evt.player.jerseyNumber})` : 'لاعب غير محدد';

    const item = document.createElement('div');
    item.className = 'relative flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80';
    item.innerHTML = `
      <div class="flex items-center gap-2.5">
        <span class="w-7 h-7 rounded-lg ${badgeBg} border flex items-center justify-center text-xs shadow">
          ${icon}
        </span>
        <div>
          <p class="text-xs font-bold text-white leading-tight">${title}</p>
          <span class="text-[10px] text-slate-400 font-semibold">${playerName}</span>
        </div>
      </div>
      <span class="font-mono text-xs font-black text-brand-accent bg-slate-950 px-2 py-1 rounded border border-slate-800">
        د ${evt.minute}'
      </span>
    `;

    feedEl.appendChild(item);
  });
}
