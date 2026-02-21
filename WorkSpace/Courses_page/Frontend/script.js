// Hardcoded backend endpoint (no need to show it on the page)
const API_URL = "http://127.0.0.1:8000/predict";

function chipForRisk(risk){
  if (risk < 35) return { cls: "chip chip--low", dot: "dot--low", text: "LOW" };
  if (risk < 70) return { cls: "chip chip--med", dot: "dot--med", text: "MEDIUM" };
  return { cls: "chip chip--high", dot: "dot--high", text: "HIGH" };
}

async function predictRisk() {
  const threshold = Number(document.getElementById("threshold").value);

  const payload = {
    attendance: Number(document.getElementById("attendance").value),
    grade: Number(document.getElementById("grade").value),
    assignments: Number(document.getElementById("assignments").value),
    difficulty: Number(document.getElementById("difficulty").value),
    workload: Number(document.getElementById("workload").value),
    financial: Number(document.getElementById("financial").value),
    grade_drop: Number(document.getElementById("gradeDrop").value)
  };

  document.getElementById("status").textContent = "Calculating risk...";
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || "API error");

    // Free backend returns: risk_percent, risk_label, reasons
    render(
      data.risk_percent,
      data.risk_label,
      data.reasons || [],
      threshold
    );

    document.getElementById("status").textContent = "Done ✅";
  } catch (e) {
    document.getElementById("status").textContent =
      "Error ❌ (Backend running? Open http://127.0.0.1:8000/docs)";
    console.error(e);
  }
}

function render(risk, label, reasons, threshold) {
  document.getElementById("resultCard").style.display = "block";
  document.getElementById("riskValue").textContent = risk + "%";
  document.getElementById("riskLabel").textContent = label;

  const chip = chipForRisk(risk);
  document.getElementById("riskLevelChip").innerHTML =
    `<span class="${chip.cls}"><span class="dot ${chip.dot}"></span>${chip.text}</span>`;

  if (risk >= threshold) {
    document.getElementById("riskHint").textContent = "Above threshold (" + threshold + "%)";
    document.getElementById("alertMsg").innerHTML =
      "⚠️ Recommend proactive support outreach (advisor, tutoring, financial aid).";
  } else {
    document.getElementById("riskHint").textContent = "Below threshold (" + threshold + "%)";
    document.getElementById("alertMsg").textContent =
      "No alert. Continue monitoring and offer optional support resources.";
  }

  const reasonsList = document.getElementById("reasonsList");
  reasonsList.innerHTML = "";
  (reasons.length ? reasons : ["No reasons returned."]).forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    reasonsList.appendChild(li);
  });
}

function resetForm() {
  document.getElementById("studentId").value = "";
  document.getElementById("courseName").value = "";
  document.getElementById("attendance").value = 75;
  document.getElementById("grade").value = 70;
  document.getElementById("assignments").value = 65;
  document.getElementById("difficulty").value = 2;
  document.getElementById("workload").value = 1;
  document.getElementById("financial").value = 1;
  document.getElementById("gradeDrop").value = 0;
  document.getElementById("threshold").value = 60;
  document.getElementById("resultCard").style.display = "none";
  document.getElementById("status").textContent = "";
}


document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("predictBtn").addEventListener("click", predictRisk);
  document.getElementById("resetBtn").addEventListener("click", resetForm);
});
