document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  // مسموح لكل من الـ admin والـ editor بالدخول للتحرير
  if (!token || (user.role !== 'admin' && user.role !== 'editor')) {
    window.location.href = '/admin/login.html';
    return;
  }

  // تحديث شارة الدور في الواجهة
  const userRoleEl = document.getElementById('user-role');
  if (userRoleEl) {
    userRoleEl.textContent = user.role === 'admin' ? 'مشرف رئيسي' : 'محرر محتوى';
  }

  initBlogManagement(user.role);
});

let allPosts = [];
const blogLoadingEl = document.getElementById('blog-loading');
const blogEmptyEl = document.getElementById('blog-empty');
const blogContainerEl = document.getElementById('blog-container');
const blogTableBody = document.getElementById('blog-table-body');
const blogCountEl = document.getElementById('blog-count');
const blogSearchEl = document.getElementById('blog-search');

// عناصر نافذة التعديل والإنشاء
const btnOpenBlogModal = document.getElementById('btn-open-blog-modal');
const blogModal = document.getElementById('blog-modal');
const blogForm = document.getElementById('blog-form');
const blogIdInput = document.getElementById('blog-id-input');
const blogModalTitle = document.getElementById('blog-modal-title');
const blogTitleInput = document.getElementById('blog-title');
const blogSlugInput = document.getElementById('blog-slug');

function initBlogManagement(userRole) {
  loadBlogPosts(userRole);

  if (blogSearchEl) {
    blogSearchEl.addEventListener('input', () => filterBlogPosts(userRole));
  }

  if (btnOpenBlogModal) {
    btnOpenBlogModal.addEventListener('click', () => openBlogModal());
  }

  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeBlogModal);
  });

  if (blogForm) {
    blogForm.addEventListener('submit', handleBlogSubmit);
  }

  // ميزة التوليد التلقائي للرابط الفرعي (Slug) أثناء كتابة العنوان
  if (blogTitleInput && blogSlugInput) {
    blogTitleInput.addEventListener('input', (e) => {
      // فقط نولد السبيكة تلقائياً في حال كانت العملية إضافة وليس تعديل مقال موجود
      if (!blogIdInput.value) {
        blogSlugInput.value = generateSlug(e.target.value);
      }
    });
  }
}

// دالة توليد السلج (Slug) تلقائياً بشكل صديق لمحركات البحث
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // استبدال المسافات بشرطات
    .replace(/[^\u0621-\u064A\w\-]+/g, '') // إزالة كافة الحروف والرموز ما عدا الحروف العربية والإنجليزية والشرطات
    .replace(/\-\-+/g, '-')         // استبدال الشرطات المتكررة بشرطة واحدة
    .replace(/^-+/, '')             // تنظيف الأطراف من الشرطات في البداية
    .replace(/-+$/, '');            // تنظيف الأطراف من الشرطات في النهاية
}

// جلب المقالات من السيرفر
async function loadBlogPosts(userRole) {
  try {
    showEl(blogLoadingEl);
    hideEl(blogContainerEl);
    hideEl(blogEmptyEl);

    const posts = await fetchAPI('/api/blog');
    allPosts = posts || [];
    if (blogCountEl) {
      blogCountEl.textContent = allPosts.length;
    }

    if (allPosts.length === 0) {
      hideEl(blogLoadingEl);
      showEl(blogEmptyEl);
      return;
    }

    renderBlogTable(allPosts, userRole);
    hideEl(blogLoadingEl);
    showEl(blogContainerEl);
  } catch (err) {
    console.error('حدث خطأ أثناء جلب منشورات المدونة:', err);
    alert('تعذر تحميل المقالات من الخادم حالياً.');
  }
}

// عرض المقالات في جدول التحكم
function renderBlogTable(posts, userRole) {
  if (!blogTableBody) return;
  blogTableBody.innerHTML = '';

  posts.forEach(post => {
    const publishedDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800/50 hover:bg-slate-900/40 transition duration-150 blog-row';

    // تمييز أزرار الحذف: تكون غير نشطة أو مخفية لغير الـ admin
    const deleteButtonHtml = userRole === 'admin' 
      ? `<button class="btn-delete-post text-slate-400 hover:text-brand-danger p-1.5 transition" title="حذف المقال نهائياً" data-id="${post.id}">
          <i class="fa-solid fa-trash-can text-sm"></i>
         </button>`
      : `<button class="text-slate-700 cursor-not-allowed p-1.5" title="لا تملك صلاحية حذف المقالات" disabled>
          <i class="fa-solid fa-trash-can text-sm"></i>
         </button>`;

    tr.innerHTML = `
      <td class="py-4 px-4">
        <img src="${post.featuredImageUrl || '/img/default-blog.png'}" alt="" class="w-16 h-10 object-cover rounded border border-slate-800">
      </td>
      <td class="py-4 px-4 font-bold text-white max-w-xs truncate">${post.title}</td>
      <td class="py-4 px-4 text-xs font-mono text-slate-400 max-w-[150px] truncate" dir="ltr">${post.slug}</td>
      <td class="py-4 px-4 text-xs text-slate-400">${publishedDate}</td>
      <td class="py-4 px-4 text-left">
        <div class="flex items-center justify-end gap-2">
          <button class="btn-edit-post text-slate-400 hover:text-brand-accent p-1.5 transition" title="تعديل المقال" data-id="${post.id}">
            <i class="fa-solid fa-pen-to-square text-sm"></i>
          </button>
          ${deleteButtonHtml}
        </div>
      </td>
    `;

    blogTableBody.appendChild(tr);
  });

  // ربط أحداث الأزرار ديناميكياً
  document.querySelectorAll('.btn-edit-post').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      editBlogPost(id);
    });
  });

  document.querySelectorAll('.btn-delete-post').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      deleteBlogPost(id, userRole);
    });
  });

  if (window.gsap) {
    gsap.from('.blog-row', { opacity: 0, y: 10, duration: 0.3, stagger: 0.05, ease: 'power2.out' });
  }
}

// تصفية وعمل تصفح بالبحث اللحظي
function filterBlogPosts(userRole) {
  const query = blogSearchEl.value.trim().toLowerCase();
  if (!query) {
    renderBlogTable(allPosts, userRole);
    return;
  }

  const filtered = allPosts.filter(p => p.title.toLowerCase().includes(query) || p.slug.toLowerCase().includes(query));
  renderBlogTable(filtered, userRole);
}

// نافذة تعديل وإنشاء المقالات
async function openBlogModal(post = null) {
  if (!blogModal) return;

  if (post) {
    blogModalTitle.textContent = 'تعديل مقال المدونة';
    if (blogIdInput) blogIdInput.value = post.id;
    if (blogTitleInput) blogTitleInput.value = post.title;
    if (blogSlugInput) blogSlugInput.value = post.slug;
    document.getElementById('blog-image').value = post.featuredImageUrl || '';
    document.getElementById('blog-excerpt').value = post.excerpt || '';
    document.getElementById('blog-body').value = post.body || '';
  } else {
    blogModalTitle.textContent = 'إنشاء مقال جديد';
    if (blogForm) blogForm.reset();
    if (blogIdInput) blogIdInput.value = '';
  }

  blogModal.classList.remove('hidden');
  setTimeout(() => {
    blogModal.classList.add('opacity-100');
    const transformEl = blogModal.querySelector('.transform');
    if (transformEl) transformEl.classList.remove('scale-95');
  }, 10);
}

function closeBlogModal() {
  if (!blogModal) return;
  blogModal.classList.remove('opacity-100');
  const transformEl = blogModal.querySelector('.transform');
  if (transformEl) transformEl.classList.add('scale-95');
  setTimeout(() => {
    blogModal.classList.add('hidden');
  }, 300);
}

// إرسال النموذج لحفظ أو تعديل المقال
async function handleBlogSubmit(e) {
  e.preventDefault();

  const id = blogIdInput ? blogIdInput.value : '';
  const payload = {
    title: document.getElementById('blog-title').value,
    slug: document.getElementById('blog-slug').value,
    featuredImageUrl: document.getElementById('blog-image').value,
    excerpt: document.getElementById('blog-excerpt').value,
    body: document.getElementById('blog-body').value
  };

  try {
    let result;
    if (id) {
      result = await fetchAPI(`/api/blog/${id}`, 'PUT', payload);
    } else {
      result = await fetchAPI('/api/blog', 'POST', payload);
    }

    if (result && result.success) {
      closeBlogModal();
      // استعادة الدور لإعادة عرض قائمة المقالات بشكل صحيح
      const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');
      await loadBlogPosts(user.role);
    }
  } catch (err) {
    console.error('فشل في حفظ المقال:', err);
    alert('حدث خطأ أثناء حفظ المقال، يرجى مراجعة الحقول والروابط.');
  }
}

// جلب المقال الكامل لتعديله
async function editBlogPost(id) {
  try {
    // يجب استدعاء المقال الفردي لجلب حقل body المحتوى الكامل
    const post = await fetchAPI(`/api/blog/${id}`);
    if (post) {
      openBlogModal(post);
    }
  } catch (err) {
    console.error('خطأ في جلب تفاصيل المقال للتعديل:', err);
    alert('تعذر تحميل بيانات المقال من الخادم.');
  }
}

// حذف مقال (صلاحية المشرف فقط)
async function deleteBlogPost(id, userRole) {
  if (userRole !== 'admin') {
    alert('أنت لا تملك الصلاحية الأمنية لإجراء الحذف.');
    return;
  }

  if (confirm('هل أنت متأكد من رغبتك في حذف هذا المقال الفني نهائياً من المدونة؟ لا يمكن التراجع عن هذا الإجراء.')) {
    try {
      const response = await fetchAPI(`/api/blog/${id}`, 'DELETE');
      if (response && response.success) {
        await loadBlogPosts(userRole);
      }
    } catch (err) {
      console.error('حدث خطأ أثناء محاولة حذف المقال:', err);
      alert('فشل السيرفر في حذف المقال المطلوب.');
    }
  }
}

// دوال التحكم بالعرض المساعد
function showEl(el) {
  if (el) el.classList.remove('hidden');
}

function hideEl(el) {
  if (el) el.classList.add('hidden');
}