

const monthTitle = document.getElementById('monthTitle');
const calendarGrid = document.getElementById('calendarGrid');

let currentDate = new Date();
let userEvents = [];

async function fetchEvents() {
  try {
    const response = await fetch('/api/events');
    if (response.ok) {
      userEvents = await response.json();
      renderCalendar();
    }
  } catch (e) {
    console.error('Failed to fetch events', e);
  }
}

function renderCalendar() {
  calendarGrid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.innerText = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    calendarGrid.appendChild(empty);
  }

  let today = new Date();
  for (let i = 1; i <= daysInMonth; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';

    if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
      cell.classList.add('today');
    }

    let dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    let html = `<div class="day-number">${i}</div>`;

    let dayEvents = userEvents.filter(e => e.date === dayStr);
    dayEvents.forEach(ev => {
      let t = (ev.type || '').toLowerCase();
      let color = 'var(--primary)';

      if (t.includes('exam')) color = 'var(--danger)';
      else if (t.includes('attendance')) color = '#10b981'; 
      else if (t.includes('deadline')) color = '#f59e0b';   

      if (ev.is_manual) {
        html += `<div class="event-badge" style="background:${color}; cursor:pointer;" title="${ev.title}" onclick="handleEventClick(${ev.id})">${ev.title}</div>`;
      } else {
        html += `<div class="event-badge" style="background:${color}" title="${ev.title}">${ev.title}</div>`;
      }
    });

    cell.innerHTML = html;
    calendarGrid.appendChild(cell);
  }
}

function addEventPrompt() {
  let title = prompt('Event Title (e.g., Math Midterm):');
  if (!title) return;

  let date = prompt('Date (YYYY-MM-DD):');
  if (!date) return;

  let type = prompt('Type (Exam/Deadline/Lecture):', 'Deadline');

  if (title && date && type) {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, type })
    }).then(() => fetchEvents());
  }
}

function handleEventClick(id) {
  const ev = userEvents.find(e => e.id === id);
  if (!ev) return;

  let action = prompt(`Manage Event: "${ev.title}"\n\nType 'delete' to remove.\nType 'edit' to change details.`);
  if (!action) return;

  action = action.trim().toLowerCase();

  if (action === 'delete') {
    if (confirm("Are you sure you want to delete this event?")) {
      fetch(`/api/events/${id}`, { method: 'DELETE' }).then(() => fetchEvents());
    }
  } else if (action === 'edit') {
    let newTitle = prompt("New Title:", ev.title);
    if (newTitle === null) return;
    let newDate = prompt("New Date (YYYY-MM-DD):", ev.date);
    if (newDate === null) return;
    let newType = prompt("New Type:", ev.type);
    if (newType === null) return;

    fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, date: newDate, type: newType })
    }).then(() => fetchEvents());
  }
}

function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  renderCalendar();
}


window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);
  
  const addBtn = document.getElementById('addEventBtn');
  if (addBtn) addBtn.onclick = () => addEventPrompt();

  renderCalendar();
  fetchEvents();
});
