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

  // storage helpers
  function load(key){ try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ return []; } }
  function save(key, v){ localStorage.setItem(key, JSON.stringify(v)); }

  // id generator
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

  // initial
  let courses = load('courses');
  let grades = load('grades');
  let editingGradeId = null;

  // nav handlers
  function setActive(tab){
    navCourses.classList.remove('active');
    navAttendance.classList.remove('active');
    navGrades.classList.remove('active');
    navCourses.blur(); navAttendance.blur(); navGrades.blur();
    if(tab==='courses'){ navCourses.classList.add('active'); panels.courses.style.display='block'; panels.attendance.style.display='none'; panels.grades.style.display='none'; }
    if(tab==='attendance'){ navAttendance.classList.add('active'); panels.courses.style.display='none'; panels.attendance.style.display='block'; panels.grades.style.display='none'; }
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
      const item = document.createElement('div'); item.className = 'course-item';
      const left = document.createElement('div'); left.innerHTML = `<strong>${escapeHtml(c.name)}</strong><div class="muted">${escapeHtml(c.code||'')}</div>`;
      const right = document.createElement('div');
      const btnDrop = document.createElement('button'); btnDrop.className='btn'; btnDrop.textContent='Drop';
      btnDrop.addEventListener('click', ()=> {
        if(!confirm('Drop '+c.name+'?')) return;
        courses = courses.filter(x => x.id !== c.id);
        // also remove related grades
        grades = grades.filter(g => g.courseId !== c.id);
        save('courses', courses); save('grades', grades);
        renderCourses(); renderGradeOptions(); renderGrades();
      });
      right.appendChild(btnDrop);
      item.appendChild(left);
      item.appendChild(right);
      enrolledList.appendChild(item);
    });
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

    Object.keys(grouped).forEach(cid => {
      const course = courses.find(c => c.id === cid) || { name:'(unknown)' };
      const block = document.createElement('div');
      block.innerHTML = `<strong>${escapeHtml(course.name)}</strong>`;
      const ul = document.createElement('div'); ul.style.marginTop='6px';
      grouped[cid].slice().reverse().forEach(g => {
        const row = document.createElement('div');
        row.style.display='flex'; row.style.justifyContent='space-between'; row.style.padding='6px 0'; row.style.borderBottom='1px solid #f0f0f0';
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
    drawChart(sorted.map(g => ({ score: g.score, label: g.exam })));
  }

  function drawEmptyChart(){
    const ctx = gradesChart.getContext('2d');
    ctx.clearRect(0,0,gradesChart.width,gradesChart.height);
    ctx.fillStyle='#f6f8fa';
    ctx.fillRect(0,0,gradesChart.width,gradesChart.height);
    ctx.fillStyle='#666'; ctx.font='14px Arial';
    ctx.fillText('No grade data', 12, 24);
  }

  function drawChart(points){
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

    // draw area fill
    ctx.beginPath();
    pts.forEach((p,i)=> i===0? ctx.moveTo(p.x,p.y): ctx.lineTo(p.x,p.y));
    // close to bottom
    ctx.lineTo(W-pad, H-pad); ctx.lineTo(pad, H-pad); ctx.closePath();
    ctx.fillStyle = 'rgba(3,102,214,0.12)';
    ctx.fill();

    // draw line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++){ ctx.lineTo(pts[i].x, pts[i].y); }
    ctx.strokeStyle = '#0366d6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // draw points
    ctx.fillStyle = '#0366d6';
    pts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
    });

    // labels on x
    ctx.fillStyle = '#333'; ctx.font='12px Arial'; ctx.textAlign='center';
    pts.forEach((p,i) => {
      const label = (p.label.length>12) ? p.label.slice(0,11)+'…' : p.label;
      ctx.fillText(label, p.x, H - 6);
    });
  }

  // utils
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); }); }

  // initial render
  renderCourses();
  renderGradeOptions();
  renderGrades();

  // close modals when clicking outside
  [modalEnroll, modalResolve].forEach(mod => {
    mod.addEventListener('click', (e) => { if(e.target === mod) mod.style.display = 'none'; });
  });

  // expose for debugging
  window._coursesApp = { courses, grades, renderCourses, renderGrades };
})();