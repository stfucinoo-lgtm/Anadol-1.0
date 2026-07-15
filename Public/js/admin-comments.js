document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  // السماح لكل من المشرف والمحرر بالإشراف وحذف التعليقات
  if (!token || (user.role !== 'admin' && user.role !== 'editor')) {
    window.location.href = '/admin/login.html';
    return;
  }

  // إبراز نوع الصلاحية على الشاشة
  const userRoleEl = document.getElementById('user-role');
  if (userRoleEl) {
    userRoleEl.textContent = user.role === 'admin' ? 'مشرف رئيسي' : 'محرر محتوى';
  }

  initCommentsManagement();
});

let allBlogPosts = [];
let selectedBlogId = 'all';

// ربط عناصر واجهة التعليقات
const commentsLoadingEl = document.getElementById('comments-loading');
const commentsEmptyEl = document.getElementById('comments-empty');
const commentsContainerEl = document.getElementById('comments-container');
const commentsTableBody = document.getElementById('comments-table-body');
const filterBlogSelect = document.getElementById('filter-blog-id');

async function initCommentsManagement() {
  await loadBlogPostsFilter();

  if (filterBlogSelect) {
    filterBlogSelect.addEventListener('change', (e) => {
      selectedBlogId = e.target.value;
      loadSelectedComments();
    });
  }
}

// جلب المقالات لتعبئة القائمة المنسدلة للتصفية
async function loadBlogPostsFilter() {
  try {
    const posts = await fetchAPI('/api/blog');
    allBlogPosts = posts || [];

    if (filterBlogSelect) {
      filterBlogSelect.innerHTML = '<option value="all">اختر مقالاً لعرض تعليقاته...</option>';
      allBlogPosts.forEach(post => {
        filterBlogSelect.innerHTML += `<option value="${post.id}">${post.title}</option>`;
      });
    }

    // افتراضياً، نعرض شاشة فارغة تدعو لاختيار مقال أولاً
    hideEl(commentsLoadingEl);
    showEl(commentsEmptyEl);
    if (commentsEmptyEl) {
      commentsEmptyEl.querySelector('p').textContent = 'الرجاء تصفية العرض باختيار مقال محدد لعرض تعليقاته المضافة والتحكم بها.';
    }
  } catch (err) {
    console.error('خطأ أثناء جلب مقالات المدونة لفلترة التعليقات:', err);
    alert('تعذر تحميل الفلاتر من الخادم.');
  }
}

// تحميل التعليقات التابعة للمقال المحدد
async function loadSelectedComments() {
  if (selectedBlogId === 'all') {
    hideEl(commentsLoadingEl);
    hideEl(commentsContainerEl);
    showEl(commentsEmptyEl);
    if (commentsEmptyEl) {
      commentsEmptyEl.querySelector('p').textContent = 'الرجاء تصفية العرض باختيار مقال محدد لعرض تعليقاته المضافة والتحكم بها.';
    }
    return;
  }

  try {
    showEl(commentsLoadingEl);
    hideEl(commentsContainerEl);
    hideEl(commentsEmptyEl);

    // استدعاء التعليقات الخاصة بمقال محدد
    const comments = await fetchAPI(`/api/blog/${selectedBlogId}/comments`);
    
    if (!comments || comments.length === 0) {
      hideEl(commentsLoadingEl);
      showEl(commentsEmptyEl);
      if (commentsEmptyEl) {
        commentsEmptyEl.querySelector('p').textContent = 'لا توجد تعليقات مسجلة أو مضافة تحت هذا المقال.';
      }
      return;
    }

    renderCommentsTable(comments);
    hideEl(commentsLoadingEl);
    showEl(commentsContainerEl);
  } catch (err) {
    console.error('حدث خطأ أثناء تحميل تعليقات المقال:', err);
    alert('فشل استرداد بيانات التعليقات.');
    hideEl(commentsLoadingEl);
    showEl(commentsEmptyEl);
  }
}

// بناء جدول التعليقات ديناميكياً
function renderCommentsTable(comments) {
  if (!commentsTableBody) return;
  commentsTableBody.innerHTML = '';

  const activePost = allBlogPosts.find(p => p.id == selectedBlogId) || { title: 'مقال غير معروف' };

  comments.forEach(comment => {
    const writtenDate = new Date(comment.createdAt).toLocaleString('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800/50 hover:bg-slate-900/40 transition duration-150 comment-row';

    tr.innerHTML = `
      <td class="py-4 px-4 font-semibold text-slate-200">
        <i class="fa-solid fa-user text-[10px] text-brand-accent ml-1"></i>
        ${comment.username || 'زائر مجهول'}
      </td>
      <td class="py-4 px-4 text-xs text-slate-400 max-w-[140px] truncate" title="${activePost.title}">
        ${activePost.title}
      </td>
      <td class="py-4 px-4 text-slate-300 max-w-sm whitespace-pre-wrap leading-relaxed text-xs">
        ${comment.content}
      </td>
      <td class="py-4 px-4 text-[11px] text-slate-500 font-mono" dir="ltr">${writtenDate}</td>
      <td class="py-4 px-4 text-left">
        <button class="btn-delete-comment text-slate-500 hover:text-brand-danger p-1.5 transition" title="حذف التعليق" data-id="${comment.id}">
          <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
      </td>
    `;

    commentsTableBody.appendChild(tr);
  });

  // ربط أحداث أزرار الحذف ديناميكياً
  document.querySelectorAll('.btn-delete-comment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      deleteComment(id);
    });
  });

  if (window.gsap) {
    gsap.from('.comment-row', { opacity: 0, y: 10, duration: 0.25, stagger: 0.04, ease: 'power2.out' });
  }
}

// تنفيذ حذف التعليق
async function deleteComment(id) {
  if (confirm('هل أنت متأكد من رغبتك في حذف هذا التعليق نهائياً لمخالفته القواعد والآداب الرياضية؟ لا يمكن التراجع.')) {
    try {
      const response = await fetchAPI(`/api/comments/${id}`, 'DELETE');
      if (response && response.success) {
        // إعادة تحميل التعليقات للمقال الحالي
        await loadSelectedComments();
      }
    } catch (err) {
      console.error('حدث خطأ أثناء محاولة حذف التعليق من السيرفر:', err);
      alert('فشلت محاولة حذف التعليق، يرجى المحاولة لاحقاً.');
    }
  }
}

// دوال التحكم المساعدة
function showEl(el) {
  if (el) el.classList.remove('hidden');
}

function hideEl(el) {
  if (el) el.classList.add('hidden');
}