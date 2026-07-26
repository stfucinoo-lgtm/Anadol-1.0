document.addEventListener('DOMContentLoaded', () => {
    // 1. عناصر النافذة المنبثقة والنموذج
    const openCreateModalBtn = document.getElementById('openCreateModalBtn');
    const blogModal = document.getElementById('blogModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const blogForm = document.getElementById('blogForm');
    const modalTitle = document.getElementById('modalTitle');
    const blogPostsTableBody = document.getElementById('blogPostsTableBody');

    // عناصر رفع ومعاينة الصورة
    const postImageFile = document.getElementById('postImageFile');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const postImageUrl = document.getElementById('postImageUrl');
    const postImageUrlManual = document.getElementById('postImageUrlManual');

    // فتح وإغلاق النافذة
    if (openCreateModalBtn && blogModal) {
        openCreateModalBtn.addEventListener('click', () => {
            modalTitle.textContent = 'إنشاء مقال جديد';
            blogForm.reset();
            document.getElementById('postId').value = '';
            resetImageSelection();
            blogModal.classList.remove('hidden');
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => blogModal.classList.add('hidden'));
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => blogModal.classList.add('hidden'));

    // عرض اسم المستخدم
    try {
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn) {
            const user = Auth.getUser() || {};
            const adminUsername = document.getElementById('adminUsername');
            if (adminUsername && user.username) {
                adminUsername.textContent = user.username;
            }
        }
    } catch (err) {
        console.warn('Auth check skipped:', err.message);
    }

    // توليد Slug تلقائي
    const postTitleInput = document.getElementById('postTitle');
    const postSlugInput = document.getElementById('postSlug');
    if (postTitleInput && postSlugInput) {
        postTitleInput.addEventListener('input', () => {
            if (!document.getElementById('postId').value) {
                const slug = postTitleInput.value
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9أ-ي\s-]/g, '')
                    .replace(/\s+/g, '-');
                postSlugInput.value = slug;
            }
        });
    }

    // 2. تحويل الصورة المرفوعة من الجهاز مباشرة إلى Base64 بدون أخطاء السيرفر
    if (postImageFile) {
        postImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // التحقق من حجم الملف (أقل من 8 ميجابايت)
            if (file.size > 8 * 1024 * 1024) {
                alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Data = event.target.result;
                
                // حفظ ترميز الصورة وقراءته فوراً
                postImageUrl.value = base64Data;
                if (postImageUrlManual) postImageUrlManual.value = '';

                // عرض معاينة الصورة
                if (imagePreview) imagePreview.src = base64Data;
                if (uploadPrompt) uploadPrompt.classList.add('hidden');
                if (imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
            };

            reader.readAsDataURL(file);
        });
    }

    // إدخال رابط يدوي بديل
    if (postImageUrlManual) {
        postImageUrlManual.addEventListener('input', () => {
            const url = postImageUrlManual.value.trim();
            postImageUrl.value = url;
            if (url && imagePreview) {
                imagePreview.src = url;
                if (uploadPrompt) uploadPrompt.classList.add('hidden');
                if (imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
            } else if (!url) {
                resetImageSelection();
            }
        });
    }

    if (removeImageBtn) removeImageBtn.addEventListener('click', resetImageSelection);

    function resetImageSelection() {
        if (postImageFile) postImageFile.value = '';
        if (postImageUrl) postImageUrl.value = '';
        if (postImageUrlManual) postImageUrlManual.value = '';
        if (imagePreview) imagePreview.src = '';
        if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
        if (uploadPrompt) uploadPrompt.classList.remove('hidden');
    }

    // 3. جلب قائمة المقالات
    async function loadBlogPosts() {
        if (!blogPostsTableBody) return;

        try {
            const response = await fetch('/api/blog');
            if (!response.ok) throw new Error('فشل الاستعلام');

            const posts = await response.json();

            if (!Array.isArray(posts) || posts.length === 0) {
                blogPostsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: #94a3b8; padding: 25px;">
                            <i class="fa-solid fa-folder-open" style="font-size: 1.8rem; margin-bottom: 8px; color: #38bdf8;"></i><br>
                            لا توجد مقالات مضافة حالياً. اضغط على "إنشاء مقال جديد" للبدء.
                        </td>
                    </tr>`;
                return;
            }

            blogPostsTableBody.innerHTML = posts.map((post, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <img src="${post.featuredImageUrl || '/images/default-blog.jpg'}" alt="${post.title}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;">
                    </td>
                    <td><strong>${post.title}</strong></td>
                    <td><code style="color:#38bdf8;">${post.slug}</code></td>
                    <td>${new Date(post.publishedAt || post.createdAt || Date.now()).toLocaleDateString('ar-EG')}</td>
                    <td style="text-align: center;">
                        <button class="btn-sm btn-edit" onclick="editPost(${post.id})">
                            <i class="fa-solid fa-pen"></i> تعديل
                        </button>
                        <button class="btn-sm btn-delete" onclick="deletePost(${post.id})">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            blogPostsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 25px;">
                        لا توجد مقالات حالياً في الأرشيف. يمكنك إضافة المقال الأول الآن.
                    </td>
                </tr>`;
        }
    }

    // 4. حفظ أو تحديث المقال
    if (blogForm) {
        blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('postId').value;
            const payload = {
                title: document.getElementById('postTitle').value.trim(),
                slug: document.getElementById('postSlug').value.trim(),
                featuredImageUrl: postImageUrl.value.trim(),
                excerpt: document.getElementById('postExcerpt').value.trim(),
                body: document.getElementById('postBody').value.trim()
            };

            if (!payload.featuredImageUrl) {
                alert('يرجى اختيار صورة للمقال');
                return;
            }

            try {
                const token = (typeof Auth !== 'undefined' && Auth.getToken) ? Auth.getToken() : localStorage.getItem('anadol_token');
                const url = id ? `/api/blog/${id}` : '/api/blog';
                const method = id ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    alert(id ? 'تم تعديل المقال بنجاح' : 'تم نشر المقال بنجاح');
                    blogModal.classList.add('hidden');
                    loadBlogPosts();
                } else {
                    alert(data.error || data.message || 'حدث خطأ أثناء حفظ المقال');
                }
            } catch (error) {
                alert('فشل الاتصال بالخادم أثناء حفظ المقال');
            }
        });
    }

    // تعديل وحذف المقالات
    window.editPost = async (id) => {
        try {
            const response = await fetch(`/api/blog/${id}`);
            const post = await response.json();

            modalTitle.textContent = 'تعديل المقال';
            document.getElementById('postId').value = post.id;
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postSlug').value = post.slug;
            document.getElementById('postExcerpt').value = post.excerpt;
            document.getElementById('postBody').value = post.body;

            postImageUrl.value = post.featuredImageUrl || '';

            if (post.featuredImageUrl && imagePreview) {
                imagePreview.src = post.featuredImageUrl;
                if (uploadPrompt) uploadPrompt.classList.add('hidden');
                if (imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
            } else {
                resetImageSelection();
            }

            blogModal.classList.remove('hidden');
        } catch (error) {
            alert('تعذر جلب بيانات المقال');
        }
    };

    window.deletePost = async (id) => {
        if (!confirm('هل أنت تأكد من رغبتك في حذف هذا المقال؟')) return;
        try {
            const token = (typeof Auth !== 'undefined' && Auth.getToken) ? Auth.getToken() : localStorage.getItem('anadol_token');
            const response = await fetch(`/api/blog/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (response.ok) {
                alert('تم حذف المقال بنجاح');
                loadBlogPosts();
            } else {
                alert('تعذر حذف المقال');
            }
        } catch (error) {
            alert('حدث خطأ أثناء الحذف');
        }
    };

    loadBlogPosts();
});
