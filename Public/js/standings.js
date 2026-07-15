/**
 * ANADOL League - Standings Script
 * يجلب ويعرض جدول الترتيب المحسوب تلقائياً بناءً على المباريات المنتهية.
 */

document.addEventListener('DOMContentLoaded', () => {
  const standingsRows = document.getElementById('standings-rows');
  const loadingSpinner = document.getElementById('loading-spinner');

  async function loadStandings() {
    try {
      if (loadingSpinner) {
        loadingSpinner.style.display = 'block';
      }

      // جلب بيانات الترتيب من الـ API المحسوب
      const standings = await api.get('/standings');

      if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
      }

      if (!standings || standings.length === 0) {
        standingsRows.innerHTML = `
          <tr>
            <td colspan="10" class="text-center py-12 text-neutral-400">
              لا توجد بيانات ترتيب حالية. تظهر الحسابات هنا فور انتهاء أول مباراة رسمية.
            </td>
          </tr>
        `;
        return;
      }

      standingsRows.innerHTML = '';

      // بناء أسطر جدول الترتيب
      standings.forEach(row => {
        const tr = document.createElement('tr');
        // تهيئة التلاشي والحركة لـ GSAP
        tr.className = 'standing-row border-b border-neutral-800 hover:bg-neutral-900/50 transition opacity-0 transform translate-y-2';

        // تنسيق فارق الأهداف لإظهار إشارة (+) للأرقام الإيجابية
        const gdFormatted = row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference;

        // تمييز المراكز الثلاثة الأولى بأيقونات خاصة
        let posBadge = `<span class="font-bold text-neutral-400">${row.position}</span>`;
        if (row.position === 1) {
          posBadge = `<span class="flex items-center justify-center w-6 h-6 mx-auto rounded-full bg-yellow-500/10 text-yellow-500 font-extrabold border border-yellow-500/20 text-xs">1</span>`;
        } else if (row.position === 2) {
          posBadge = `<span class="flex items-center justify-center w-6 h-6 mx-auto rounded-full bg-slate-300/10 text-slate-300 font-extrabold border border-slate-300/20 text-xs">2</span>`;
        } else if (row.position === 3) {
          posBadge = `<span class="flex items-center justify-center w-6 h-6 mx-auto rounded-full bg-amber-700/10 text-amber-700 font-extrabold border border-amber-700/20 text-xs">3</span>`;
        }

        tr.innerHTML = `
          <td class="px-4 py-4 text-center">${posBadge}</td>
          <td class="px-4 py-4 font-bold text-white text-right">
            <a href="team-profile.html?id=${row.teamId}" class="hover:text-emerald-400 transition flex items-center gap-2">
              <span>${row.teamName}</span>
            </a>
          </td>
          <td class="px-4 py-4 text-center text-neutral-300">${row.played}</td>
          <td class="px-4 py-4 text-center text-emerald-400 font-medium">${row.won}</td>
          <td class="px-4 py-4 text-center text-neutral-400">${row.drawn}</td>
          <td class="px-4 py-4 text-center text-red-400">${row.lost}</td>
          <td class="px-4 py-4 text-center text-neutral-400 hidden md:table-cell">${row.goalsFor}</td>
          <td class="px-4 py-4 text-center text-neutral-400 hidden md:table-cell">${row.goalsAgainst}</td>
          <td class="px-4 py-4 text-center font-semibold text-neutral-300">${gdFormatted}</td>
          <td class="px-4 py-4 text-center font-bold text-emerald-400 bg-emerald-500/5">${row.points}</td>
        `;

        standingsRows.appendChild(tr);
      });

      // تشغيل تأثير الدخول التراكمي لأسطر الجدول عبر GSAP
      if (typeof gsap !== 'undefined') {
        gsap.to('.standing-row', {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.04,
          ease: 'power2.out'
        });
      } else {
        document.querySelectorAll('.standing-row').forEach(row => {
          row.classList.remove('opacity-0', 'translate-y-2');
        });
      }

    } catch (error) {
      console.error('Error loading standings:', error);
      if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
      }
      standingsRows.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-12 text-red-500">
            حدث خطأ أثناء تحميل جدول الترتيب. يرجى المحاولة لاحقاً.
          </td>
        </tr>
      `;
    }
  }

  loadStandings();
});