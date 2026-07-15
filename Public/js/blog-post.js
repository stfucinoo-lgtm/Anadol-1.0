document.addEventListener('DOMContentLoaded', () => {
  // استخلاص معرّف المقال من الـ Query Parameter الرابط المباشر
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) {
    alert('مقال غير صالح أو لم يتم تحديد المعرّف بالشكل الصحيح.');
    window.location.href = 'blog.html';
    return;
  }

  // مراجع البيانات والواجهات المتوقعة بالصفحة (DOM Elements)
  const postHeaderSection = document.getElementById('postHeaderSection');
  const postBodySection = document.getElementById('postBodySection');
  const commentsList = document.getElementById('commentsList');
  const commentFormContainer = document.getElementById('commentFormContainer');
  const addCommentForm = document.getElementById('addCommentForm');
  const commentContentInput = document.getElementById('commentContent');

  // بيانات المستخدم والتوكن للتحقق من الصلاحيات والتعليقات
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  // 1. جلب وعرض تفاصيل المقال الكامل
  async function loadPostDetails() {
    try {
      const post = await apiFetch(`/api/blog/${postId}`);
      if (!post) {
        throw new Error('المقال المطلوب غير موجود أو تم حذفه.');
      }

      // تنسيق وعرض التاريخ
      const publishDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // أ) تعبئة الهيدر البارز وصورة المقال
      if (postHeaderSection) {
        postHeaderSection.innerHTML = `
          <div class="post-hero-banner" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.85)), url('${post.featuredImageUrl || '../images/blog-default.jpg'}')">
            <div class="container hero-content-wrapper">
              <span class="post-category-tag">تحليل فني</span>
              <h1 class="post-title-main">${post.title}</h1>
              <div class="post-author-meta">
                <span class="meta-item"><i class="fa-solid fa-user-pen"></i> بقلم: ${post.author?.username || 'محرر الأناضول'}</span>
                <span class="meta-item"><i class="fa-solid fa-calendar-check"></i> نُشر في: ${publishDate}</span>
              </div>
            </div>
          </div>
        `;
      }

      // ب) تعبئة متن المقال التفصيلي
      if (postBodySection) {
        postBodySection.innerHTML = `
          <div class="post-rich-text">
            ${post.body}
          </div>
        `;
      }

      // تطبيق حركة ظهور ناعمة باستخدام GSAP
      if (window.gsap) {
        gsap.from('.post-hero-banner .hero-content-wrapper > *', {
          opacity: 0,
          y: 20,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power2.out'
        });
        gsap.from('.post-rich-text', {
          opacity: 0,
          y: 30,
          duration: 0.8,
          delay: 0.3,
          ease: 'power2.out'
        });
      }

    } catch (error) {
      console.error('Error loading post details:', error);
      if (postBodySection) {
        postBodySection.innerHTML = `
          <div class="alert alert-danger text-center pad-lg">
            <i class="fa-solid fa-circle-exclamation fa-2x"></i>
            <p class="mt-2">حدث خطأ أثناء تحميل المقال: ${error.message}</p>
            <a href="blog.html" class="btn-primary mt-3 inline-block">العودة لقائمة التحليلات</a>
          </div>
        `;
      }
    }
  }

  // 2. جلب وعرض قائمة التعليقات المرتبطة بالمقال
  async function loadComments() {
    try {
      if (!commentsList) return;
      commentsList.innerHTML = '<p class="text-muted text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> جاري تحميل التعليقات...</p>';

      const comments = await apiFetch(`/api/blog/${postId}/comments`);
      
      if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="text-center text-muted pad-md">لا توجد تعليقات على هذا التحليل بعد، شاركنا برأيك وكن الأول!</p>';
        return;
      }

      commentsList.innerHTML = '';

      comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-card';

        // تنسيق وقت التعليق
        const commentTime = new Date(comment.createdAt).toLocaleString('ar-EG', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // ميزة الإشراف والحذف: يظهر زر الحذف فقط للـ Admin أو Editor
        const isModerator = user && (user.role === 'admin' || user.role === 'editor');
        const deleteButtonHTML = isModerator 
          ? `<button class="btn-delete-comment-moderator" data-id="${comment.id}" title="حذف التعليق المخالف (إشراف)">
               <i class="fa-solid fa-trash-can"></i> حذف
             </button>`
          : '';

        commentDiv.innerHTML = `
          <div class="comment-header">
            <div class="commenter-info">
              <i class="fa-solid fa-circle-user commenter-avatar"></i>
              <div>
                <strong class="commenter-name">${comment.username || 'مشجع مجهول'}</strong>
                <span class="comment-date">${commentTime}</span>
              </div>
            </div>
            ${deleteButtonHTML}
          </div>
          <p class="comment-text-body">${comment.content}</p>
        `;

        commentsList.appendChild(commentDiv);
      });

      // إضافة أحداث زر حذف التعليق المخالف للمشرفين
      document.querySelectorAll('.btn-delete-comment-moderator').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const commentId = e.currentTarget.getAttribute('data-id');
          if (confirm('بصفتك مشرفاً على المنصة، هل تريد حذف هذا التعليق نهائياً لمخالفته شروط النشر؟')) {
            await deleteComment(commentId);
          }
        });
      });

    } catch (error) {
      console.error('Error loading comments:', error);
      if (commentsList) {
        commentsList.innerHTML = '<p class="text-danger text-center">فشل في استرداد التعليقات، حاول مرة أخرى.</p>';
      }
    }
  }

  // دالة حذف التعليق من قِبل المشرفين
  async function deleteComment(commentId) {
    try {
      const result = await apiFetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (result.success) {
        // إعادة التحميل بعد الحذف مباشرة
        loadComments();
      }
    } catch (error) {
      alert(`فشل الحذف: ${error.message}`);
    }
  }

  // 3. تهيئة واجهة كتابة التعليقات بناءً على حالة تسجيل الدخول للزائر
  function setupCommentFormArea() {
    if (!commentFormContainer) return;

    if (token && user.username) {
      // الزائر مسجل دخول، تفعيل صندوق الكتابة
      commentFormContainer.innerHTML = `
        <div class="comment-composer">
          <h4>أضف تعليقك على هذا التحليل:</h4>
          <form id="addCommentForm" class="standard-form">
            <div class="form-group">
              <textarea id="commentContent" rows="4" placeholder="اكتب تعليقك أو وجهة نظرك الرياضية هنا بكل احترام..." required></textarea>
            </div>
            <button type="submit" class="btn-primary"><i class="fa-solid fa-paper-plane"></i> إرسال التعليق</button>
          </form>
        </div>
      `;

      // إعادة ربط مستمع الحدث للنموذج المنشأ حديثاً ديناميكياً
      const freshForm = document.getElementById('addCommentForm');
      freshForm.addEventListener('submit', handleCommentSubmission);
    } else {
      // الزائر مجهول، طلب تسجيل الدخول أولاً
      commentFormContainer.innerHTML = `
        <div class="alert alert-info text-center pad-md">
          <i class="fa-solid fa-lock"></i> 
          <span>الرجاء <a href="admin/login.html" class="link-highlight text-bold">تسجيل الدخول</a> أو تسجيل حساب زائر لتتمكن من كتابة التعليقات والمشاركة في التحليلات.</span>
        </div>
      `;
    }
  }

  // 4. معالجة إرسال وحفظ التعليق الجديد
  async function handleCommentSubmission(e) {
    e.preventDefault();
    const contentText = document.getElementById('commentContent').value.trim();

    if (!contentText) {
      alert('الرجاء كتابة نص التعليق أولاً.');
      return;
    }

    try {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const result = await apiFetch(`/api/blog/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: contentText })
      });

      if (result.success) {
        document.getElementById('commentContent').value = '';
        // إعادة تحميل قائمة التعليقات لإبراز الجديد فوراً
        loadComments();
      }
    } catch (error) {
      alert(`عذراً، تعذر نشر تعليقك حالياً: ${error.message}`);
    } finally {
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // التشغيل والبدء المباشر للعملية عند التحميل
  loadPostDetails();
  loadComments();
  setupCommentFormArea();
});