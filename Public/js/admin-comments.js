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

  // تحميل كافة التعليقات تلقائياً فور فتح اللوحة
  await loadSelectedComments();
}

// جلب المقالات لتعبئة القائمة المنسدلة للتصفية
async function loadBlogPostsFilter() {
  try {
    const posts = await fetchAPI('/api/blog');
    allBlogPosts = posts || [];

    if (filterBlogSelect) {
      filterBlogSelect.innerHTML = '<option value="all">عرض كافة التعليقات (جميع المقالات)...</option>';
      allBlogPosts.forEach(post => {
        filterBlogSelect.innerHTML += `<option value="${post.id}">${post.title}</option>`;
      });
    }
  } catch (err) {
    console.error('خطأ أثناء جلب مقالات المدونة لفلترة التعليقات:', err);
  }
}

// تحميل التعليقات (سواءً لكافة المقالات أو لمقال محدد)
async function loadSelectedComments() {
  try {
    showEl(commentsLoadingEl);
    hideEl(commentsContainerEl);
    hideEl(commentsEmptyEl);

    let comments = [];
    if (selectedBlogId === 'all') {
      comments = await fetchAPI('/api/comments');
    } else {
      comments = await fetchAPI(`/api/blog/${selectedBlogId}/comments`);
    }
    
    if (!comments || comments.length === 0) {
      hideEl(commentsLoadingEl);
      showEl(commentsEmptyEl);
      if (commentsEmptyEl) {
        commentsEmptyEl.querySelector('p').textContent = 'لا توجد تعليقات مسجلة أو مضافة حالياً.';
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

  comments.forEach(comment => {
    const activePost = allBlogPosts.find(p => p.id == comment.blogPostId) || { title: 'تحليل عام' };

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
