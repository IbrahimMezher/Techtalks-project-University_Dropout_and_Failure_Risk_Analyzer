// courses.js
// Simple client-side storage (localStorage) for demo: courses[] and grades[]
// Structure:
// courses = [{ id, name, code }]
// grades = [{ id, courseId, exam, score, weight, date }]

(function(){
  const qs = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));

  // DOM
  const navCourses = qs('#nav-courses');
  const navAttendance = qs('#nav-attendance');
  const navGrades = qs('#nav-grades');
  const panels = {
    courses: qs('#panel-courses'),
    attendance: qs('#panel-attendance'),
    grades: qs('#panel-grades')
  };

  const enrolledList = qs('#enrolled-list');
  const openEnroll = qs('#open-enroll');
  const modalEnroll = qs('#modal-enroll');
  const saveEnroll = qs('#save-enroll');
  const cancelEnroll = qs('#cancel-enroll');
  const enrollName = qs('#enroll-name');
  const enrollCode = qs('#enroll-code');

  const openResolve = qs('#open-resolve');
  const modalResolve = qs('#modal-resolve');
  const gradeCourse = qs('#grade-course');
  const gradeExam = qs('#grade-exam');
  const gradeScore = qs('#grade-score');
  const gradeWeight = qs('#grade-weight');
  const gradeDate = qs('#grade-date');
  const saveGrade = qs('#save-grade');
  const cancelGrade = qs('#cancel-grade');
  const gradeIdHidden = qs('#grade-id');
  const gradesList = qs('#grades-list');
  const gradesChart = qs('#grades-chart');

  const openAttendance = qs('#open-attendance');
  const modalAttendance = qs('#modal-attendance');
  const attendanceCourse = qs('#attendance-course');
  const attendanceDate = qs('#attendance-date');
  const attendanceStatus = qs('#attendance-status');
  const saveAttendance = qs('#save-attendance');
  const cancelAttendance = qs('#cancel-attendance');
  const attendanceChart = qs('#attendance-chart');
  const attendanceSummary = qs('#attendance-summary');

  // storage helpers
  function load(key){ try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ return []; } }
  function save(key, v){ localStorage.setItem(key, JSON.stringify(v)); }

  // simple animation helper: calls fn(progress) 0..1 over duration ms
  function animateProgress(fn, duration=600){
    const start = performance.now();
    function step(now){
      const t = Math.min(1, (now - start) / duration);
      try{ fn(t); } catch(e){}
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // id generator
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  // initial
  let courses = load('courses');
  let grades = load('grades');
  let editingGradeId = null;
  let attendance = load('attendance');
  // remove any attendance records that reference courses which no longer exist
  if(Array.isArray(attendance) && attendance.length){
    const before = attendance.length;
    attendance = attendance.filter(a => courses.some(c => c.id === a.courseId));
    if(attendance.length !== before) save('attendance', attendance);
  } else {
    attendance = [];
  }
  let editingAttendanceId = null;

  // nav handlers
  function setActive(tab){
    navCourses.classList.remove('active');
    navAttendance.classList.remove('active');
    navGrades.classList.remove('active');
    navCourses.blur(); navAttendance.blur(); navGrades.blur();
    if(tab==='courses'){ navCourses.classList.add('active'); panels.courses.style.display='block'; panels.attendance.style.display='none'; panels.grades.style.display='none'; }
    if(tab==='attendance'){ navAttendance.classList.add('active'); panels.courses.style.display='none'; panels.attendance.style.display='block'; panels.grades.style.display='none'; renderAttendance(); }
    if(tab==='grades'){ navGrades.classList.add('active'); panels.courses.style.display='none'; panels.attendance.style.display='none'; panels.grades.style.display='block'; renderGrades(); }
  }
  navCourses.addEventListener('click', ()=> setActive('courses'));
  navAttendance.addEventListener('click', ()=> setActive('attendance'));
  navGrades.addEventListener('click', ()=> setActive('grades'));

  // render enrolled
  function renderCourses(){
    enrolledList.innerHTML = '';
    if(courses.length === 0){
      const p = document.createElement('div'); p.className = 'muted'; p.textContent = 'No courses enrolled yet.';
      enrolledList.appendChild(p);
      return;
    }
    courses.forEach(c => {
      const item = document.createElement('div'); item.className = 'course-item fade-in-up';
      const left = document.createElement('div'); left.innerHTML = `<strong>${escapeHtml(c.name)}</strong><div class="muted">${escapeHtml(c.code||'')}</div>`;
      const right = document.createElement('div');
      const btnDrop = document.createElement('button'); btnDrop.className='btn'; btnDrop.textContent='Drop';
      btnDrop.addEventListener('click', ()=> {
        if(!confirm('Drop '+c.name+'?')) return;
        courses = courses.filter(x => x.id !== c.id);
        // also remove related grades
        grades = grades.filter(g => g.courseId !== c.id);
        // also remove related attendance records
        attendance = attendance.filter(a => a.courseId !== c.id);
        save('courses', courses); save('grades', grades); save('attendance', attendance);
        renderCourses(); renderGradeOptions(); renderGrades(); renderAttendance();
      });
      right.appendChild(btnDrop);
      item.appendChild(left);
      item.appendChild(right);
      enrolledList.appendChild(item);
    });
  }

  // color palette for attendance pie chart
  const courseColors = {};
  function getColorForCourse(courseId){
    if(!courseColors[courseId]){
      const colors = ['#0366d6', '#28a745', '#ffc107', '#e83e8c', '#17a2b8', '#fd7e14', '#6f42c1', '#20c997'];
      const idx = Object.keys(courseColors).length % colors.length;
      courseColors[courseId] = colors[idx];
    }
    return courseColors[courseId];
  }

  // enroll modal
  openEnroll.addEventListener('click', ()=> { modalEnroll.style.display='flex'; enrollName.focus(); });
  cancelEnroll.addEventListener('click', ()=> { modalEnroll.style.display='none'; clearEnroll(); });
  saveEnroll.addEventListener('click', ()=> {
    const name = enrollName.value.trim();
    if(!name){ alert('Please enter a course name'); enrollName.focus(); return; }
    const code = enrollCode.value.trim();
    const newC = { id: uid(), name, code };
    courses.push(newC);
    save('courses', courses);
    modalEnroll.style.display='none';
    clearEnroll();
    renderCourses(); renderGradeOptions(); renderGrades();
  });
  function clearEnroll(){ enrollName.value=''; enrollCode.value=''; }

  // resolve grade
  openResolve.addEventListener('click', ()=>{
    if(courses.length===0){ alert('No enrolled courses — enroll first.'); return; }
    editingGradeId = null;
    if(gradeIdHidden) gradeIdHidden.value = '';
    document.getElementById('modal-resolve-title').textContent = 'Resolve Grade';
    saveGrade.textContent = 'Save Grade';
    clearGradeForm();
    renderGradeOptions();
    modalResolve.style.display='flex';
  });
  cancelGrade.addEventListener('click', ()=> { modalResolve.style.display='none'; clearGradeForm(); editingGradeId = null; if(gradeIdHidden) gradeIdHidden.value=''; document.getElementById('modal-resolve-title').textContent = 'Resolve Grade'; saveGrade.textContent = 'Save Grade'; });

  saveGrade.addEventListener('click', ()=>{
    const courseId = gradeCourse.value;
    const exam = gradeExam.value.trim();
    const score = Number(gradeScore.value);
    const weight = Number(gradeWeight.value);
    const date = gradeDate.value || new Date().toISOString().slice(0,10);
    if(!courseId){ alert('Select course'); return; }
    if(!exam){ alert('Enter exam name'); gradeExam.focus(); return; }
    if(Number.isNaN(score) || score<0 || score>100){ alert('Score must be 0-100'); gradeScore.focus(); return; }
    if(editingGradeId){
      const idx = grades.findIndex(x => x.id === editingGradeId);
      if(idx !== -1){
        grades[idx] = { id: editingGradeId, courseId, exam, score, weight, date };
        save('grades', grades);
      }
    } else {
      const g = { id: uid(), courseId, exam, score, weight, date };
      grades.push(g);
      save('grades', grades);
    }
    modalResolve.style.display='none';
    clearGradeForm();
    editingGradeId = null;
    if(gradeIdHidden) gradeIdHidden.value = '';
    document.getElementById('modal-resolve-title').textContent = 'Resolve Grade';
    saveGrade.textContent = 'Save Grade';
    renderGrades();
  });

  function clearGradeForm(){ gradeExam.value=''; gradeScore.value=''; gradeWeight.value=''; gradeDate.value=''; }

  function renderGradeOptions(){
    gradeCourse.innerHTML = '';
    courses.forEach(c => {
      const o = document.createElement('option'); o.value=c.id; o.textContent = `${c.name}${c.code? ' ('+c.code+')':''}`;
      gradeCourse.appendChild(o);
    });
  }

  // attendance modal handlers
  openAttendance.addEventListener('click', ()=>{
    if(courses.length===0){ alert('No enrolled courses — enroll first.'); return; }
    editingAttendanceId = null;
    if(attendanceCourse) attendanceCourse.value = '';
    if(attendanceDate) attendanceDate.value = new Date().toISOString().slice(0,10);
    document.querySelector('#modal-attendance h3').textContent = 'Resolve Attendance';
    saveAttendance.textContent = 'Save';
    renderAttendanceOptions();
    modalAttendance.style.display='flex';
  });

  cancelAttendance.addEventListener('click', ()=>{ modalAttendance.style.display='none'; clearAttendanceForm(); editingAttendanceId = null; document.querySelector('#modal-attendance h3').textContent = 'Resolve Attendance'; saveAttendance.textContent = 'Save'; });

  saveAttendance.addEventListener('click', ()=>{
    const courseId = attendanceCourse.value;
    const date = attendanceDate.value;
    const status = attendanceStatus.value;
    if(!courseId){ alert('Select course'); return; }
    if(!date){ alert('Select date'); attendanceDate.focus(); return; }
    if(editingAttendanceId){
      const idx = attendance.findIndex(x => x.id === editingAttendanceId);
      if(idx !== -1){
        attendance[idx] = { id: editingAttendanceId, courseId, date, status };
        save('attendance', attendance);
      }
    } else {
      const att = { id: uid(), courseId, date, status };
      attendance.push(att);
      save('attendance', attendance);
    }
    modalAttendance.style.display='none';
    clearAttendanceForm();
    editingAttendanceId = null;
    renderAttendance();
  });

  function clearAttendanceForm(){ attendanceDate.value=''; attendanceStatus.value='present'; }

  function renderAttendanceOptions(){
    attendanceCourse.innerHTML = '';
    courses.forEach(c => {
      const o = document.createElement('option'); o.value=c.id; o.textContent = `${c.name}${c.code? ' ('+c.code+')':''}`;
      attendanceCourse.appendChild(o);
    });
  }

  // render attendance overview + pie chart
  function renderAttendance(){
    // remove orphaned attendance entries (safety) and persist
    attendance = attendance.filter(a => courses.some(c => c.id === a.courseId));
    save('attendance', attendance);

    // summary table
    attendanceSummary.innerHTML = '';
    if(attendance.length===0){ attendanceSummary.innerHTML = '<div class="muted">No attendance records yet.</div>'; drawEmptyAttendanceChart(); return; }

    // group by course
    const grouped = {};
    attendance.forEach(a => {
      grouped[a.courseId] = grouped[a.courseId] || { present: 0, absent: 0 };
      if(a.status === 'present') grouped[a.courseId].present++;
      else grouped[a.courseId].absent++;
    });

    // build summary
    const summaryTable = document.createElement('div');
    summaryTable.style.marginTop = '12px';
    Object.keys(grouped).forEach(cid => {
      const course = courses.find(c => c.id === cid) || { name:'(unknown)' };
      const stats = grouped[cid];
      const total = stats.present + stats.absent;
      const pct = total > 0 ? Math.round((stats.present / total) * 100) : 0;
        const row = document.createElement('div'); row.classList.add('fade-in-up');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '8px 0';
      row.style.borderBottom = '1px solid #f0f0f0';
      row.innerHTML = `<div><strong>${escapeHtml(course.name)}</strong><div class="muted">Present: ${stats.present} | Absent: ${stats.absent}</div></div><div style="text-align:right"><strong>${pct}%</strong></div>`;
      summaryTable.appendChild(row);
    });
    attendanceSummary.appendChild(summaryTable);

    // entries list (with edit buttons)
    const entriesDiv = document.createElement('div');
    entriesDiv.style.marginTop = '12px';
    const title = document.createElement('div'); title.style.fontWeight='600'; title.textContent = 'Recent entries'; entriesDiv.appendChild(title);
    const list = document.createElement('div'); list.style.marginTop='8px';
    attendance.slice().reverse().slice(0,20).forEach(a => {
      const course = courses.find(c => c.id === a.courseId) || { name:'(unknown)' };
      const row = document.createElement('div');
      row.style.display='flex'; row.style.justifyContent='space-between'; row.style.padding='6px 0'; row.style.borderBottom='1px solid #f0f0f0';
      row.innerHTML = `<div><div style="font-weight:600">${escapeHtml(course.name)}</div><div class="muted">${a.date} • ${a.status}</div></div>`;
      const right = document.createElement('div');
      const btnEdit = document.createElement('button'); btnEdit.className='btn'; btnEdit.style.marginLeft='8px'; btnEdit.textContent='Edit';
      btnEdit.addEventListener('click', ()=>{
        editingAttendanceId = a.id;
        attendanceCourse.value = a.courseId;
        attendanceDate.value = a.date;
        attendanceStatus.value = a.status;
        document.querySelector('#modal-attendance h3').textContent = 'Edit Attendance';
        saveAttendance.textContent = 'Update';
        modalAttendance.style.display = 'flex';
      });
      right.appendChild(btnEdit);
      // Delete button for the attendance entry
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn';
      btnDelete.style.marginLeft = '8px';
      btnDelete.textContent = 'Delete';
      btnDelete.addEventListener('click', ()=>{
        if(!confirm('Delete this attendance entry?')) return;
        attendance = attendance.filter(x => x.id !== a.id);
        save('attendance', attendance);
        if(editingAttendanceId === a.id){ editingAttendanceId = null; if(modalAttendance) modalAttendance.style.display='none'; }
        renderAttendance();
      });
      right.appendChild(btnDelete);
      row.appendChild(right);
      list.appendChild(row);
    });
    entriesDiv.appendChild(list);
    attendanceSummary.appendChild(entriesDiv);

    // draw pie (donut) for present counts per course with animation
    animateProgress(p => drawAttendancePie(grouped, p), 700);
  }

  function drawEmptyAttendanceChart(){
    const ctx = attendanceChart.getContext('2d');
    ctx.clearRect(0,0,attendanceChart.width,attendanceChart.height);
    ctx.fillStyle='#f6f8fa';
    ctx.fillRect(0,0,attendanceChart.width,attendanceChart.height);
    ctx.fillStyle='#666'; ctx.font='14px Arial'; ctx.textAlign='center';
    ctx.fillText('No attendance data', attendanceChart.width/2, 24);
  }

  function drawAttendancePie(grouped, progress=1){
    const canvas = attendanceChart;
    const ctx = canvas.getContext('2d');
    const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0,0,W,H);
    const courseIds = Object.keys(grouped);
    if(courseIds.length===0){ drawEmptyAttendanceChart(); return; }

    // compute present counts per course
    const totals = courseIds.map(cid => ({ cid, present: grouped[cid].present }));
    const sum = totals.reduce((s,t)=> s + t.present, 0) || 1;

    const centerX = W/2 - 40;
    const centerY = H/2;
    const radius = Math.min(W, H) / 2 - 50;

    let start = -Math.PI/2;
    totals.forEach(t => {
      const angle = (t.present / sum) * 2 * Math.PI * progress;
      ctx.beginPath(); ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, start, start + angle);
      ctx.closePath();
      ctx.save(); ctx.globalAlpha = Math.max(0.18, progress);
      ctx.fillStyle = getColorForCourse(t.cid);
      ctx.fill();
      ctx.restore();
      start += angle;
    });

    // draw inner circle for donut (slight animation by scaling)
    ctx.save(); ctx.globalAlpha = Math.min(1, progress + 0.2); ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(centerX, centerY, radius*0.55 * (0.6 + 0.4*progress), 0, Math.PI*2); ctx.fill(); ctx.restore();

    // legend on right
    ctx.textAlign = 'left'; ctx.font='12px Arial';
    let ly = 18;
    const legendX = W - 160;
    totals.forEach(t => {
      const course = courses.find(c => c.id === t.cid) || { name:'(unknown)' };
      const pct = Math.round((t.present / sum) * 100);
      ctx.save(); ctx.globalAlpha = progress; ctx.fillStyle = getColorForCourse(t.cid);
      ctx.fillRect(legendX, ly-10, 14, 14);
      ctx.fillStyle = '#333';
      ctx.fillText(`${escapeHtml(course.name)} — ${t.present} (${pct}%)`, legendX + 20, ly);
      ctx.restore();
      ly += 20;
    });
  }

  function hexToRgb(hex){
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0,0,0];
  }

  // render grades overview + chart
  function renderGrades(){
    // list
    gradesList.innerHTML = '';
    if(grades.length===0){ gradesList.innerHTML = '<div class="muted">No grades recorded yet.</div>'; drawEmptyChart(); return; }

    // grouped by course (for display)
    const grouped = {};
    grades.forEach(g => {
      grouped[g.courseId] = grouped[g.courseId] || [];
      grouped[g.courseId].push(g);
    });

    // stats section (total tests, average, highest per course)
    const statsDiv = document.createElement('div');
    statsDiv.style.marginTop = '16px';
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';
    Object.keys(grouped).forEach(cid => {
      const course = courses.find(c => c.id === cid) || { name:'(unknown)' };
      const courseGrades = grouped[cid];
      const totalTests = courseGrades.length;
      const avgScore = Math.round(courseGrades.reduce((sum, g) => sum + g.score, 0) / totalTests);
      const maxScore = Math.max(...courseGrades.map(g => g.score));
      
      // total tests card
      const cardTotal = document.createElement('div');
      cardTotal.className = 'stat-card fade-in-up';
      cardTotal.innerHTML = `<div class="stat-label">${escapeHtml(course.name)}</div><div class="stat-value">${totalTests}</div><div class="stat-sublabel">Tests Taken</div>`;
      statsGrid.appendChild(cardTotal);
      
      // average card
      const cardAvg = document.createElement('div');
      cardAvg.className = 'stat-card fade-in-up';
      cardAvg.innerHTML = `<div class="stat-label">Average</div><div class="stat-value">${avgScore}</div><div class="stat-sublabel">out of 100</div>`;
      statsGrid.appendChild(cardAvg);
      
      // highest card
      const cardMax = document.createElement('div');
      cardMax.className = 'stat-card fade-in-up';
      cardMax.innerHTML = `<div class="stat-label">Highest</div><div class="stat-value">${maxScore}</div><div class="stat-sublabel">out of 100</div>`;
      statsGrid.appendChild(cardMax);
    });
    statsDiv.appendChild(statsGrid);
    gradesList.appendChild(statsDiv);

    Object.keys(grouped).forEach(cid => {
      const course = courses.find(c => c.id === cid) || { name:'(unknown)' };
      const block = document.createElement('div');
      block.innerHTML = `<strong>${escapeHtml(course.name)}</strong>`;
      const ul = document.createElement('div'); ul.style.marginTop='6px';
      grouped[cid].slice().reverse().forEach(g => {
        const row = document.createElement('div');
        row.style.display='flex'; row.style.justifyContent='space-between'; row.style.padding='6px 0'; row.style.borderBottom='1px solid #f0f0f0';
        row.classList.add('fade-in-up');
        row.innerHTML = `<div><div style="font-weight:600">${escapeHtml(g.exam)}</div><div class="muted">${g.date} • weight ${g.weight}%</div></div><div style="min-width:60px;text-align:right"><strong>${g.score}</strong>/100</div>`;
        ul.appendChild(row);
        // add Edit button to allow correcting entered grades
        try {
          const rightDiv = row.querySelector('div:last-child');
          const btnEdit = document.createElement('button');
          btnEdit.className = 'btn';
          btnEdit.style.marginLeft = '8px';
          btnEdit.textContent = 'Edit';
          btnEdit.addEventListener('click', () => {
            editingGradeId = g.id;
            if(gradeIdHidden) gradeIdHidden.value = g.id;
            renderGradeOptions();
            gradeCourse.value = g.courseId;
            gradeExam.value = g.exam;
            gradeScore.value = g.score;
            gradeWeight.value = g.weight;
            gradeDate.value = g.date;
            document.getElementById('modal-resolve-title').textContent = 'Edit Grade';
            saveGrade.textContent = 'Update Grade';
            modalResolve.style.display = 'flex';
          });
          rightDiv.appendChild(btnEdit);
        } catch(e){ /* ignore if DOM shape unexpected */ }
      });
      block.appendChild(ul);
      gradesList.appendChild(block);
    });

    // chart: draw trend of latest grades (all grades sorted by date)
    const sorted = grades.slice().sort((a,b)=> new Date(a.date) - new Date(b.date));
    const pts = sorted.map(g => ({ score: g.score, label: g.exam }));
    animateProgress(p => drawChart(pts, p), 700);
  }

  function drawEmptyChart(){
    const ctx = gradesChart.getContext('2d');
    ctx.clearRect(0,0,gradesChart.width,gradesChart.height);
    ctx.fillStyle='#f6f8fa';
    ctx.fillRect(0,0,gradesChart.width,gradesChart.height);
    ctx.fillStyle='#666'; ctx.font='14px Arial';
    ctx.fillText('No grade data', 12, 24);
  }

  function drawChart(points, progress=1){
    const canvas = gradesChart;
    const ctx = canvas.getContext('2d');
    const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0,0,W,H);
    if(points.length===0){ drawEmptyChart(); return; }
    // padding
    const pad = 28;
    const plotW = W - pad*2;
    const plotH = H - pad*2;
    // x positions
    const n = points.length;
    const gap = n>1 ? plotW / (n-1) : 0;
    // y scale 0..100
    ctx.strokeStyle = '#e6e9ee';
    ctx.lineWidth = 1;
    // draw horizontal grid
    for(let i=0;i<=4;i++){
      const y = pad + (plotH * i/4);
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W-pad, y); ctx.stroke();
    }
    // compute points
    const pts = points.map((p,i)=> {
      const x = pad + (gap * i);
      const y = pad + plotH * (1 - (p.score/100));
      return {x,y,score:p.score,label:p.label};
    });
    // draw area fill and line with progress-based fade/scale for simple animation
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.beginPath();
    pts.forEach((p,i)=> i===0? ctx.moveTo(p.x,p.y): ctx.lineTo(p.x,p.y));
    // close to bottom
    ctx.lineTo(W-pad, H-pad); ctx.lineTo(pad, H-pad); ctx.closePath();
    ctx.fillStyle = 'rgba(3,102,214,' + (0.12*progress) + ')';
    ctx.fill();

    // draw line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++){ ctx.lineTo(pts[i].x, pts[i].y); }
    ctx.strokeStyle = '#0366d6';
    ctx.lineWidth = 2 * (0.6 + 0.4*progress);
    ctx.stroke();

    // draw points scaled by progress
    ctx.fillStyle = '#0366d6';
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,4 * (0.4 + 0.6*progress),0,Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // labels on x — fade in with progress
    ctx.save(); ctx.globalAlpha = progress; ctx.fillStyle = '#333'; ctx.font='12px Arial'; ctx.textAlign='center';
    pts.forEach((p,i) => {
      const label = (p.label.length>12) ? p.label.slice(0,11)+'…' : p.label;
      ctx.fillText(label, p.x, H - 6);
    });
    ctx.restore();
  }

  // utils
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); }); }

  // initial render
  renderCourses();
  renderGradeOptions();
  renderGrades();
  renderAttendance();

  // close modals when clicking outside
  [modalEnroll, modalResolve, modalAttendance].forEach(mod => {
    mod.addEventListener('click', (e) => { if(e.target === mod) mod.style.display = 'none'; });
  });

  // expose for debugging
  window._coursesApp = { courses, grades, renderCourses, renderGrades };
})();