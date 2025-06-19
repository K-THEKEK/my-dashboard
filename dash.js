let globalTable = null;
let globalPendingColumns = null;
let globalStartCol = 9;
let globalEndCol = 21;

window.addEventListener('DOMContentLoaded', loadData);

function loadData() {
    const url = 'https://docs.google.com/spreadsheets/d/1OjgNRg9IBCfb2yghrJc0khjXHS9WFWdUrTSsMlR2KqA/gviz/tq?tqx=out:json&sheet=JOB';
    fetch(url)
        .then(res => res.text())
        .then(text => {
            const json = JSON.parse(text.substr(47).slice(0, -2));
            globalTable = json.table;
            showDashboard(globalTable);
        });
}

function getRandomColor() {
    // สีพาสเทลอ่านง่าย
    const colors = [
        "#e3f2fd", "#ffe0b2", "#f8bbd0", "#c8e6c9", "#fff9c4", "#d1c4e9", "#b2dfdb"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function showDashboard(table) {
    const pendingColumns = table.cols.map(col => col.label).slice(0, 7); // A-G
    globalPendingColumns = pendingColumns;

    let pendingHtml = `<div><b>Pending process.</b></div><div class="pending-cards">`;
    pendingColumns.forEach((col, i) => {
        const count = table.rows.filter(row =>
            (row.c[i]?.v === 0 || row.c[i]?.v === "0") && row.c[10]?.v !== undefined && row.c[10]?.v !== ""
        ).length;
        const bgColor = getRandomColor();
        pendingHtml += `
          <div class="pending-card" style="background:${bgColor}" onclick="filterJobList(${i})">
            <div class="pending-title">${col}</div>
            <div class="pending-count">${count}</div>
          </div>
        `;
    });
    pendingHtml += `</div>`;
    document.getElementById('pendingProcess').innerHTML = pendingHtml;

    // Job list (J-V) ทั้งหมด
    renderJobList(table.rows);
}

// ฟังก์ชันกรอง Job list ตามหัวข้อ pending
function filterJobList(colIdx) {
    const rows = globalTable.rows.filter(row =>
        (row.c[colIdx]?.v === 0 || row.c[colIdx]?.v === "0") && row.c[10]?.v !== undefined && row.c[10]?.v !== ""
    );
    renderJobList(rows);
}

// ฟังก์ชันแสดง Job list (J-V)
function renderJobList(rows) {
    const table = globalTable;
    const startCol = globalStartCol; // J
    const endCol = globalEndCol;     // V
    const jobColumns = table.cols.slice(startCol, endCol + 1).map(col => col.label);

    let jobHtml = `<div style="margin-top:24px;"><b>Job list</b></div>`;
    rows.forEach((row, idx) => {
        jobHtml += `<div class="job-card">`;
        jobColumns.forEach((col, i) => {
            let val = row.c[startCol + i]?.v ?? "";
            // แปลงวันที่/เวลา (ตามเดิม)
            if ([6, 7, 8, 10].includes(i) && val) val = formatDate(val);
            if ([9, 11].includes(i) && val) val = formatTime(val);
            jobHtml += `<div class="job-field"><span class="job-label">${col}:</span> <span>${val}</span></div>`;
        });
        // ปุ่มทำแล้ว
        jobHtml += `<button class="done-btn" onclick="markDone(${row.c[0]?.v ? `'${row.c[0].v}'` : idx})">ทำแล้ว</button>`;
        jobHtml += `</div>`;
    });
    document.getElementById('jobList').innerHTML = jobHtml;
}

// ฟังก์ชันแปลงวันที่เป็น DD-MM-YY
function formatDate(val) {
    if (!val) return "";
    if (typeof val !== "string") val = String(val);

    // รองรับรูปแบบ Date(2025,3,5)
    const dateMatch = /Date\((\d+),(\d+),(\d+)\)/.exec(val);
    if (dateMatch) {
        const year = dateMatch[1].slice(-2); // 25
        const month = String(Number(dateMatch[2]) + 1).padStart(2, '0');
        const day = String(Number(dateMatch[3])).padStart(2, '0');
        return `${day}-${month}-${year}`;
    }
    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-');
        return `${d}-${m}-${y.slice(-2)}`;
    }
    // dd/mm/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
        const [d, m, y] = val.split('/');
        return `${d}-${m}-${y.slice(-2)}`;
    }
    return val;
}

// ฟังก์ชันแปลงเวลาเป็น HH:MM
function formatTime(val) {
    if (val === undefined || val === null || val === "") return "";
    if (typeof val !== "string") val = String(val);

    // 800, 1600
    if (/^\d{3,4}$/.test(val)) {
        let str = val.padStart(4, '0');
        return `${str.slice(0,2)}:${str.slice(2,4)}`;
    }
    // ทศนิยม (0.33333 = 8:00)
    if (!isNaN(val) && Number(val) > 0 && Number(val) < 1) {
        const minutes = Math.round(Number(val) * 24 * 60);
        const h = String(Math.floor(minutes / 60)).padStart(2, '0');
        const m = String(minutes % 60).padStart(2, '0');
        return `${h}:${m}`;
    }
    // HH:MM
    if (/^\d{1,2}:\d{2}$/.test(val)) return val;
    return val;
}

function markDone(jobId) {
    fetch('https://script.google.com/macros/s/AKfycbwsnoZX4lnhEHduGDKENmKMgD2ZhFGIb0X9HYxXsAfF_nkvf6Eox69VQnEGwLJPg1cccg/exec', {
        method: 'POST',
        body: JSON.stringify({ jobId: jobId }),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.result === "success") {
            alert('บันทึกสำเร็จ');
            loadData(); // โหลดข้อมูลใหม่
        } else {
            alert('เกิดข้อผิดพลาด: ' + (data.message || data.result));
        }
    })
    .catch(() => alert('เกิดข้อผิดพลาดในการเชื่อมต่อ'));
}
window.markDone = markDone;

// ให้ filterJobList เป็น global function
window.filterJobList = filterJobList;

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const jobId = params.jobId;

    const sheet = SpreadsheetApp.getActive().getSheetByName("JOB");
    const data = sheet.getDataRange().getValues();

    const jobCol = 0; // A = 0
    const statusCol = 1; // B = 1 (ปรับตามคอลัมน์ที่ต้องการอัปเดต)

    for (let i = 1; i < data.length; i++) { // ข้ามหัวตาราง
      if (String(data[i][jobCol]) === String(jobId)) {
        sheet.getRange(i + 1, statusCol + 1).setValue(1);
        return ContentService.createTextOutput(JSON.stringify({result: "success", row: i+1, jobId: jobId})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({result: "not found", jobId: jobId})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", message: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
