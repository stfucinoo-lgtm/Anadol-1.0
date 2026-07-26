document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) {
    alert('مقال غير صالح أو لم يتم تحديد المعرّف بالشكل الصحيح.');
    window.location.href = 'blog.html';
    return;
  }

  const postHeaderSection = document.getElementById('postHeaderSection');
  const postBodySection = document.getElementById('postBodySection');
  const commentsList = document.getElementById('commentsList');
  const commentFormContainer = document.getElementById('commentFormContainer');

  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  async function loadPostDetails() {
    try {
      const post = await apiFetch(`/api/blog/${postId}`);
      if (!post) {
        throw new Error('المقال المطلوب غير موجود أو تم حذفه.');
      }

      const publishDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

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

      if (postBodySection) {
        postBodySection.innerHTML = `
          <div class="post-rich-text">
            ${post.body}
          </div>
        `;
      }

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

  async function loadComments() {
    try {
      if (!commentsList) return;
      commentsList.innerHTML = '<p class="text-muted text-center"><i class="fa-solid fa-circle-notch fa-spin"></i> جاري تحميل التعليقات...</p>';

      // مسار متوافق ومطابق بـ 100% مع /api/comments/blog/:id
      const comments = await apiFetch(`/api/comments/blog/${postId}`);
      
      if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="text-center text-muted pad-md">لا توجد تعليقات على هذا التحليل بعد، شاركنا برأيك وكن الأول!</p>';
        return;
      }

      commentsList.innerHTML = '';

      comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-card';

        const commentTime = new Date(comment.createdAt).toLocaleString('ar-EG', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const avatarHTML = comment.avatarUrl 
          ? `<img src="${comment.avatarUrl}" class="commenter-avatar" alt="${comment.username}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">`
          : `<i class="fa-solid fa-circle-user commenter-avatar"></i>`;

        const isModerator = user && (user.role === 'admin' || user.role === 'editor');
        const deleteButtonHTML = isModerator 
          ? `<button class="btn-delete-comment-moderator" data-id="${comment.id}" title="حذف التعليق المخالف (إشراف)">
               <i class="fa-solid fa-trash-can"></i> حذف
             </button>`
          : '';

        commentDiv.innerHTML = `
          <div class="comment-header">
            <div class="commenter-info">
              ${avatarHTML}
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

  async function deleteComment(commentId) {
    try {
      const result = await apiFetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (result && result.success) {
        loadComments();
      }
    } catch (error) {
      alert(`فشل الحذف: ${error.message}`);
    }
  }

  function setupCommentFormArea() {
    if (!commentFormContainer) return;

    if (token && user.username) {
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

      const freshForm = document.getElementById('addCommentForm');
      if (freshForm) {
        freshForm.addEventListener('submit', handleCommentSubmission);
      }
    } else {
      commentFormContainer.innerHTML = `
        <div class="alert alert-info text-center pad-md">
          <i class="fa-solid fa-lock"></i> 
          <span>الرجاء <a href="admin/login.html" class="link-highlight text-bold">تسجيل الدخول</a> أو تسجيل حساب زائر لتتمكن من كتابة التعليقات والمشاركة في التحليلات.</span>
        </div>
      `;
    }
  }

  async function handleCommentSubmission(e) {
    e.preventDefault();
    const commentInput = document.getElementById('commentContent');
    const contentText = commentInput ? commentInput.value.trim() : '';

    if (!contentText) {
      alert('الرجاء كتابة نص التعليق أولاً.');
      return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
      if (submitBtn) submitBtn.disabled = true;

      // إرسال مباشر إلى /api/comments/blog/:id
      const result = await apiFetch(`/api/comments/blog/${postId}`, {
        method: 'POST',
        body: { content: contentText }
      });

      if (result && result.success) {
        if (commentInput) commentInput.value = '';
        await loadComments();
      }
    } catch (error) {
      alert(`عذراً، تعذر نشر تعليقك حالياً: ${error.message}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  loadPostDetails();
  loadComments();
  setupCommentFormArea();
});
