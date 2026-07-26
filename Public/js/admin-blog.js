document.addEventListener('DOMContentLoaded', async () => {
    // 1. التحقق من صلاحية الجلسة والدور (Admin أو Editor)
    const user = Auth.getUser();
    if (!Auth.isLoggedIn() || (user.role !== 'admin' && user.role !== 'editor')) {
        window.location.href = '/admin/login.html';
        return;
    }

    document.getElementById('adminUsername').textContent = user.username;

    // عناصر الواجهة
    const blogPostsTableBody = document.getElementById('blogPostsTableBody');
    const openCreateModalBtn = document.getElementById('openCreateModalBtn');
    const blogModal = document.getElementById('blogModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const blogForm = document.getElementById('blogForm');
    const modalTitle = document.getElementById('modalTitle');

    // عناصر رفع ومعاينة الصورة
    const postImageFile = document.getElementById('postImageFile');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const postImageUrl = document.getElementById('postImageUrl');
    const postImageUrlManual = document.getElementById('postImageUrlManual');

    // توليد Slug تلقائي من العنوان عند الكتابة
    const postTitleInput = document.getElementById('postTitle');
    const postSlugInput = document.getElementById('postSlug');
    postTitleInput.addEventListener('input', () => {
        if (!document.getElementById('postId').value) { // فقط أثناء الإنشاء
            const slug = postTitleInput.value
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9أ-ي\s-]/g, '')
                .replace(/\s+/g, '-');
            postSlugInput.value = slug;
        }
    });

    // 2. معالجة اختيار ملف صورة
    postImageFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // معاينة محلية سريعة قبل الرفع
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            uploadPrompt.classList.add('hidden');
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);

        // رفع الصورة تلقائياً لـ Backend
        try {
            uploadPrompt.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #38bdf8;"></i><p style="margin:0; color:#94a3b8;">جاري رفع الصورة...</p>`;
            uploadPrompt.classList.remove('hidden');

            const formData = new FormData();
            formData.append('image', file);

            const token = Auth.getToken();
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.url) {
                postImageUrl.value = data.url;
                postImageUrlManual.value = data.url;
                uploadPrompt.classList.add('hidden');
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

    // معالجة إدخال رابط يدوي
    postImageUrlManual.addEventListener('input', () => {
        const url = postImageUrlManual.value.trim();
        postImageUrl.value = url;
        if (url) {
            imagePreview.src = url;
            uploadPrompt.classList.add('hidden');
            imagePreviewContainer.classList.remove('hidden');
        } else {
            resetImageSelection();
        }
    });

    // حذف/إلغاء اختيار الصورة
    removeImageBtn.addEventListener('click', resetImageSelection);

    function resetImageSelection() {
        postImageFile.value = '';
        postImageUrl.value = '';
        postImageUrlManual.value = '';
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        uploadPrompt.innerHTML = `
            <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2rem; color: #38bdf8; margin-bottom: 8px;"></i>
            <p style="margin: 0; color: #94a3b8; font-size: 0.9rem;">اضغط هنا لاختيار صورة من جهازك (JPG, PNG, WEBP)</p>
        `;
        uploadPrompt.classList.remove('hidden');
    }

    // 3. جلب وعرض المقالات
    async function loadBlogPosts() {
        try {
            blogPostsTableBody.innerHTML = `<tr><td colspan="6" class="text-center">جاري تحميل المقالات...</td></tr>`;
            const posts = await API.get('/api/blog');

            if (!posts || posts.length === 0) {
                blogPostsTableBody.innerHTML = `<tr><td colspan="6" class="text-center">لا توجد مقالات حالياً.</td></tr>`;
                return;
            }

            blogPostsTableBody.innerHTML = posts.map((post, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <img src="${post.featuredImageUrl}" alt="${post.title}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;">
                    </td>
                    <td><strong>${post.title}</strong></td>
                    <td><code>${post.slug}</code></td>
                    <td>${new Date(post.publishedAt || post.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="editPost(${post.id})">
                            <i class="fa-solid fa-pen"></i> تعديل
                        </button>
                        ${user.role === 'admin' ? `
                            <button class="btn-sm btn-delete" onclick="deletePost(${post.id})">
                                <i class="fa-solid fa-trash"></i> حذف
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading blog posts:', error);
            blogPostsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">حدث خطأ أثناء تحميل المقالات.</td></tr>`;
        }
    }

    // 4. فتح واغلاق Modal
    openCreateModalBtn.addEventListener('click', () => {
        modalTitle.textContent = 'إنشاء مقال جديد';
        blogForm.reset();
        document.getElementById('postId').value = '';
        resetImageSelection();
        blogModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => blogModal.classList.add('hidden'));
    cancelModalBtn.addEventListener('click', () => blogModal.classList.add('hidden'));

    // 5. تعديل مقال (متاح للجميع كـ function عامة)
    window.editPost = async (id) => {
        try {
            const post = await API.get(`/api/blog/${id}`);
            modalTitle.textContent = 'تعديل المقال';
            document.getElementById('postId').value = post.id;
            document.getElementById('postTitle').value = post.title;
            document.getElementById('postSlug').value = post.slug;
            document.getElementById('postExcerpt').value = post.excerpt;
            document.getElementById('postBody').value = post.body;

            // ضبط الصورة
            postImageUrl.value = post.featuredImageUrl;
            postImageUrlManual.value = post.featuredImageUrl;
            if (post.featuredImageUrl) {
                imagePreview.src = post.featuredImageUrl;
                uploadPrompt.classList.add('hidden');
                imagePreviewContainer.classList.remove('hidden');
            } else {
                resetImageSelection();
            }

            blogModal.classList.remove('hidden');
        } catch (error) {
            alert('تعذر جلب بيانات المقال');
        }
    };

    // 6. حذف مقال (Admin فقط)
    window.deletePost = async (id) => {
        if (!confirm('هل أنت تأكد من رغبتك في حذف هذا المقال نهائياً؟')) return;
        try {
            await API.delete(`/api/blog/${id}`);
            alert('تم حذف المقال بنجاح');
            loadBlogPosts();
        } catch (error) {
            alert(error.message || 'حدث خطأ أثناء حذف المقال');
        }
    };

    // 7. حفظ المقال (إنشاء أو تعديل)
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
            alert('يرجى اختيار صورة للمقال أو إدخال رابط صورة صحيح');
            return;
        }

        try {
            if (id) {
                await API.put(`/api/blog/${id}`, payload);
                alert('تم تعديل المقال بنجاح');
            } else {
                await API.post('/api/blog', payload);
                alert('تم إنشاء المقال بنجاح');
            }

            blogModal.classList.add('hidden');
            loadBlogPosts();
        } catch (error) {
            alert(error.message || 'حدث خطأ أثناء حفظ المقال');
        }
    });

    // تحميل البيانات لأول مرة
    loadBlogPosts();
});
