document.addEventListener('DOMContentLoaded', () => {
  // مراجع عناصر الواجهة (DOM Elements)
  const blogListContainer = document.getElementById('blogListContainer') || document.querySelector('.blog-list-section');
  const searchInput = document.getElementById('blogSearchInput');
  const categoryFilter = document.getElementById('blogCategoryFilter');

  // تخزين المقالات المسترجعة محلياً لتمكين البحث والتصفية الفورية دون طلبات متكررة
  let allBlogPosts = [];

  // دالة جلب المقالات من خادم الـ API
  async function loadBlogPosts() {
    try {
      if (blogListContainer) {
        blogListContainer.innerHTML = `
          <div class="text-center w-full pad-lg">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x text-accent"></i>
            <p class="text-muted mt-2">جاري جلب أحدث التحليلات والملخصات...</p>
          </div>
        `;
      }

      // استخدام الدالة الموحدة apiFetch المتوقع تواجدها في public/js/api.js
      const posts = await apiFetch('/api/blog');
      allBlogPosts = posts || [];
      
      renderBlogPosts(allBlogPosts);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      if (blogListContainer) {
        blogListContainer.innerHTML = `
          <div class="text-center w-full pad-lg text-danger">
            <i class="fa-solid fa-triangle-exclamation fa-2x"></i>
            <p class="mt-2">فشل تحميل المقالات: ${error.message || 'فشل الاتصال بالخادم'}</p>
          </div>
        `;
      }
    }
  }

  // دالة عرض المقالات في الواجهة البرمجية
  function renderBlogPosts(posts) {
    if (!blogListContainer) return;

    if (!posts || posts.length === 0) {
      blogListContainer.innerHTML = `
        <div class="text-center w-full pad-lg">
          <i class="fa-solid fa-folder-open fa-2x text-muted"></i>
          <p class="text-muted mt-2">لا توجد مقالات منشورة مطابقة لبحثك حالياً.</p>
        </div>
      `;
      return;
    }

    blogListContainer.innerHTML = '';

    // بناء الهيكل التميزي لكل مقالة
    posts.forEach(post => {
      const card = document.createElement('article');
      card.className = 'blog-card animate-card';

      // تنسيق تاريخ النشر بشكل عربي مقروء
      const publishDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // الصورة البارزة الافتراضية في حال لم تتوفر صورة مخصصة
      const imageUrl = post.featuredImageUrl || '../images/blog-default.jpg';

      card.innerHTML = `
        <div class="blog-card-image">
          <img src="${imageUrl}" alt="${post.title}" loading="lazy">
        </div>
        <div class="blog-card-content">
          <div class="blog-card-meta">
            <span class="blog-meta-item"><i class="fa-solid fa-calendar-day"></i> ${publishDate}</span>
            <span class="blog-meta-item"><i class="fa-solid fa-user"></i> ${post.author?.username || 'محرر الأناضول'}</span>
          </div>
          <h3 class="blog-card-title"><a href="blog-post.html?id=${post.id}">${post.title}</a></h3>
          <p class="blog-card-excerpt">${post.excerpt || ''}</p>
          <div class="blog-card-footer">
            <a href="blog-post.html?id=${post.id}" class="read-more-btn">
              <span>اقرأ المقال الكامل</span> <i class="fa-solid fa-arrow-left"></i>
            </a>
          </div>
        </div>
      `;

      blogListContainer.appendChild(card);
    });

    // استخدام محرك الحركات GSAP لظهور تدريجي لبطاقات المقالات عند التحميل
    if (window.gsap) {
      gsap.from('.blog-card', {
        opacity: 0,
        y: 30,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out'
      });
    }
  }

  // دالة تصفية المقالات بناءً على نص البحث
  function filterPosts() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const filtered = allBlogPosts.filter(post => {
      const matchesSearch = 
        post.title.toLowerCase().includes(query) || 
        (post.excerpt && post.excerpt.toLowerCase().includes(query)) ||
        (post.body && post.body.toLowerCase().includes(query));
        
      return matchesSearch;
    });

    renderBlogPosts(filtered);
  }

  // ربط أحداث الفلترة والبحث الفوري
  if (searchInput) {
    searchInput.addEventListener('input', filterPosts);
  }

  // البدء المباشر بجلب المقالات عند جاهزية الصفحة
  loadBlogPosts();
});