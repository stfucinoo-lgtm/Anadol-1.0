/**
 * ANADOL League - Animations Helper Module
 * يجمع هذا الملف الإعدادات والمؤثرات المشتركة باستخدام مكتبة GSAP.
 */

const AnadolAnims = {
    /**
     * التحقق من توفر مكتبة GSAP في الصفحة لتفادي الأخطاء البرمجية
     */
    isGsapLoaded() {
        return typeof gsap !== 'undefined';
    },

    /**
     * حركة ظهور تدريجي بسيطة (Fade In)
     * @param {string|HTMLElement} target - العنصر المستهدف
     * @param {Object} options - خيارات الحركة الاختيارية
     */
    fadeIn(target, options = {}) {
        if (!this.isGsapLoaded()) return;

        const defaults = {
            duration: 0.8,
            opacity: 0,
            y: 20,
            ease: "power2.out",
            delay: 0
        };

        const config = { ...defaults, ...options };
        gsap.from(target, config);
    },

    /**
     * حركة ظهور متتابعة لمجموعات من العناصر (مثل شبكة البطاقات أو صفوف الجدول)
     * @param {string|NodeList} targets - العناصر المستهدفة
     * @param {Object} options - خيارات الحركة المتتابعة
     */
    staggerIn(targets, options = {}) {
        if (!this.isGsapLoaded()) return;

        const defaults = {
            duration: 0.6,
            opacity: 0,
            y: 30,
            stagger: 0.1,
            ease: "power2.out",
            delay: 0
        };

        const config = { ...defaults, ...options };
        gsap.from(targets, config);
    },

    /**
     * عداد تصاعدي تفاعلي للأرقام والإحصائيات
     * @param {string|HTMLElement} target - عنصر النص الذي يحتوي الرقم
     * @param {number} targetValue - الرقم النهائي المطلوب الوصول إليه
     * @param {Object} options - خيارات مخصصة مثل مدة الحركة والترميز
     */
    countUp(target, targetValue, options = {}) {
        if (!this.isGsapLoaded()) {
            // حل بديل في حال عدم تحميل المكتبة لتظهر القيمة مباشرة
            const el = typeof target === 'string' ? document.querySelector(target) : target;
            if (el) el.textContent = targetValue;
            return;
        }

        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (!el) return;

        const defaults = {
            duration: 1.5,
            ease: "power1.out",
            delay: 0
        };

        const config = { ...defaults, ...options };
        const obj = { val: 0 };

        gsap.to(obj, {
            val: targetValue,
            duration: config.duration,
            delay: config.delay,
            ease: config.ease,
            onUpdate: function () {
                el.textContent = Math.floor(obj.val);
            }
        });
    },

    /**
     * حركة النبض البصري الخفيف للمؤشرات الحية (Pulse Animation)
     * @param {string|HTMLElement} target - العنصر المستهدف
     */
    pulse(target) {
        if (!this.isGsapLoaded()) return;

        gsap.to(target, {
            scale: 1.05,
            opacity: 0.8,
            duration: 0.8,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut"
        });
    },

    /**
     * حركة تفعيل ظهور العناصر عند التمرير (Scroll-Triggered Fade-In)
     * تتطلب تفعيل إضافة ScrollTrigger الخاصة بـ GSAP في الصفحة.
     * @param {string|HTMLElement} target - العنصر المستهدف
     * @param {Object} options - خيارات الحركة
     */
    scrollTriggerFade(target, options = {}) {
        if (!this.isGsapLoaded() || typeof ScrollTrigger === 'undefined') {
            // تفعيل حركة ظهور عادية كبديل في حال غياب ScrollTrigger
            this.fadeIn(target, options);
            return;
        }

        const defaults = {
            duration: 0.8,
            opacity: 0,
            y: 30,
            ease: "power2.out",
            start: "top 85%" // يبدأ التأثير عندما يصل أعلى العنصر إلى 85% من ارتفاع الشاشة
        };

        const config = { ...defaults, ...options };

        gsap.from(target, {
            scrollTrigger: {
                trigger: target,
                start: config.start,
                toggleActions: "play none none none"
            },
            opacity: config.opacity,
            y: config.y,
            duration: config.duration,
            ease: config.ease
        });
    }
};

// جعل الكائن متاحاً في النطاق العالمي للمتصفح
window.AnadolAnims = AnadolAnims;