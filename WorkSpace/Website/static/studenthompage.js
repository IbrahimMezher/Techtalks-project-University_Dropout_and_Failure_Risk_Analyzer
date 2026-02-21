// ---------- Mock "database" course list (progress is not AI; risk is AI-controlled) ----------
let courses = [
  { courseId:"MATH101", name:"Math 101",    instructor:"Dr. Nasser", progress:78, nextDeadline:"Quiz 4 • Feb 12", riskPercent: null, riskLevel: null, reasons: [] },
  { courseId:"CS205",   name:"CS 205",      instructor:"Ms. Rana",   progress:46, nextDeadline:"Project 2 • Feb 10", riskPercent: null, riskLevel: null, reasons: [] },
  { courseId:"ENG110",  name:"English 110", instructor:"Mr. Jad",    progress:32, nextDeadline:"Essay • Feb 9",     riskPercent: null, riskLevel: null, reasons: [] },
  { courseId:"PHY120",  name:"Physics 120", instructor:"Dr. Hadi",   progress:61, nextDeadline:"Lab report • Feb 14", riskPercent: null, riskLevel: null, reasons: [] },
  { courseId:"HIS201",  name:"History 201", instructor:"Ms. Lara",   progress:85, nextDeadline:"Reading • Feb 11", riskPercent: null, riskLevel: null, reasons: [] },
  { courseId:"BIO150",  name:"Biology 150", instructor:"Dr. Mira",   progress:28, nextDeadline:"Midterm • Feb 15", riskPercent: null, riskLevel: null, reasons: [] },
];

let currentFilter = "all";

// ---------- DOM ----------
const grid = document.getElementById("courseGrid");
const statTotal = document.getElementById("statTotal");
const statLow = document.getElementById("statLow");
const statMed = document.getElementById("statMed");
const statHigh = document.getElementById("statHigh");
const pill = document.getElementById("courseCountPill");
const aiStatus = document.getElementById("aiStatus");
const refreshBtn = document.getElementById("refreshBtn");

// ---------- Risk helpers ----------
function riskFromPercent(p){
  if (p >= 70) return "high";
  if (p >= 40) return "medium";
  return "low";
}
function chipClass(level){
  if(level === "low") return "chip--low";
  if(level === "medium") return "chip--med";
  return "chip--high";
}
function dotClass(level){
  if(level === "low") return "dot--low";
  if(level === "medium") return "dot--med";
  return "dot--high";
}
function label(level){
  if(level === "low") return "LOW";
  if(level === "medium") return "MED";
  return "HIGH";
}

// ---------- Mock AI (replace with a real API call later) ----------
async function mockAiRiskScores() {
  // Simulate network + computation time
  await new Promise(r => setTimeout(r, 450));

  // Return scores per courseId
  return courses.map(c => {
    // Example logic: low progress tends to raise risk (just for demo)
    const noise = Math.floor(Math.random() * 18) - 9; // -9..+8
    let base = 100 - c.progress;                      // lower progress => higher risk
    let riskPercent = Math.max(0, Math.min(100, base + noise));

    const level = riskFromPercent(riskPercent);

    const reasons = [];
    if (c.progress < 40) reasons.push("Low course completion so far");
    if (level !== "low") reasons.push("Recent performance trend needs attention");
    if (level === "high") reasons.push("High chance of missing upcoming deadlines");

    return {
      courseId: c.courseId,
      riskPercent,
      riskLevel: level,
      reasons
    };
  });
}

// If you have a real backend later, this is what it would look like:
// async function fetchAiRiskScores(studentId){
//   const res = await fetch(`/api/risk-scores?studentId=${encodeURIComponent(studentId)}`);
//   if(!res.ok) throw new Error("Failed to load AI risk scores");
//   return await res.json(); // expect { courses: [{courseId, riskPercent, riskLevel, reasons}] }
// }

// ---------- UI update ----------
function updateSummary(){
  const total = courses.length;
  const low = courses.filter(c => c.riskLevel === "low").length;
  const med = courses.filter(c => c.riskLevel === "medium").length;
  const high = courses.filter(c => c.riskLevel === "high").length;

  statTotal.textContent = total;
  statLow.textContent = low;
  statMed.textContent = med;
  statHigh.textContent = high;
  pill.textContent = total;
}

function visibleCourses(){
  if(currentFilter === "all") return courses;
  return courses.filter(c => c.riskLevel === currentFilter);
}

function renderCards(){
  grid.innerHTML = "";

  visibleCourses().forEach(c => {
    const level = c.riskLevel ?? "low";
    const pct = (c.riskPercent ?? 0);

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card__top">
        <div>
          <h3 class="card__title">${c.name}</h3>
          <div class="card__meta">Instructor: ${c.instructor}</div>
        </div>

        <span class="chip ${chipClass(level)}">
          <span class="dot ${dotClass(level)}"></span>
          ${label(level)} • ${pct}%
        </span>
      </div>

      <div>
        <div class="row">
          <span>Progress</span>
          <span>${c.progress}%</span>
        </div>
        <div class="bar">
          <div style="width:${c.progress}%"></div>
        </div>
      </div>

      <div class="deadline">Next: ${c.nextDeadline}</div>

      ${
        c.reasons && c.reasons.length
          ? `<ul class="reasons">${c.reasons.map(r => `<li>${r}</li>`).join("")}</ul>`
          : `<ul class="reasons"><li>No risk reasons available</li></ul>`
      }
    `;
    grid.appendChild(card);
  });
}

// ---------- AI refresh ----------
async function refreshAi(){
  try{
    aiStatus.textContent = "AI status: updating…";
    refreshBtn.disabled = true;

    const ai = await mockAiRiskScores();

    const byId = new Map(ai.map(x => [x.courseId, x]));
    courses = courses.map(c => {
      const s = byId.get(c.courseId);
      if(!s) return c;
      return { ...c, riskPercent: s.riskPercent, riskLevel: s.riskLevel, reasons: s.reasons };
    });

    updateSummary();
    renderCards();
    aiStatus.textContent = "AI status: updated";
  }catch(e){
    console.error(e);
    aiStatus.textContent = "AI status: unavailable (check console)";
  }finally{
    refreshBtn.disabled = false;
  }
}

// ---------- Events ----------
document.querySelectorAll(".filters .btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filters .btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderCards();
  });
});

refreshBtn.addEventListener("click", refreshAi);

// ---------- Init ----------
updateSummary();
renderCards();
refreshAi();          // initial AI run
setInterval(refreshAi, 60000); // refresh every 60s

