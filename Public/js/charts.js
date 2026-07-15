/**
 * ANADOL League - Analytics & Charts Engine
 * ملف الخدمات الرسومية لرسم الخرائط الحرارية والمخططات الإحصائية عبر Chart.js والـ Canvas المتجاوب.
 */

const AnadolCharts = {
  /**
   * رسم خريطة حرارية تفاعلية على أرضية الملعب باستخدام Canvas
   * @param {string} canvasId - معرّف عنصر الكانفاس المستهدف
   * @param {Array} heatmapData - مصفوفة النقاط بالصيغة [{x, y, type}] من 0 إلى 100
   */
  renderHeatmap(canvasId, heatmapData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`Canvas element with ID "${canvasId}" not found.`);
      return;
    }

    const ctx = canvas.getContext('2d');
    
    // دالة لتعديل أبعاد الكانفاس ديناميكياً وفق أبعاد العنصر الحاضن له (تجاوب كامل)
    function resizeCanvas() {
      const rect = canvas.parentNode.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height || 300; // ارتفاع افتراضي ذكي
      drawHeatmapPoints();
    }

    // رسم النقاط المتوهجة (Glow) والخرائط الحرارية
    function drawHeatmapPoints() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!heatmapData || heatmapData.length === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '14px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('لا توجد بيانات أحداث مسجلة لهذه المباراة حتى الآن.', canvas.width / 2, canvas.height / 2);
        return;
      }

      heatmapData.forEach(point => {
        // تحويل الإحداثيات المئوية (0-100) إلى بكسلات حقيقية متناسبة مع الشاشة الحالية
        const pxX = (point.x / 100) * canvas.width;
        const pxY = (point.y / 100) * canvas.height;

        // تحديد اللون بناءً على نوع الحدث لتمييز الانتشار بصرياً
        let colorGlow = 'rgba(239, 68, 68, '; // أحمر افتراضي للأحداث العامة
        if (point.type === 'goal') {
          colorGlow = 'rgba(16, 185, 129, '; // أخضر للأهداف
        } else if (point.type === 'yellow_card' || point.type === 'red_card') {
          colorGlow = 'rgba(245, 158, 11, '; // برتقالي/أصفر للكروت
        }

        // إنشاء تدرج شعاعي لإعطاء مظهر التوهج الحراري الاحترافي
        const radius = Math.min(canvas.width, canvas.height) * 0.08; // حجم توهج نسبي متناسب مع حجم الملعب
        const gradient = ctx.createRadialGradient(pxX, pxY, 2, pxX, pxY, radius);
        gradient.addColorStop(0, `${colorGlow}0.6)`);
        gradient.addColorStop(0.5, `${colorGlow}0.2)`);
        gradient.addColorStop(1, `${colorGlow}0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pxX, pxY, radius, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // رصد وتعديل الحجم عند تغيير حجم النافذة لضمان التجاوب المستمر
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // تشغيل أولي
  },

  /**
   * إنشاء مخطط راداري لمقارنة مهارات وأرقام اللاعب الإحصائية عبر Chart.js
   * @param {string} canvasId - معرّف عنصر الكانفاس
   * @param {object} statsData - كائن الإحصائيات التراكمية للاعب {goals, assists, yellowCards, redCards, minutesPlayed}
   */
  renderPlayerStatsChart(canvasId, statsData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js library is not loaded.');
      return;
    }

    const ctx = canvas.getContext('2d');

    // تدمير أي مخطط سابق على نفس الكانفاس لمنع تداخل الرسومات عند إعادة التحميل
    const existingChart = Chart.getChart(canvasId);
    if (existingChart) {
      existingChart.destroy();
    }

    const labels = ['الأهداف', 'التمريرات الحاسمة', 'البطاقات الصفراء', 'البطاقات الحمراء', 'المباريات المقدرة'];
    // تحويل دقائق اللعب التقديرية إلى مباريات تقريبية لتسهيل المقارنة على المخطط
    const matchesEstimated = Math.round(statsData.minutesPlayed / 90) || 0;
    const dataValues = [
      statsData.goals || 0,
      statsData.assists || 0,
      statsData.yellowCards || 0,
      statsData.redCards || 0,
      matchesEstimated
    ];

    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'إحصائيات الموسم التراكمية',
          data: dataValues,
          backgroundColor: 'rgba(16, 185, 129, 0.2)', // شفافية اللون الأساسي للنادي (Emerald)
          borderColor: 'rgba(16, 185, 129, 1)',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#9ca3af', // لون خط التسمية توضيحي رمادي متناسق مع المظهر الداكن
              font: {
                family: 'Tajawal, sans-serif'
              }
            }
          }
        },
        scales: {
          r: {
            angleLines: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            pointLabels: {
              color: '#e5e7eb',
              font: {
                family: 'Tajawal, sans-serif',
                size: 11
              }
            },
            ticks: {
              backdropColor: 'transparent',
              color: '#9ca3af',
              font: {
                size: 9
              },
              precision: 0 // عرض أرقام صحيحة فقط للإحصائيات
            }
          }
        }
      }
    });
  }
};

// جعل المحرك متاحاً عالمياً
window.AnadolCharts = AnadolCharts;