/**
 * ANADOL League - Team Profile Script
 * يجلب تفاصيل الفريق المختار (معلومات، إحصائيات، لاعبين، مباريات) ويعرضها بشكل ديناميكي مع تأثيرات بصرية وحسابية.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('id');

  if (!teamId) {
    window.location.href = 'teams.html';
    return;
  }

  // مراجع عناصر الصفحة المتطابقة تماماً مع الـ IDs الخاصة بـ team-profile.html
  const teamNameEl = document.getElementById('teamName');
  const teamCrestEl = document.getElementById('teamCrest');
  const teamDetailsEl = document.getElementById('teamDetails');
  const profileHeaderEl = document.getElementById('profileHeader');

  const statRankEl = document.getElementById('statRank');
  const statGoalsForEl = document.getElementById('statGoalsFor');
  const statGoalsAgainstEl = document.getElementById('statGoalsAgainst');
  const statCleanSheetsEl = document.getElementById('statCleanSheets');

  const playersGrid = document.getElementById('playersGrid');
  const matchesContainer = document.getElementById('matchesContainer');

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
      // 1. جلب قائمة كل الفرق لبناء خارطة ربط سريعة لشعارات وأسماء المنافسين في جدول المباريات
      const allTeams = await api.get('/teams');
      const teamsMap = {};
      allTeams.forEach(t => {
        teamsMap[t.id] = t;
      });

      // 2. جلب بيانات ملف الفريق المختار
      const data = await api.get(`/teams/${teamId}`);

      // 3. تحديث الهيدر والمعلومات الأساسية للفريق
      if (teamNameEl) teamNameEl.textContent = data.name;
      if (teamCrestEl) {
        teamCrestEl.src = data.crestUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200';
        teamCrestEl.alt = data.name;
      }
      if (teamDetailsEl) {
        teamDetailsEl.textContent = `تأسس عام: ${data.foundedYear || '-'} | الملعب الرسمي: ${data.stadium || 'غير محدد'}`;
      }
      
      const primaryColor = data.primaryColor || '#10b981';
      if (profileHeaderEl) {
        profileHeaderEl.style.borderLeft = `5px solid ${primaryColor}`;
      }

      // 4. جلب الترتيب الحالي للفريق ديناميكياً من جدول الترتيب العام المحدث
      try {
        const standings = await api.get('/standings');
        const teamStanding = standings.find(row => row.teamId === parseInt(teamId, 10));
        if (teamStanding && statRankEl) {
          statRankEl.textContent = `مركز ${teamStanding.position}`;
        } else if (statRankEl) {
          statRankEl.textContent = 'مركز --';
        }
      } catch (standingsErr) {
        console.error('Error fetching standings:', standingsErr);
        if (statRankEl) statRankEl.textContent = 'مركز --';
      }

      // 5. تحديث وعرض الإحصائيات مع تأثير الحركة التصاعدية
      const stats = data.stats || { goalsFor: 0, goalsAgainst: 0, cleanSheets: 0 };
      if (statGoalsForEl) animateCountUp(statGoalsForEl, stats.goalsFor);
      if (statGoalsAgainstEl) animateCountUp(statGoalsAgainstEl, stats.goalsAgainst);
      if (statCleanSheetsEl) animateCountUp(statCleanSheetsEl, stats.cleanSheets);

      // 6. عرض قائمة اللاعبين (التشكيلة الرسمية)
      if (playersGrid) {
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
            playerCard.className = 'card player-card player-item opacity-0 transform translate-y-4';
            
            const playerPhoto = player.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
            
            playerCard.innerHTML = `
              <div class="player-photo-wrap">
                <img src="${playerPhoto}" alt="${player.name}" class="player-photo" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'">
                <span class="player-number">${player.jerseyNumber || '-'}</span>
              </div>
              <div class="player-details">
                <h4 class="player-name">${player.name}</h4>
                <p class="player-position">${player.position || 'غير محدد'}</p>
              </div>
            `;
            playersGrid.appendChild(playerCard);
          });

          // تشغيل الحركة التدريجية للاعبين
          if (typeof gsap !== 'undefined') {
            gsap.to('.player-item', {
              opacity: 1,
              y: 0,
              duration: 0.5,
              stagger: 0.05,
              ease: 'power2.out'
            });
          } else {
            document.querySelectorAll('.player-item').forEach(c => c.classList.remove('opacity-0', 'translate-y-4'));
          }
        }
      }

      // 7. عرض جدول المباريات والنتائج
      if (matchesContainer) {
        matchesContainer.innerHTML = '';
        if (!data.schedule || data.schedule.length === 0) {
          matchesContainer.innerHTML = `
            <div class="col-span-full text-center py-12 text-neutral-400">
              لا توجد مباريات مجدولة أو مسجلة لهذا الفريق حالياً.
            </div>
          `;
        } else {
          data.schedule.forEach(match => {
            const isFinished = match.status === 'finished';
            const isBeingPlayed = match.status === 'being_played_right_now';

            const statusBadgeClass = isFinished 
              ? 'status-finished' 
              : (isBeingPlayed ? 'bg-red-600 text-white animate-pulse px-2 py-1 text-xs rounded' : 'status-scheduled');
            
            const statusText = isFinished 
              ? 'انتهت' 
              : (isBeingPlayed ? 'تُلعب الآن' : 'مجدولة');

            const formattedDate = new Date(match.matchDate).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            // استيراد تفاصيل النادي المستضيف والضيف من خارطة الربط
            const homeTeam = teamsMap[match.homeTeamId] || { name: 'فريق مستضيف', crestUrl: 'default-crest.png' };
            const awayTeam = teamsMap[match.awayTeamId] || { name: 'فريق ضيف', crestUrl: 'default-crest.png' };

            const matchStrip = document.createElement('div');
            matchStrip.className = 'match-strip match-item opacity-0 transform translate-y-4';
            matchStrip.innerHTML = `
              <!-- فريق الذهاب (الأول) -->
              <div class="match-strip-team home">
                <span class="match-strip-name">${homeTeam.name}</span>
                <img src="${homeTeam.crestUrl || 'default-crest.png'}" alt="" class="match-strip-crest" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200'">
              </div>

              <!-- النتيجة والتاريخ -->
              <div class="match-strip-center">
                <span class="match-strip-score">${(isFinished || isBeingPlayed) ? `${match.homeScore} - ${match.awayScore}` : 'VS'}</span>
                <span class="match-status-badge ${statusBadgeClass}">${statusText}</span>
                <small style="color: var(--text-muted); margin-top: 5px;">${formattedDate}</small>
              </div>

              <!-- فريق الإياب (الثاني) -->
              <div class="match-strip-team away">
                <img src="${awayTeam.crestUrl || 'default-crest.png'}" alt="" class="match-strip-crest" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200'">
                <span class="match-strip-name">${awayTeam.name}</span>
              </div>
            `;
            matchesContainer.appendChild(matchStrip);
          });

          // تشغيل حركة جدول المباريات
          if (typeof gsap !== 'undefined') {
            gsap.to('.match-item', {
              opacity: 1,
              y: 0,
              duration: 0.5,
              stagger: 0.05,
              ease: 'power2.out'
            });
          } else {
            document.querySelectorAll('.match-item').forEach(m => m.classList.remove('opacity-0', 'translate-y-4'));
          }
        }
      }

    } catch (error) {
      console.error('Error loading team profile:', error);
    }
  }

  loadTeamProfile();
});
