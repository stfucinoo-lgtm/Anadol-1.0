/**
 * ANADOL League - Standings Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const standingsTableBody = document.getElementById('standingsTableBody');

  async function loadStandings() {
    try {
      const standings = await api.get('/standings');

      if (!standingsTableBody) return;

      standingsTableBody.innerHTML = '';

      if (!Array.isArray(standings) || standings.length === 0) {
        standingsTableBody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
              لا توجد فرق مضافة أو بيانات ترتيب حالية. تظهر الحسابات هنا فور إضافة الأندية وخوض المباريات.
            </td>
          </tr>
        `;
        return;
      }

      standings.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'standing-row-item opacity-0 transform translate-y-3';
        tr.setAttribute('data-team-id', row.teamId);

        let gdFormatted = row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference;
        let gdColor = 'var(--text-main)';
        if (row.goalDifference > 0) {
          gdColor = 'var(--success)';
        } else if (row.goalDifference < 0) {
          gdColor = 'var(--danger)';
        }

        const crestUrl = row.crestUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=100';

        tr.innerHTML = `
          <td class="rank-cell">${row.position}</td>
          <td>
            <a href="team-profile.html?id=${row.teamId}" class="team-cell">
              <img src="${crestUrl}" alt="${row.teamName}" class="team-cell-crest" onerror="this.src='https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=100'">
              <span class="team-cell-name">${row.teamName}</span>
            </a>
          </td>
          <td style="text-align: center;">${row.played}</td>
          <td style="text-align: center;">${row.won}</td>
          <td style="text-align: center;">${row.drawn}</td>
          <td style="text-align: center;">${row.lost}</td>
          <td style="text-align: center;">${row.goalsFor}</td>
          <td style="text-align: center;">${row.goalsAgainst}</td>
          <td style="text-align: center; color: ${gdColor}; font-weight: 700;">${gdFormatted}</td>
          <td style="text-align: center;" class="points-cell">
            <span class="pts-val font-bold text-emerald-400" data-target="${row.points}">0</span>
          </td>
        `;

        standingsTableBody.appendChild(tr);
      });

      if (typeof gsap !== 'undefined') {
        gsap.to('.standing-row-item', {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.06,
          ease: 'power2.out',
          onComplete: () => {
            document.querySelectorAll('.pts-val').forEach(el => {
              const targetVal = parseInt(el.getAttribute('data-target'), 10) || 0;
              if (typeof AnadolAnims !== 'undefined' && AnadolAnims.countUp) {
                AnadolAnims.countUp(el, targetVal, { duration: 1.0 });
              } else {
                el.textContent = targetVal;
              }
            });
          }
        });
      } else {
        document.querySelectorAll('.standing-row-item').forEach(row => {
          row.classList.remove('opacity-0', 'translate-y-3');
        });
        document.querySelectorAll('.pts-val').forEach(el => {
          el.textContent = el.getAttribute('data-target') || '0';
        });
      }

    } catch (error) {
      console.error('Error loading standings:', error);
      if (standingsTableBody) {
        standingsTableBody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 2rem; color: #ef4444;">
              حدث خطأ أثناء تحميل جدول الترتيب الحي. يرجى المحاولة لاحقاً.
            </td>
          </tr>
        `;
      }
    }
  }

  loadStandings();
});
