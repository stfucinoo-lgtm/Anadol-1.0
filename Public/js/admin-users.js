document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  // هذه الصفحة مخصصة للمشرف الرئيسي (admin) فقط
  if (!token || user.role !== 'admin') {
    window.location.href = '/admin/login.html';
    return;
  }

  initUserManagement();
});

let allUsers = [];

// عناصر واجهة المستخدم الرئيسية
const usersLoadingEl = document.getElementById('users-loading');
const usersEmptyEl = document.getElementById('users-empty');
const usersContainerEl = document.getElementById('users-container');
const usersTableBody = document.getElementById('users-table-body');
const usersCountEl = document.getElementById('users-count');
const userSearchEl = document.getElementById('user-search');

async function initUserManagement() {
  await loadUsers();

  if (userSearchEl) {
    userSearchEl.addEventListener('input', filterUsers);
  }
}

// جلب المستخدمين من الخادم
async function loadUsers() {
  try {
    showEl(usersLoadingEl);
    hideEl(usersContainerEl);
    hideEl(usersEmptyEl);

    const users = await fetchAPI('/api/admin/users');
    allUsers = users || [];

    if (usersCountEl) {
      usersCountEl.textContent = allUsers.length;
    }

    if (allUsers.length === 0) {
      hideEl(usersLoadingEl);
      showEl(usersEmptyEl);
      return;
    }

    renderUsersTable(allUsers);
    hideEl(usersLoadingEl);
    showEl(usersContainerEl);
  } catch (err) {
    console.error('حدث خطأ أثناء جلب بيانات المستخدمين:', err);
    alert('تعذر تحميل قائمة المستخدمين من الخادم.');
  }
}

// بناء جدول المستخدمين
function renderUsersTable(users) {
  if (!usersTableBody) return;
  usersTableBody.innerHTML = '';

  users.forEach(user => {
    // لا يمكن للمشرف أن يعدل أو يحذف حسابه الخاص!
    const isCurrentUser = user.id === JSON.parse(localStorage.getItem('anadol_user')).id;

    const createdAtFormatted = new Date(user.createdAt).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800/50 hover:bg-slate-900/40 transition duration-150 user-row';

    tr.innerHTML = `
      <td class="py-4 px-4 font-semibold text-slate-200">
        <i class="fa-solid fa-user-circle text-[10px] ${user.role === 'admin' ? 'text-red-500' : user.role === 'editor' ? 'text-brand-accent' : 'text-slate-500'} ml-1"></i>
        ${user.username}
        ${isCurrentUser ? '<span class="text-[9px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full mr-2"> (أنت) </span>' : ''}
      </td>
      <td class="py-4 px-4 text-xs font-mono text-slate-400 max-w-[180px] truncate" dir="ltr">${user.email}</td>
      <td class="py-4 px-4">
        <select class="user-role-select bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-accent transition w-full ${isCurrentUser ? 'cursor-not-allowed opacity-50' : ''}" data-id="${user.id}" ${isCurrentUser ? 'disabled' : ''}>
          <option value="visitor" ${user.role === 'visitor' ? 'selected' : ''}>زائر عادي</option>
          <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>محرر محتوى</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مشرف رئيسي</option>
        </select>
      </td>
      <td class="py-4 px-4 text-center">
        <label class="inline-flex items-center cursor-pointer ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}">
          <input type="checkbox" class="sr-only peer user-banned-toggle" data-id="${user.id}" ${user.banned ? 'checked' : ''} ${isCurrentUser ? 'disabled' : ''}>
          <div class="relative w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
          <span class="ml-2 text-xs font-medium text-slate-400">${user.banned ? 'محظور' : 'نشط'}</span>
        </label>
      </td>
      <td class="py-4 px-4 text-[11px] text-slate-500 font-mono" dir="ltr">${createdAtFormatted}</td>
      <td class="py-4 px-4 text-left">
        <div class="flex items-center justify-end gap-2">
          <button class="btn-save-user-changes bg-brand-accent hover:bg-brand-accentHover text-brand-dark px-3 py-1.5 rounded-lg text-xs font-bold transition ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${user.id}" ${isCurrentUser ? 'disabled' : ''}>
            <i class="fa-solid fa-save mr-1"></i> حفظ
          </button>
          <button class="btn-delete-user text-slate-500 hover:text-brand-danger p-1.5 transition ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}" title="حذف الحساب نهائياً" data-id="${user.id}" ${isCurrentUser ? 'disabled' : ''}>
            <i class="fa-solid fa-user-xmark text-sm"></i>
          </button>
        </div>
      </td>
    `;

    usersTableBody.appendChild(tr);
  });

  // ربط الأحداث للعناصر المولدة ديناميكياً
  document.querySelectorAll('.btn-save-user-changes').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const userId = e.currentTarget.getAttribute('data-id');
      if (userId) saveUserChanges(userId);
    });
  });

  document.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const userId = e.currentTarget.getAttribute('data-id');
      if (userId) deleteUser(userId);
    });
  });

  if (window.gsap) {
    gsap.from('.user-row', { opacity: 0, y: 10, duration: 0.3, stagger: 0.05, ease: 'power2.out' });
  }
}

// تصفية المستخدمين بناءً على حقل البحث
function filterUsers() {
  const query = userSearchEl.value.trim().toLowerCase();
  if (!query) {
    renderUsersTable(allUsers);
    return;
  }

  const filtered = allUsers.filter(user => 
    user.username.toLowerCase().includes(query) || 
    user.email.toLowerCase().includes(query)
  );
  renderUsersTable(filtered);
}

// حفظ التغييرات على دور المستخدم أو حالة الحظر
async function saveUserChanges(userId) {
  const userRow = document.querySelector(`.user-role-select[data-id="${userId}"]`).closest('tr');
  if (!userRow) return;

  const roleSelect = userRow.querySelector('.user-role-select');
  const bannedToggle = userRow.querySelector('.user-banned-toggle');

  const payload = {
    role: roleSelect.value,
    banned: bannedToggle.checked
  };

  try {
    const response = await fetchAPI(`/api/admin/users/${userId}`, 'PUT', payload);
    if (response && response.success) {
      alert('تم تحديث بيانات المستخدم بنجاح.');
      await loadUsers(); // إعادة تحميل القائمة لتحديث الواجهة بالكامل
    } else {
      alert('فشل في حفظ التغييرات على المستخدم.');
    }
  } catch (err) {
    console.error('خطأ أثناء تحديث المستخدم:', err);
    alert('حدث خطأ في السيرفر أثناء حفظ التغييرات.');
  }
}

// حذف المستخدم
async function deleteUser(userId) {
  const currentUser = JSON.parse(localStorage.getItem('anadol_user'));
  if (userId == currentUser.id) {
    alert('لا يمكنك حذف حسابك الخاص كـ Admin.');
    return;
  }

  const userToDelete = allUsers.find(u => u.id == userId);
  if (!userToDelete) return;

  if (confirm(`هل أنت متأكد من حذف حساب المستخدم "${userToDelete.username}" نهائياً؟ هذا الإجراء لا يمكن التراجع عنه!`)) {
    try {
      const response = await fetchAPI(`/api/admin/users/${userId}`, 'DELETE');
      if (response && response.success) {
        alert('تم حذف المستخدم بنجاح.');
        await loadUsers(); // إعادة تحميل القائمة بعد الحذف
      } else {
        alert('فشل في حذف المستخدم.');
      }
    } catch (err) {
      console.error('خطأ أثناء حذف المستخدم:', err);
      alert('حدث خطأ في السيرفر أثناء حذف المستخدم.');
    }
  }
}

// دوال مساعدة لإظهار وإخفاء العناصر
function showEl(el) {
  if (el) el.classList.remove('hidden');
}

function hideEl(el) {
  if (el) el.classList.add('hidden');
}