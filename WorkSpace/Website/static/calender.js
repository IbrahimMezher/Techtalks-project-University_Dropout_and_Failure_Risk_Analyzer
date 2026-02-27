

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
      let color = (t === 'exam') ? 'var(--danger)' : 'var(--primary)';
      html += `<div class="event-badge" style="background:${color}">${ev.title}</div>`;
    });

    cell.innerHTML = html;
    calendarGrid.appendChild(cell);
  }
}

function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  renderCalendar();
}


window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('prevMonth').onclick = () => changeMonth(-1);
  document.getElementById('nextMonth').onclick = () => changeMonth(1);

  renderCalendar();
  fetchEvents();
});

function addEventPrompt() {
  let title = prompt('Event Title (e.g., Math Midterm):');
  let date = prompt('Date (YYYY-MM-DD):');
  let type = prompt('Type (Exam/Deadline/Lecture):', 'Deadline');

  if (title && date && type) {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, type })
    }).then(() => fetchEvents());
  }
}