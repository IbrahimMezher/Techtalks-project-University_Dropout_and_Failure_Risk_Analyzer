from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Dropout/Failure Risk API (FREE)")

# allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ok for local demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    attendance: float = Field(ge=0, le=100)
    grade: float = Field(ge=0, le=100)
    assignments: float = Field(ge=0, le=100)
    difficulty: int = Field(ge=1, le=4)
    workload: int = Field(ge=0, le=2)
    financial: int = Field(ge=0, le=2)
    grade_drop: int = Field(ge=0, le=1)

class PredictResponse(BaseModel):
    risk_percent: int
    risk_label: str
    reasons: list[str]

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def label_from_risk(risk: int) -> str:
    if risk < 35: return "LOW"
    if risk < 70: return "MEDIUM"
    return "HIGH"

@app.get("/health")
def health():
    return {"status": "ok", "mode": "free_rules"}

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    # Convert inputs to "badness" scores (0..1)
    att_bad = clamp((100 - req.attendance) / 100, 0, 1)
    grade_bad = clamp((100 - req.grade) / 100, 0, 1)
    asg_bad = clamp((100 - req.assignments) / 100, 0, 1)
    diff_bad = (req.difficulty - 1) / 3
    work_bad = req.workload / 2
    fin_bad  = req.financial / 2
    drop_bad = req.grade_drop

    # Weights (you can tune these anytime)
    weights = {
        "attendance": 0.25,
        "grade": 0.30,
        "assignments": 0.20,
        "difficulty": 0.10,
        "workload": 0.07,
        "financial": 0.06,
        "grade_drop": 0.02
    }

    score = (
        weights["attendance"] * att_bad +
        weights["grade"] * grade_bad +
        weights["assignments"] * asg_bad +
        weights["difficulty"] * diff_bad +
        weights["workload"] * work_bad +
        weights["financial"] * fin_bad +
        weights["grade_drop"] * drop_bad
    )

    risk = int(round(clamp(score * 100, 0, 100)))

    # simple explanations
    drivers = [
        ("Low attendance", weights["attendance"] * att_bad),
        ("Low grade", weights["grade"] * grade_bad),
        ("Missing assignments", weights["assignments"] * asg_bad),
        ("High course difficulty", weights["difficulty"] * diff_bad),
        ("Workload shock", weights["workload"] * work_bad),
        ("Financial pressure", weights["financial"] * fin_bad),
        ("Recent grade drop", weights["grade_drop"] * drop_bad),
    ]
    drivers.sort(key=lambda x: x[1], reverse=True)
    reasons = [name for name, _ in drivers[:3]]

    return {
        "risk_percent": risk,
        "risk_label": label_from_risk(risk),
        "reasons": reasons
    }
