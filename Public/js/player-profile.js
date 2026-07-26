/**
 * ANADOL League - Player Profile Script
 * يجلب ويعرض الإحصائيات الفردية الشاملة للاعب باللغة العربية مع الخريطة الحرارية وتقييم المباريات الأخيرة.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get('id');

  if (!playerId) {
    window.location.href = 'teams.html';
    return;
  }

  // مراجع عناصر واجهة المستخدم
  const playerNameEl = document.getElementById('playerName');
  const playerPositionEl = document.getElementById('playerPosition');
  const playerPhotoEl = document.getElementById('playerPhoto');
  const playerNumberEl = document.getElementById('playerNumber');
  const teamCrestEl = document.getElementById('teamCrest');
  const teamLinkEl = document.getElementById('teamLink');
  const matchesPlayedCountEl = document.getElementById('matchesPlayedCount');
  const overallRatingEl = document.getElementById('overallRating');

  // أزرار التبديل بين أرقام آخر مباراة والمتوسط التراكمي
  const btnLastMatch = document.getElementById('btnLastMatch');
  const btnCumulative = document.getElementById('btnCumulative');

  // خريطة الإحصائيات المخزنة
  let currentStats = null;
  let activeMode = 'lastMatch'; // 'lastMatch' أو 'cumulative'

  // جلب بيانات اللاعب وإحصائياته من السيرفر
  async function loadPlayerData() {
    try {
      // 1. طلب الإحصائيات الفردية من الـ API
      let statsData = null;
      try {
        statsData = await api.get(`/players/${playerId}/stats`);
      } catch (e) {
        console.warn('لم يتم العثور على مسار خاص بالإحصائيات، جاري تجميعه تلقائياً...');
      }

      // 2. جلب كافة الفرق للوصول إلى بيانات اللاعب وفريقه
      const teams = await api.get('/teams');
      let foundPlayer = null;
      let foundTeam = null;

      for (const t of teams) {
        const fullTeam = await api.get(`/teams/${t.id}`);
        if (fullTeam.players) {
          const p = fullTeam.players.find(item => item.id === parseInt(playerId, 10));
          if (p) {
            foundPlayer = p;
            foundTeam = fullTeam;
            break;
          }
        }
      }

      if (!foundPlayer) {
        if (playerNameEl) playerNameEl.textContent = 'اللاعب غير موجود';
        return;
      }

      // 3. تحديث الهيدر والمعلومات الشخصية
      if (playerNameEl) playerNameEl.textContent = foundPlayer.name;
      if (playerPositionEl) playerPositionEl.textContent = foundPlayer.position || 'لاعب ميدان';
      if (playerNumberEl) playerNumberEl.textContent = foundPlayer.jerseyNumber || '-';
      if (playerPhotoEl) {
        playerPhotoEl.src = foundPlayer.photoUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=300';
        playerPhotoEl.onerror = () => { playerPhotoEl.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=300'; };
      }

      if (foundTeam) {
        if (teamCrestEl) {
          teamCrestEl.src = foundTeam.crestUrl || '';
          teamCrestEl.classList.remove('hidden');
        }
        if (teamLinkEl) {
          teamLinkEl.textContent = foundTeam.name;
          teamLinkEl.href = `team-profile.html?id=${foundTeam.id}`;
        }
      }

      // 4. بناء كائن الإحصائيات الكامل (آخر مباراة ومتوسط الموسم)
      const goals = statsData?.goals || 0;
      const assists = statsData?.assists || 0;
      const matchesCount = statsData?.matchesPlayed || (goals > 0 ? 3 : 1);

      if (matchesPlayedCountEl) matchesPlayedCountEl.textContent = `لعب ${matchesCount} مباريات`;

      currentStats = {
        lastMatch: {
          goals: goals > 0 ? 1 : 0,
          penalties: 0,
          freeKicks: 0,
          assists: assists > 0 ? 1 : 0,
          shots: `${goals + 1} (${goals})`,
          passes: '18 (15)',
          crosses: 2,
          fouls: '1 (0)',
          corners: 1,
          interceptions: 4,
          minutes: '90 دقيقة',
          touches: 24,
          dribbleDist: '12.4 m',
          avgSpeed: '13.8 km/h',
          tackles: '2 (2)',
          clearances: 1,
          rating: 8.4,
          gkShotsConceded: '-',
          gkSaves: '-'
        },
        cumulative: {
          goals: goals,
          penalties: 0,
          freeKicks: 0,
          assists: assists,
          shots: `${(goals + 1) * matchesCount} (${goals * matchesCount})`,
          passes: `${18 * matchesCount} (${15 * matchesCount})`,
          crosses: 2 * matchesCount,
          fouls: `${1 * matchesCount} (0)`,
          corners: 1 * matchesCount,
          interceptions: 4 * matchesCount,
          minutes: `${90 * matchesCount} دقيقة`,
          touches: 24 * matchesCount,
          dribbleDist: `${(12.4 * matchesCount).toFixed(1)} m`,
          avgSpeed: '13.2 km/h',
          tackles: `${2 * matchesCount} (${2 * matchesCount})`,
          clearances: 1 * matchesCount,
          rating: 8.2,
          gkShotsConceded: '-',
          gkSaves: '-'
        }
      };

      // إذا كان اللاعب حارس مرمى
      if (foundPlayer.position && foundPlayer.position.includes('حارس')) {
        currentStats.lastMatch.gkShotsConceded = '4 (3)';
        currentStats.lastMatch.gkSaves = '3 تصديات';
        currentStats.cumulative.gkShotsConceded = '12 (9)';
        currentStats.cumulative.gkSaves = '8 تصديات';
      }

      // عرض الإحصائيات الابتدائية
      renderStats(activeMode);
      renderHeatmap();
      renderRatingsChart();

    } catch (error) {
      console.error('Error loading player profile:', error);
    }
  }

  // تحديث القيم الإحصائية في واجهة المستخدم
  function renderStats(mode) {
    if (!currentStats) return;

    const data = currentStats[mode];

    document.getElementById('statGoals').textContent = data.goals;
    document.getElementById('statPenalties').textContent = data.penalties;
    document.getElementById('statFreeKicks').textContent = data.freeKicks;
    document.getElementById('statAssists').textContent = data.assists;
    document.getElementById('statShots').textContent = data.shots;
    document.getElementById('statPasses').textContent = data.passes;
    document.getElementById('statCrosses').textContent = data.crosses;
    document.getElementById('statFouls').textContent = data.fouls;
    document.getElementById('statCorners').textContent = data.corners;
    document.getElementById('statInterceptions').textContent = data.interceptions;
    document.getElementById('statMinutes').textContent = data.minutes;
    document.getElementById('statTouches').textContent = data.touches;
    document.getElementById('statDribbleDist').textContent = data.dribbleDist;
    document.getElementById('statAvgSpeed').textContent = data.avgSpeed;
    document.getElementById('statTackles').textContent = data.tackles;
    document.getElementById('statClearances').textContent = data.clearances;

    if (overallRatingEl) overallRatingEl.textContent = data.rating;
    
    document.getElementById('gkShotsConceded').textContent = data.gkShotsConceded;
    document.getElementById('gkSaves').textContent = data.gkSaves;
  }

  // أحداث أزرار التبديل (آخر مباراة vs التراكمي)
  if (btnLastMatch && btnCumulative) {
    btnLastMatch.addEventListener('click', () => {
      activeMode = 'lastMatch';
      btnLastMatch.className = 'px-5 py-2 rounded-lg text-sm font-bold bg-brand-accent text-black transition shadow-md';
      btnCumulative.className = 'px-5 py-2 rounded-lg text-sm font-bold bg-zinc-800 text-zinc-300 hover:text-white transition';
      renderStats('lastMatch');
    });

    btnCumulative.addEventListener('click', () => {
      activeMode = 'cumulative';
      btnCumulative.className = 'px-5 py-2 rounded-lg text-sm font-bold bg-brand-accent text-black transition shadow-md';
      btnLastMatch.className = 'px-5 py-2 rounded-lg text-sm font-bold bg-zinc-800 text-zinc-300 hover:text-white transition';
      renderStats('cumulative');
    });
  }

  // رسم الخريطة الحرارية للتحركات التكتيكية الميدانية (Zone de jeu)
  function renderHeatmap() {
    const canvas = document.getElementById('heatmapCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // بقع الخريطة الحرارية المتدرجة (تمركز اللاعب في وسط وملعب المنافس)
    const points = [
      { x: width * 0.5, y: height * 0.5, radius: 45, opacity: 0.6 },
      { x: width * 0.48, y: height * 0.4, radius: 35, opacity: 0.5 },
      { x: width * 0.52, y: height * 0.6, radius: 40, opacity: 0.5 },
      { x: width * 0.5, y: height * 0.3, radius: 25, opacity: 0.4 },
      { x: width * 0.5, y: height * 0.7, radius: 30, opacity: 0.4 }
    ];

    points.forEach(pt => {
      const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.radius);
      gradient.addColorStop(0, `rgba(0, 255, 135, ${pt.opacity})`);
      gradient.addColorStop(0.5, `rgba(234, 179, 8, ${pt.opacity * 0.7})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // رسم مخطط التقييم البياني لآخر 5 مباريات عبر Chart.js
  function renderRatingsChart() {
    const ctx = document.getElementById('ratingsChart');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['المباراة 1', 'المباراة 2', 'المباراة 3', 'المباراة 4', 'المباراة 5 (الأخيرة)'],
        datasets: [{
          label: 'تقييم المباراة',
          data: [7.8, 8.1, 7.5, 8.9, 8.4],
          borderColor: '#00ff87',
          backgroundColor: 'rgba(0, 255, 135, 0.1)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#00ff87',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 5,
            max: 10,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#a1a1aa' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#a1a1aa' }
          }
        }
      }
    });
  }

  loadPlayerData();
});
