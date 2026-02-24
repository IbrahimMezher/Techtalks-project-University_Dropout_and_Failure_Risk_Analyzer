document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Tab Navigation Logic ---
  const tabs = ['courses', 'attendance', 'grades'];
  
  tabs.forEach(tab => {
    const btn = document.getElementById(`nav-${tab}`);
    const panel = document.getElementById(`panel-${tab}`);
    
    if (btn && panel) {
      btn.addEventListener('click', () => {
        // Hide all panels and remove active classes
        tabs.forEach(t => {
          document.getElementById(`panel-${t}`).style.display = 'none';
          document.getElementById(`nav-${t}`).classList.remove('active');
        });
        
        // Show the clicked tab
        panel.style.display = 'block';
        btn.classList.add('active');
      });
    }
  });

  // --- 2. Modal Open Logic ---
  const enrollBtn = document.getElementById('open-enroll');
  if (enrollBtn) enrollBtn.addEventListener('click', () => document.getElementById('modal-enroll').style.display = 'flex');

  const attendanceBtn = document.getElementById('open-attendance');
  if (attendanceBtn) attendanceBtn.addEventListener('click', () => document.getElementById('modal-attendance').style.display = 'flex');

  const gradeBtn = document.getElementById('open-resolve');
  if (gradeBtn) gradeBtn.addEventListener('click', () => document.getElementById('modal-resolve').style.display = 'flex');

  // --- 3. Modal Close Logic ---
  // Attaches to all buttons that say "Cancel"
  document.querySelectorAll('.btn-ghost').forEach(btn => {
    if (btn.textContent.trim() === 'Cancel') {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
      });
    }
  });
});