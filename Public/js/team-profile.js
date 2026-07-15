/**
 * ANADOL League - Team Profile Script
 * يجلب تفاصيل الفريق المختار (معلومات، إحصائيات، لاعبين، مباريات) ويعرضها بشكل ديناميكي مع تأثيرات بصرية وحسابية.
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('id');

  if (!teamId) {
    window.location.href = 'teams.html';
    return;
  }

  // مراجع عناصر الصفحة
  const teamNameEl = document.getElementById('team-name');
  const teamCrestEl = document.getElementById('team-crest');
  const teamStadiumEl = document.getElementById('team-stadium');
  const teamFoundedEl = document.getElementById('team-founded');
  const headerWrapper = document.getElementById('team-header-wrapper');

  const statPlayedEl = document.getElementById('stat-played');
  const statWonEl = document.getElementById('stat-won');
  const statDrawnEl = document.getElementById('stat-drawn');
  const statLostEl = document.getElementById('stat-lost');
  const statGoalsForEl = document.getElementById('stat-goals-for');
  const statGoalsAgainstEl = document.getElementById('stat-goals-against');
  const statCleanSheetsEl = document.getElementById('stat-clean-sheets');

  const playersGrid = document.getElementById('players-grid');
  const scheduleList = document.getElementById('schedule-list');

  // حركة العد التصاعدي الإحصائي عبر GSAP
  function animateCountUp(element, endValue) {
    if (typeof gsap !== 'undefined') {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: endValue,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          element.textContent = Math.floor(obj.val);
        }
      });
    } else {
      element.textContent = endValue;
    }
  }

  async function loadTeamProfile() {
    try {
      // جلب بيانات الملف الكاملة من الـ API
      const data = await api.get(`/teams/${teamId}`);

      // 1. تحديث الهيدر والمعلومات الأساسية
      teamNameEl.textContent = data.name;
      teamCrestEl.src = data.crestUrl || '/images/default-crest.png';
      teamStadiumEl.textContent = data.stadium || 'ملعب غير محدد';
      teamFoundedEl.textContent = data.foundedYear ? `تأسس عام: ${data.foundedYear}` : '';
      
      const primaryColor = data.primaryColor || '#10b981';
      if (headerWrapper) {
        headerWrapper.style.borderBottom = `4px solid ${primaryColor}`;
      }

      // 2. تحديث وعرض الإحصائيات مع تأثير الحركة التصاعدية
      const stats = data.stats || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, cleanSheets: 0 };
      animateCountUp(statPlayedEl, stats.played);
      animateCountUp(statWonEl, stats.won);
      animateCountUp(statDrawnEl, stats.drawn);
      animateCountUp(statLostEl, stats.lost);
      animateCountUp(statGoalsForEl, stats.goalsFor);
      animateCountUp(statGoalsAgainstEl, stats.goalsAgainst);
      animateCountUp(statCleanSheetsEl, stats.cleanSheets);

      // 3. عرض قائمة اللاعبين (التشكيلة)
      playersGrid.innerHTML = '';
      if (!data.players || data.players.length === 0) {
        playersGrid.innerHTML = `
          <div class="col-span-full text-center py-6 text-neutral-400">
            لا يوجد لاعبون مسجلون في هذا الفريق حالياً.
          </div>
        `;
      } else {
        data.players.forEach(player => {
          const playerCard = document.createElement('div');
          playerCard.className = 'player-card bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-center flex flex-col items-center opacity-0 transform translate-y-4';
          
          const playerPhoto = player.photoUrl || '/images/default-player.png';
          
          playerCard.innerHTML = `
            <div class="w-20 h-20 rounded-full overflow-hidden bg-neutral-800 border-2 border-neutral-700 mb-3">
              <img src="${playerPhoto}" alt="${player.name}" class="w-full h-full object-cover" onerror="this.src='/images/default-player.png'">
            </div>
            <span class="text-xs font-bold text-emerald-500 mb-1">#${player.jerseyNumber || '-'}</span>
            <h4 class="text-sm font-bold text-white mb-1">${player.name}</h4>
            <p class="text-xs text-neutral-400">${player.position || 'غير محدد'}</p>
          `;
          playersGrid.appendChild(playerCard);
        });

        // تشغيل الحركة التدريجية للاعبين
        if (typeof gsap !== 'undefined') {
          gsap.to('.player-card', {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out'
          });
        } else {
          document.querySelectorAll('.player-card').forEach(c => c.classList.remove('opacity-0', 'translate-y-4'));
        }
      }

      // 4. عرض جدول المباريات (النتائج والجدول القادم)
      scheduleList.innerHTML = '';
      if (!data.schedule || data.schedule.length === 0) {
        scheduleList.innerHTML = `
          <div class="text-center py-6 text-neutral-400">
            لا توجد مباريات مجدولة أو مسجلة لهذا الفريق حالياً.
          </div>
        `;
      } else {
        data.schedule.forEach(match => {
          const matchCard = document.createElement('div');
          matchCard.className = 'match-row bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 opacity-0 transform translate-x-4';

          const formattedDate = new Date(match.matchDate).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          // تمييز حالة المباراة والنتيجة المعروضة
          let scoreDisplay = 'لم تلعب بعد';
          let statusBadge = `<span class="px-2 py-1 text-xs rounded bg-neutral-800 text-neutral-400">مجدولة</span>`;

          if (match.status === 'being_played_right_now') {
            scoreDisplay = `<span class="font-mono text-lg text-emerald-400">${match.homeScore} - ${match.awayScore}</span>`;
            statusBadge = `<span class="px-2 py-1 text-xs rounded bg-red-600 text-white animate-pulse">تُلعب الآن</span>`;
          } else if (match.status === 'finished') {
            scoreDisplay = `<span class="font-mono text-lg font-bold text-white">${match.homeScore} - ${match.awayScore}</span>`;
            statusBadge = `<span class="px-2 py-1 text-xs rounded bg-neutral-700 text-neutral-300">انتهت</span>`;
          }

          // تحديد الخصم وحالة اللعب داخل/خارج الأرض
          const isHome = match.homeTeamId === parseInt(teamId);
          const opponentName = isHome ? (match.AwayTeam?.name || 'فريق ضيف') : (match.HomeTeam?.name || 'فريق مستضيف');
          const roleText = isHome ? 'داخل الأرض' : 'خارج الأرض';

          matchCard.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="text-xs font-semibold px-2 py-1 rounded bg-neutral-800 text-neutral-400">${roleText}</span>
              <div>
                <p class="text-sm font-bold text-white">ضد ${opponentName}</p>
                <p class="text-xs text-neutral-500">${formattedDate}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">${scoreDisplay}</div>
              <div>${statusBadge}</div>
            </div>
          `;

          scheduleList.appendChild(matchCard);
        });

        // تشغيل حركة جدول المباريات
        if (typeof gsap !== 'undefined') {
          gsap.to('.match-row', {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out'
          });
        } else {
          document.querySelectorAll('.match-row').forEach(m => m.classList.remove('opacity-0', 'translate-x-4'));
        }
      }

    } catch (error) {
      console.error('Error loading team profile:', error);
      alert('حدث خطأ أثناء تحميل بيانات الملف التعريفي للفريق.');
    }
  }

  loadTeamProfile();
});