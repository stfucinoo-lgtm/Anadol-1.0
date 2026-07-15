/**
 * ANADOL League - Teams Gallery Script
 * يجلب قائمة الفرق ويعرضها بشكل شبكي ديناميكي مع تأثير حركة الدخول التدريجي.
 */

document.addEventListener('DOMContentLoaded', () => {
  const teamsContainer = document.getElementById('teams-grid');
  const loadingSpinner = document.getElementById('loading-spinner');

  async function loadTeams() {
    try {
      if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
      }

      // جلب الفرق من خلال مغلّف الـ API
      const teams = await api.get('/teams');

      if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
      }

      if (!teams || teams.length === 0) {
        teamsContainer.innerHTML = `
          <div class="col-span-full text-center py-12 text-neutral-400">
            <p class="text-lg">لا توجد فرق مضافة حالياً في الدوري.</p>
          </div>
        `;
        return;
      }

      // تفريغ الحاوية قبل التحديث
      teamsContainer.innerHTML = '';

      // بناء عناصر العرض للفرق
      teams.forEach(team => {
        const teamCard = document.createElement('div');
        // الفئات الافتراضية للتحضير لحركة GSAP
        teamCard.className = 'team-card bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-between transition hover:border-emerald-500 duration-300 opacity-0 transform translate-y-4';
        
        const crestUrl = team.crestUrl || '/images/default-crest.png';
        const badgeColor = team.primaryColor || '#10b981';

        teamCard.innerHTML = `
          <div class="relative w-24 h-24 mb-4 flex items-center justify-center rounded-full bg-neutral-800 p-2 border-2" style="border-color: ${badgeColor}">
            <img src="${crestUrl}" alt="${team.name}" class="w-20 h-20 object-contain" onerror="this.src='/images/default-crest.png'">
          </div>
          <h3 class="text-xl font-bold text-white mb-1 text-center">${team.name}</h3>
          <p class="text-xs text-neutral-400 mb-3 flex items-center gap-1">
            <span>🏟️</span> ${team.stadium || 'ملعب غير محدد'}
          </p>
          <div class="text-xs text-neutral-500 mb-5">تأسس عام: ${team.foundedYear || '-'}</div>
          <a href="team-profile.html?id=${team.id}" class="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
            عرض الملف الكامل
          </a>
        `;

        teamsContainer.appendChild(teamCard);
      });

      // تشغيل تأثيرات الدخول عبر GSAP إن وجدت المكتبة، أو إظهار العناصر مباشرة كبديل آمن
      if (typeof gsap !== 'undefined') {
        gsap.to('.team-card', {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out'
        });
      } else {
        document.querySelectorAll('.team-card').forEach(card => {
          card.classList.remove('opacity-0', 'translate-y-4');
        });
      }

    } catch (error) {
      console.error('Error loading teams:', error);
      if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
      }
      teamsContainer.innerHTML = `
        <div class="col-span-full text-center py-12 text-red-500">
          <p class="text-lg">حدث خطأ أثناء تحميل بيانات الفرق. يرجى المحاولة لاحقاً.</p>
        </div>
      `;
    }
  }

  loadTeams();
});