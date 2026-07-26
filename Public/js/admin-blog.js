document.addEventListener('DOMContentLoaded', () => {
    // 1. ربط أزرار النافذة المنبثقة فوراً قبل أي طلب للشبكة (لضمان الاستجابة السريعة)
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

    // فتح النافذة
    if (openCreateModalBtn && blogModal) {
        openCreateModalBtn.addEventListener('click', () => {
            modalTitle.textContent = 'إنشاء مقال جديد';
            blogForm.reset();
            document.getElementById('postId').value = '';
            resetImageSelection();
            blogModal.classList.remove('hidden');
        });
    }

    // إغلاق النافذة
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => blogModal.classList.add('hidden'));
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => blogModal.classList.add('hidden'));

    // 2. التحقق الآمن من تسجيل الدخول
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

    // توليد Slug تلقائي عند كتابة العنوان
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

    // 3. معالجة اختيار ملف الصورة للرفع
    if (postImageFile) {
        postImageFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // معاينة محلية فورية
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                if (uploadPrompt) uploadPrompt.classList.add('hidden');
                if (imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(file);

            // رفع الصورة للسيرفر
            try {
                if (uploadPrompt) {
                    uploadPrompt.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #38bdf8;"></i><p style="margin:0; color:#94a3b8;">جاري رفع الصورة...</p>`;
                    uploadPrompt.classList.remove('hidden');
                }

                const formData = new FormData();
                formData.append('image', file);

                const token = (typeof Auth !== 'undefined' && Auth.getToken) ? Auth.getToken() : localStorage.getItem('anadol_token');
                
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData
                });

                const data = await response.json();

                if (response.ok && data.url) {
                    postImageUrl.value = data.url;
                    if (postImageUrlManual) postImageUrlManual.value = data.url;
                    if (uploadPrompt) uploadPrompt.classList.add('hidden');
                } else {
                    alert(data.message || 'فشل رفع الصورة');
                    resetImageSelection();
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('حدث خطأ أثناء رفع الصورة');
                resetImageSelection();
            }
        });
    }

    // إدخال رابط يدوي
    if (postImageUrlManual) {
        postImageUrlManual.addEventListener('input', () => {
            const url = postImageUrlManual.value.trim();
            postImageUrl.value = url;
            if (url && imagePreview) {
                imagePreview.src = url;
                if (uploadPrompt) uploadPrompt.classList.add('hidden');
                if (imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
            } else {
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
        if (uploadPrompt) {
            uploadPrompt.innerHTML = `
                <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2rem; color: #38bdf8; margin-bottom: 8px;"></i>
                <p style="margin: 0; color: #94a3b8; font-size: 0.9rem;">اضغط هنا لاختيار صورة من جهازك (JPG, PNG, WEBP)</p>
            `;
            uploadPrompt.classList.remove('hidden');
        }
    }

    // 4. جلب المقالات بأسلوب آمن جداً يضمن إزالة مؤشر الدوران دائماً
    async function loadBlogPosts() {
        if (!blogPostsTableBody) return;

        try {
            const response = await fetch('/api/blog');
            
            if (!response.ok) {
                throw new Error('فشل جلب المقالات');
            }

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
            console.warn('Notice loading blog posts:', error);
            blogPostsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #94a3b8; padding: 25px;">
                        لا توجد مقالات حالياً في الأرشيف. يمكنك إضافة المقال الأول الآن.
                    </td>
                </tr>`;
        }
    }

    // 5. حفظ المقال (إنشاء / تعديل)
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
                alert('يرجى رفع صورة للمقال أو إدخال رابط الصورة');
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

    // إتاحة التعديل والحذف عاماً
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
            if (postImageUrlManual) postImageUrlManual.value = post.featuredImageUrl || '';

            if (post.featuredImageUrl && imagePreview) {
                imagePreview.src = post.featuredImageUrl;
                if (uploadPrompt) uploadPrompt.classList.add('hidden');
                if (imagePreviewContainer) imagePreviewContainer.classList.remove('hidden');
            } else {
                resetImageSelection();
            }

            blogModal.classList.remove('hidden');
        } catch (error) {
            alert('تعذر جلب بيانات المقال للتعديل');
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

    // تشغيل التحميل
    loadBlogPosts();
});
