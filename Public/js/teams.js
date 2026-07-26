/**
 * ANADOL League - Teams Gallery Script
 * يجلب قائمة الفرق ويعرضها بشكل شبكي ديناميكي مع تأثير حركة الدخول التدريجي.
 */

document.addEventListener('DOMContentLoaded', () => {
  // تصحيح المعرّف ليتطابق تماماً مع المعرّف الموجود في ملف HTML (teamsGrid)
  const teamsContainer = document.getElementById('teamsGrid');
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

      if (!teamsContainer) return;

      // تفريغ الحاوية تماماً لإزالة جميع الفرق الوهمية المكتوبة في كود الـ HTML
      teamsContainer.innerHTML = '';

      if (!teams || teams.length === 0) {
        teamsContainer.innerHTML = `
          <div class="col-span-full text-center py-12 text-neutral-400">
            <p class="text-lg">لا توجد فرق مضافة حالياً في الدوري.</p>
          </div>
        `;
        return;
      }

      // بناء عناصر العرض للفرق المستوردة من قاعدة البيانات الحية
      teams.forEach(team => {
        const teamCard = document.createElement('div');
        
        // إعطاء الكلاسات الأصلية لتتوافق مع التنسيق العام ونظام البحث الفوري
        teamCard.className = 'card team-card team-item transition hover:border-emerald-500 duration-300 opacity-0 transform translate-y-4';
        teamCard.setAttribute('data-name', team.name);
        
        // استخدام شعار افتراضي لائق في حال لم يقم الأدمن برفع شعار مخصص
        const crestUrl = team.crestUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200';

        teamCard.innerHTML = `
          <img src="${crestUrl}" alt="${team.name}" class="team-card-crest" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200'">
          <h3 class="team-card-name">${team.name}</h3>
          <p class="team-card-stadium">
            <i class="fa-solid fa-location-dot"></i> ${team.stadium || 'ملعب غير محدد'}
          </p>
          <div style="margin-top: auto; width: 100%;">
            <a href="team-profile.html?id=${team.id}" class="btn btn-secondary btn-sm" style="display: block; width: 100%;">
              عرض ملف الفريق
            </a>
          </div>
        `;

        teamsContainer.appendChild(teamCard);
      });

      // تشغيل تأثيرات الدخول التدريجي عبر مكتبة GSAP
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
      if (teamsContainer) {
        teamsContainer.innerHTML = `
          <div class="col-span-full text-center py-12 text-red-500">
            <p class="text-lg">حدث خطأ أثناء تحميل بيانات الفرق. يرجى المحاولة لاحقاً.</p>
          </div>
        `;
      }
    }
  }

  loadTeams();
});
