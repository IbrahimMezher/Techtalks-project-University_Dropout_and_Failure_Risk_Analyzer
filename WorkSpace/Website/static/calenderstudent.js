// ===== Storage Keys =====
const STORAGE_EVENTS = "ra_calendar_events_v1";
const STORAGE_COURSES = "ra_courses_v1";
const STORAGE_FILTERS = "ra_course_filters_v1";

// ===== Helpers =====
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid() {
  return "evt_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function toDatetimeLocalValue(date) {
  // date can be Date or ISO string
  const d = (date instanceof Date) ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function parseDatetimeLocal(v) {
  // returns ISO string
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function status(elId, msg) {
  document.getElementById(elId).textContent = msg || "";
}

// ===== Courses =====
// If you already have courses in your Courses page, you can save them to STORAGE_COURSES
// For now we support demo + manual list in localStorage.
function getCourses() {
  const courses = loadJSON(STORAGE_COURSES, []);
  // If empty, provide a minimal default so UI isn't blank
  return courses.length ? courses : [
    { id: "c1", name: "Calculus I" },
    { id: "c2", name: "Programming" },
    { id: "c3", name: "Physics" }
  ];
}
function setCourses(courses) {
  saveJSON(STORAGE_COURSES, courses);
}

function getCourseFilters(courses) {
  const filters = loadJSON(STORAGE_FILTERS, {});
  // default: all visible
  const out = {};
  courses.forEach(c => out[c.id] = (filters[c.id] ?? true));
  return out;
}
function setCourseFilters(filters) {
  saveJSON(STORAGE_FILTERS, filters);
}

// ===== Events =====
function loadEvents() {
  return loadJSON(STORAGE_EVENTS, []);
}
function saveEvents(events) {
  saveJSON(STORAGE_EVENTS, events);
}

// Color by type using your CSS tokens (no custom colors needed beyond tokens)
function typeToClassName(type) {
  // We'll map types to "low/med/high" vibe classes, but FC uses className
  // We'll then style via CSS? FullCalendar inline event styles are limited,
  // so we use className + minimal default. (Works fine.)
  if (type === "exam") return "evt-high";
  if (type === "deadline") return "evt-high";
  if (type === "study") return "evt-med";
  return "evt-low";
}

// Inject event styles once
(function injectEventStyles(){
  const css = `
    .fc .evt-low { background: rgba(22,163,74,.12) !important; border-color: rgba(22,163,74,.25) !important; color: var(--text) !important; }
    .fc .evt-med { background: rgba(79,70,229,.14) !important; border-color: rgba(79,70,229,.25) !important; color: var(--text) !important; }
    .fc .evt-high{ background: rgba(220,38,38,.10) !important; border-color: rgba(220,38,38,.25) !important; color: var(--text) !important; }
    .fc .fc-event { border-radius: 12px !important; font-weight: 900; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();

// ===== App State =====
let calendar;                 // FullCalendar instance
let editingEventId = null;    // if not null, we are editing
let courses = [];
let filters = {};

// ===== UI Elements =====
const elCourseList = document.getElementById("courseList");
const elCourseSelect = document.getElementById("eventCourse");
const elTitle = document.getElementById("eventTitle");
const elType = document.getElementById("eventType");
const elStart = document.getElementById("eventStart");
const elEnd = document.getElementById("eventEnd");
const elNotes = document.getElementById("eventNotes");

const btnAddUpdate = document.getElementById("addUpdateBtn");
const btnCancelEdit = document.getElementById("cancelEditBtn");
const btnDelete = document.getElementById("deleteBtn");
const btnClearAll = document.getElementById("clearAllBtn");
const btnSeedCourses = document.getElementById("seedCoursesBtn");

// ===== Render Courses UI =====
function renderCoursesUI() {
  // Select options
  elCourseSelect.innerHTML = "";
  courses.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    elCourseSelect.appendChild(opt);
  });

  // Checkbox list
  elCourseList.innerHTML = "";
  courses.forEach(c => {
    const row = document.createElement("div");
    row.className = "courseItem";

    const left = document.createElement("div");
    left.className = "courseLeft";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!filters[c.id];
    cb.addEventListener("change", () => {
      filters[c.id] = cb.checked;
      setCourseFilters(filters);
      calendar.refetchEvents();
    });

    const name = document.createElement("span");
    name.textContent = c.name;

    left.appendChild(cb);
    left.appendChild(name);

    const tag = document.createElement("span");
    tag.className = "tiny";
    tag.textContent = c.id;

    row.appendChild(left);
    row.appendChild(tag);
    elCourseList.appendChild(row);
  });
}

// ===== Calendar Events Source =====
function getFilteredEvents() {
  const all = loadEvents();
  return all.filter(e => filters[e.courseId] !== false);
}

// ===== Add/Update/Delete =====
function clearForm() {
  editingEventId = null;
  btnAddUpdate.textContent = "Add Event";
  btnCancelEdit.style.display = "none";
  btnDelete.style.display = "none";

  elTitle.value = "";
  elType.value = "schedule";
  elNotes.value = "";

  // Default start/end: next hour for 1 hour
  const now = new Date();
  now.setMinutes(0,0,0);
  const start = new Date(now.getTime() + 60*60*1000);
  const end = new Date(start.getTime() + 60*60*1000);
  elStart.value = toDatetimeLocalValue(start);
  elEnd.value = toDatetimeLocalValue(end);

  status("formStatus", "");
}

function fillFormFromEvent(evt) {
  editingEventId = evt.id;
  btnAddUpdate.textContent = "Update Event";
  btnCancelEdit.style.display = "inline-flex";
  btnDelete.style.display = "inline-flex";

  elCourseSelect.value = evt.extendedProps.courseId;
  elTitle.value = evt.title || "";
  elType.value = evt.extendedProps.type || "schedule";
  elNotes.value = evt.extendedProps.notes || "";

  elStart.value = toDatetimeLocalValue(evt.start);
  elEnd.value = evt.end ? toDatetimeLocalValue(evt.end) : toDatetimeLocalValue(evt.start);

  status("formStatus", "Editing event: click Update Event to save changes.");
}

function upsertEventFromForm() {
  const courseId = elCourseSelect.value;
  const title = elTitle.value.trim();
  const type = elType.value;
  const notes = elNotes.value.trim();
  const startISO = parseDatetimeLocal(elStart.value);
  const endISO = parseDatetimeLocal(elEnd.value);

  if (!title) return status("formStatus", "Please enter a title.");
  if (!startISO || !endISO) return status("formStatus", "Please choose valid start/end.");
  if (new Date(endISO) < new Date(startISO)) return status("formStatus", "End must be after start.");

  const events = loadEvents();

  if (editingEventId) {
    const idx = events.findIndex(e => e.id === editingEventId);
    if (idx === -1) return status("formStatus", "Could not find event to update.");

    events[idx] = {
      ...events[idx],
      courseId,
      title,
      type,
      notes,
      start: startISO,
      end: endISO
    };
    saveEvents(events);
    status("formStatus", "Updated ✅");
  } else {
    const newEvt = {
      id: uid(),
      courseId,
      title,
      type,
      notes,
      start: startISO,
      end: endISO
    };
    events.push(newEvt);
    saveEvents(events);
    status("formStatus", "Added ✅");
  }

  calendar.refetchEvents();
  clearForm();
}

function deleteEditingEvent() {
  if (!editingEventId) return;
  const events = loadEvents().filter(e => e.id !== editingEventId);
  saveEvents(events);
  calendar.refetchEvents();
  status("formStatus", "Deleted ✅");
  clearForm();
}

function clearAll() {
  saveEvents([]);
  calendar.refetchEvents();
  clearForm();
  status("calendarStatus", "All events cleared.");
}

// ===== Init Calendar =====
function initCalendar() {
  const el = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    height: "auto",
    selectable: true,
    editable: true,
    nowIndicator: true,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },

    // Load events from localStorage and course filters
    events: (fetchInfo, successCallback) => {
      const evts = getFilteredEvents().map(e => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        className: typeToClassName(e.type),
        extendedProps: {
          courseId: e.courseId,
          type: e.type,
          notes: e.notes || ""
        }
      }));
      successCallback(evts);
    },

    // Click a date to prefill start/end
    dateClick: (info) => {
      // set start to clicked date at 09:00, end at 10:00 by default (or keep time if time view)
      const clicked = info.date;
      const start = new Date(clicked);
      if (info.view.type === "dayGridMonth") start.setHours(9,0,0,0);
      const end = new Date(start.getTime() + 60*60*1000);

      elStart.value = toDatetimeLocalValue(start);
      elEnd.value = toDatetimeLocalValue(end);
      status("formStatus", "Date selected. Fill details and click Add Event.");
    },

    // Click an event to edit
    eventClick: (info) => {
      fillFormFromEvent(info.event);
    },

    // Drag or resize events (save changes)
    eventDrop: (info) => {
      persistEventMoveResize(info.event);
    },
    eventResize: (info) => {
      persistEventMoveResize(info.event);
    }
  });

  calendar.render();
}

function persistEventMoveResize(fcEvent) {
  const events = loadEvents();
  const idx = events.findIndex(e => e.id === fcEvent.id);
  if (idx === -1) return;

  events[idx].start = fcEvent.start.toISOString();
  events[idx].end = (fcEvent.end ? fcEvent.end.toISOString() : fcEvent.start.toISOString());
  saveEvents(events);
  status("calendarStatus", "Event updated (moved/resized) ✅");
}

// ===== Demo Courses =====
function seedCourses() {
  const demo = [
    { id: "CALC101", name: "Calculus I" },
    { id: "CS102", name: "Programming Fundamentals" },
    { id: "PHYS110", name: "Physics I" },
    { id: "ENG200", name: "Academic Writing" },
    { id: "STAT210", name: "Statistics" },
  ];
  setCourses(demo);
  courses = getCourses();
  filters = getCourseFilters(courses);
  setCourseFilters(filters);
  renderCoursesUI();
  calendar.refetchEvents();
  status("calendarStatus", "Demo courses loaded ✅");
}

// ===== Wire up buttons =====
btnAddUpdate.addEventListener("click", upsertEventFromForm);
btnCancelEdit.addEventListener("click", clearForm);
btnDelete.addEventListener("click", deleteEditingEvent);
btnClearAll.addEventListener("click", clearAll);
btnSeedCourses.addEventListener("click", seedCourses);

// ===== Boot =====
(function boot(){
  courses = getCourses();
  filters = getCourseFilters(courses);
  setCourseFilters(filters);

  renderCoursesUI();
  initCalendar();
  clearForm();

  status("calendarStatus", "Ready. Click a date to start adding events.");
})();
