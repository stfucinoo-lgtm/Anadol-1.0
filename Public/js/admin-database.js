document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('anadol_token');
  const user = JSON.parse(localStorage.getItem('anadol_user') || '{}');

  // هذه الواجهة مصممة ومتاحة حصرياً لمدير النظام (admin) فقط
  if (!token || user.role !== 'admin') {
    window.location.href = '/admin/login.html';
    return;
  }

  initDatabaseViewer();
});

let currentTableName = 'teams';
let currentTableRows = [];

// ربط عناصر واجهة مستعرض قاعدة البيانات
const dbTableSelect = document.getElementById('db-table-select');
const currentTableTitle = document.getElementById('current-table-title');
const rowsCountEl = document.getElementById('rows-count');
const dbLoadingEl = document.getElementById('db-loading');
const dbEmptyEl = document.getElementById('db-empty');
const dbTableWrapper = document.getElementById('db-table-wrapper');
const dbTableHeaders = document.getElementById('db-table-headers');
const dbTableBody = document.getElementById('db-table-body');
const btnExportJson = document.getElementById('btn-export-json');

// عناصر نافذة محرر الـ JSON الخام المباشر
const rowEditorModal = document.getElementById('row-editor-modal');
const rowEditorForm = document.getElementById('row-editor-form');
const editRowId = document.getElementById('edit-row-id');
const editRowTable = document.getElementById('edit-row-table');
const rawJsonTextarea = document.getElementById('raw-json-textarea');
const jsonErrorMsg = document.getElementById('json-error-msg');

function initDatabaseViewer() {
  // تصفح الجدول الافتراضي عند التحميل الأول
  if (dbTableSelect) {
    currentTableName = dbTableSelect.value;
    loadTableData(currentTableName);

    dbTableSelect.addEventListener('change', (e) => {
      currentTableName = e.target.value;
      if (currentTableTitle) {
        currentTableTitle.textContent = currentTableName;
      }
      loadTableData(currentTableName);
    });
  }

  // ربط أحداث تصدير الجدول
  if (btnExportJson) {
    btnExportJson.addEventListener('click', exportTableAsJson);
  }

  // ربط أحداث النافذة المنبثقة
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeRowEditorModal);
  });

  if (rowEditorForm) {
    rowEditorForm.addEventListener('submit', handleRawRowUpdate);
  }
}

// جلب السجلات والبيانات من السيرفر للجدول المحدد
async function loadTableData(tableName) {
  try {
    showEl(dbLoadingEl);
    hideEl(dbTableWrapper);
    hideEl(dbEmptyEl);

    // استخدام endpoint مستكشف قاعدة البيانات المباشر للـ admin
    const records = await fetchAPI(`/api/admin/database/${tableName}`);
    currentTableRows = records || [];

    if (rowsCountEl) {
      rowsCountEl.textContent = currentTableRows.length;
    }

    if (currentTableRows.length === 0) {
      hideEl(dbLoadingEl);
      showEl(dbEmptyEl);
      return;
    }

    renderRawTable(currentTableRows);
    hideEl(dbLoadingEl);
    showEl(dbTableWrapper);
  } catch (err) {
    console.error(`فشل جلب بيانات جدول ${tableName}:`, err);
    alert('تعذر استكشاف بيانات هذا الجدول حالياً.');
    hideEl(dbLoadingEl);
    showEl(dbEmptyEl);
  }
}

// بناء البنية الديناميكية للجدول والأعمدة بناءً على الحقول المستلمة
function renderRawTable(records) {
  if (!dbTableHeaders || !dbTableBody) return;
  
  dbTableHeaders.innerHTML = '';
  dbTableBody.innerHTML = '';

  // 1. استخراج أسماء الأعمدة ديناميكياً من أول كائن مستلم في القائمة
  const firstRecord = records[0];
  const columns = Object.keys(firstRecord);

  // توليد رؤوس الأعمدة
  columns.forEach(col => {
    const th = document.createElement('th');
    th.className = 'py-3 px-4 font-bold tracking-wider text-slate-400 border-b border-slate-800';
    th.textContent = col;
    dbTableHeaders.appendChild(th);
  });

  // عمود إضافي للتحكم المباشر والسريع
  const thAction = document.createElement('th');
  thAction.className = 'py-3 px-4 font-bold tracking-wider text-slate-400 border-b border-slate-800 text-left';
  thAction.textContent = 'خيارات تحكم الجذر';
  dbTableHeaders.appendChild(thAction);

  // 2. بناء الأسطر والقيم
  records.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800/40 hover:bg-slate-900/30 transition duration-150 font-mono';

    columns.forEach(col => {
      const td = document.createElement('td');
      td.className = 'py-3 px-4 text-xs max-w-xs truncate';
      
      const val = row[col];
      if (val === null) {
        td.innerHTML = '<span class="text-slate-600 font-sans italic">NULL</span>';
      } else if (typeof val === 'object') {
        // معالجة الحقول المركبة (مثل كائنات metadata أو correctedData)
        td.innerHTML = `<span class="text-[10px] text-brand-success" title="${JSON.stringify(val)}">{Object}</span>`;
      } else {
        td.textContent = val.toString();
        td.title = val.toString();
      }
      tr.appendChild(td);
    });

    // إضافة أزرار التحكم الفوري في السجل
    const tdAction = document.createElement('td');
    tdAction.className = 'py-3 px-4 text-left';
    tdAction.innerHTML = `
      <div class="flex items-center justify-end gap-1.5">
        <button class="btn-edit-raw-row bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-brand-accent px-2.5 py-1 rounded transition text-[10px] font-bold" data-id="${row.id}">
          <i class="fa-solid fa-code text-[10px] mr-1"></i> تعديل JSON
        </button>
        <button class="btn-delete-raw-row text-slate-500 hover:text-brand-danger p-1 transition" title="حذف فوري من السجل" data-id="${row.id}">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
    tr.appendChild(tdAction);
    dbTableBody.appendChild(tr);
  });

  // ربط أحداث أزرار الأسطر المتولدة
  document.querySelectorAll('.btn-edit-raw-row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openRowEditorModal(id);
    });
  });

  document.querySelectorAll('.btn-delete-raw-row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      deleteRawRow(id);
    });
  });
}

// نافذة التعديل المباشر
function openRowEditorModal(id) {
  if (!rowEditorModal) return;

  const record = currentTableRows.find(r => r.id == id);
  if (!record) return;

  if (editRowId) editRowId.value = id;
  if (editRowTable) editRowTable.value = currentTableName;
  if (jsonErrorMsg) jsonErrorMsg.classList.add('hidden');

  // تحويل الكائن إلى نص منسق (JSON String formatted with indentation) للتعديل
  if (rawJsonTextarea) {
    rawJsonTextarea.value = JSON.stringify(record, null, 2);
  }

  rowEditorModal.classList.remove('hidden');
  setTimeout(() => {
    rowEditorModal.classList.add('opacity-100');
    const transformEl = rowEditorModal.querySelector('.transform');
    if (transformEl) transformEl.classList.remove('scale-95');
  }, 10);
}

function closeRowEditorModal() {
  if (!rowEditorModal) return;
  rowEditorModal.classList.remove('opacity-100');
  const transformEl = rowEditorModal.querySelector('.transform');
  if (transformEl) transformEl.classList.add('scale-95');
  setTimeout(() => {
    rowEditorModal.classList.add('hidden');
  }, 300);
}

// تنفيذ التعديل المباشر للسجل على مستوى السيرفر بقيم JSON المدخلة
async function handleRawRowUpdate(e) {
  e.preventDefault();

  const id = editRowId.value;
  const tableName = editRowTable.value;
  const jsonText = rawJsonTextarea.value;

  let parsedPayload;
  try {
    parsedPayload = JSON.parse(jsonText);
    if (jsonErrorMsg) jsonErrorMsg.classList.add('hidden');
  } catch (err) {
    if (jsonErrorMsg) jsonErrorMsg.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetchAPI(`/api/admin/database/${tableName}/${id}`, 'PUT', parsedPayload);
    if (response && response.success) {
      closeRowEditorModal();
      await loadTableData(tableName);
    }
  } catch (err) {
    console.error('فشل حفظ التعديل المباشر للسجل:', err);
    alert('حدث خطأ أثناء إرسال البيانات المباشرة للسيرفر، تأكد من صحة الحقول والمفاتيح لقاعدة البيانات.');
  }
}

// حذف سجل مباشرة من الجداول دون قيود منطقية
async function deleteRawRow(id) {
  if (confirm(`تحذير حرج: هل أنت متأكد من رغبتك في حذف السجل ذو المعرف (${id}) مباشرة من جدول "${currentTableName}"؟ \n(سيتم تجاوز كافة الفحوصات المنطقية، وقد تفقد ارتباطات الحقول)`)) {
    try {
      const response = await fetchAPI(`/api/admin/database/${currentTableName}/${id}`, 'DELETE');
      if (response && response.success) {
        await loadTableData(currentTableName);
      }
    } catch (err) {
      console.error('فشل عملية الحذف المباشر للجذر:', err);
      alert('تعذر إتمام الحذف. تأكد من أن السجل ليس معتمداً كقيد خارجي لأقسام حيوية أخرى.');
    }
  }
}

// تصدير وحفظ الجدول الحالي كملف JSON
async function exportTableAsJson() {
  try {
    const token = localStorage.getItem('anadol_token');
    if (!token) return;

    // استدعاء endpoint التصدير الخاص بالـ admin كملف تحميل
    const response = await fetch(`/api/admin/export/${currentTableName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('فشلت عملية التصدير على السيرفر');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anadol_db_export_${currentTableName}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('خطأ أثناء تصدير السجلات المباشرة:', err);
    alert('فشل تصدير السجلات بصيغة JSON.');
  }
}

// دوال التحكم المساعدة
function showEl(el) {
  if (el) el.classList.remove('hidden');
}

function hideEl(el) {
  if (el) el.classList.add('hidden');
}