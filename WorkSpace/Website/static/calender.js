const monthTitle = document.getElementById("monthTitle");
const calendarGrid = document.getElementById("calendarGrid");

let currentDate = new Date();

function renderCalendar() {
  calendarGrid.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  monthTitle.textContent = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "card";
    cell.style.padding = "12px";
    cell.style.textAlign = "center";
    cell.textContent = day;
    calendarGrid.appendChild(cell);
  }
}

document.getElementById("prevMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

renderCalendar();