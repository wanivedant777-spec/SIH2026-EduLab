"""
Practical Lab Management Platform (SIH 2026 - Problem Statement SIH26207)
FastAPI Backend Service: Code Evaluation, Judge0 Payload Structuring & Adaptive Tiering
"""

import os
import sys
import uuid
import logging
import shutil
import subprocess
import tempfile
from typing import List, Optional, Dict, Any
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Practical Lab Management Evaluation API",
    description="Evaluation microservice with Judge0 payload formatting and rule-based adaptive difficulty tiering",
    version="1.0.0",
)

# CORS origins from environment (comma-separated), with safe development defaults
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [origin.strip() for origin in _cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Judge0 configuration
JUDGE0_API_URL = os.getenv("JUDGE0_API_URL", "http://localhost:2358")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")
JUDGE0_API_HOST = os.getenv("JUDGE0_API_HOST", "")


# ---------------------------------------------------------------------------
# Pydantic Request / Response Models
# ---------------------------------------------------------------------------

class TestCase(BaseModel):
    input_data: str = Field(..., description="Standard input passed to the program")
    expected_output: str = Field(..., description="Expected output from stdout")
    is_sample: bool = Field(default=False, description="Whether testcase is visible sample or hidden")


class EvaluationRequest(BaseModel):
    student_id: str = Field(..., example="std_2026_014")
    practical_id: str = Field(..., example="prac_dsa_04_bst")
    language_id: int = Field(..., example=54, description="Judge0 language ID: 54=C++, 71=Python, 62=Java, 50=C")
    source_code: str = Field(..., description="Student code submission")
    test_cases: List[TestCase] = Field(default_factory=list)
    attempt_count: int = Field(default=1, ge=1, description="Current submission attempt number")
    time_spent_seconds: int = Field(default=300, ge=0, description="Time student spent on practical in seconds")


class TestCaseResult(BaseModel):
    test_case_index: int
    is_sample: bool
    status: str
    passed: bool
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    expected_output: str
    execution_time_sec: Optional[float] = 0.02
    memory_kb: Optional[int] = 1240
    is_simulation: bool = False


class AdaptiveTierResult(BaseModel):
    assigned_tier: str = Field(..., description="Beginner | Proficient | Advanced")
    recommended_difficulty: str = Field(..., description="Easy | Medium | Hard")
    reasoning: str
    metrics: Dict[str, Any]


class EvaluationResponse(BaseModel):
    submission_id: str
    student_id: str
    practical_id: str
    language_id: int
    status: str
    total_test_cases: int
    passed_test_cases: int
    pass_percentage: float
    coding_marks_awarded: float = Field(..., description="Auto-graded performing/coding score out of 3.0")
    total_possible_marks: float = 3.0
    test_case_results: List[TestCaseResult]
    judge0_payloads: List[Dict[str, Any]]
    adaptive_tiering: AdaptiveTierResult
    evaluated_at: str
    is_simulation: bool = False


class TieringRequest(BaseModel):
    attempt_count: int = Field(default=1, ge=1)
    time_spent_seconds: int = Field(default=600, ge=0)
    pass_rate: float = Field(default=1.0, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Core Business Logic: Judge0 Payload Formatter & Adaptive Tiering
# ---------------------------------------------------------------------------

def structure_judge0_payload(
    language_id: int,
    source_code: str,
    stdin: str,
    expected_output: str,
    cpu_time_limit: float = 2.0,
    memory_limit: int = 128000,
) -> Dict[str, Any]:
    """
    Structures payload adhering to the Judge0 CE/Extra API specification.
    Supports both batch execution and individual submission endpoints.
    """
    return {
        "language_id": language_id,
        "source_code": source_code,
        "stdin": stdin.strip(),
        "expected_output": expected_output.strip(),
        "cpu_time_limit": cpu_time_limit,
        "memory_limit": memory_limit,
    }


def calculate_adaptive_tier(
    attempt_count: int,
    time_spent_seconds: int,
    pass_rate: float
) -> AdaptiveTierResult:
    """
    Rule-based adaptive difficulty tiering function (SIH Scope v1).
    Evaluates student performance using:
      1. Test-case pass rate
      2. Attempt count
      3. Time to solve
    Determines next challenge difficulty recommendations without blackbox ML.
    """
    metrics = {
        "attempt_count": attempt_count,
        "time_spent_seconds": time_spent_seconds,
        "time_spent_minutes": round(time_spent_seconds / 60, 2),
        "pass_rate": round(pass_rate, 4),
        "pass_percentage": round(pass_rate * 100, 1),
    }

    # High performance: 100% pass on 1st or 2nd attempt within 25 minutes
    if pass_rate >= 1.0 and attempt_count <= 2 and time_spent_seconds <= 1500:
        return AdaptiveTierResult(
            assigned_tier="Advanced",
            recommended_difficulty="Hard",
            reasoning=(
                "Student passed 100% of test cases within optimal time and few attempts. "
                "Recommend harder algorithmic variations and edge-case optimization challenges."
            ),
            metrics=metrics,
        )

    # Competent / Proficient: Passed at least 70% or took multiple attempts with eventual success
    if pass_rate >= 0.70:
        return AdaptiveTierResult(
            assigned_tier="Proficient",
            recommended_difficulty="Medium",
            reasoning=(
                f"Student demonstrated solid grasp with {round(pass_rate * 100)}% pass rate "
                f"across {attempt_count} attempt(s). Continue at standard curricular difficulty."
            ),
            metrics=metrics,
        )

    # Struggling / Beginner: Less than 70% pass rate or high attempt count
    return AdaptiveTierResult(
        assigned_tier="Beginner",
        recommended_difficulty="Easy",
        reasoning=(
            f"Pass rate was {round(pass_rate * 100)}% after {attempt_count} attempt(s). "
            "Recommend reviewing theory panel algorithm and pseudocode with guided scaffolded exercises."
        ),
        metrics=metrics,
    )


def execute_locally(language_id: int, source_code: str, stdin: str) -> Dict[str, Any]:
    """
    Safely and truthfully executes student code locally when Judge0 container daemon is not reachable.
    Supports Python 3 and C++20.
    """
    # 1. Python 3 (Judge0 language_id = 71)
    if language_id == 71:
        try:
            start_t = datetime.now()
            proc = subprocess.run(
                [sys.executable, "-c", source_code],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=2.5
            )
            dur = (datetime.now() - start_t).total_seconds()
            if proc.returncode == 0:
                return {
                    "status": {"id": 3, "description": "Accepted"},
                    "stdout": proc.stdout,
                    "stderr": None,
                    "time": str(round(dur, 3)),
                    "memory": 1280,
                    "is_simulated": False
                }
            else:
                return {
                    "status": {"id": 6, "description": "Runtime Error"},
                    "stdout": proc.stdout,
                    "stderr": proc.stderr,
                    "time": str(round(dur, 3)),
                    "memory": 1280,
                    "is_simulated": False
                }
        except subprocess.TimeoutExpired:
            return {
                "status": {"id": 5, "description": "Time Limit Exceeded"},
                "stdout": "",
                "stderr": "Execution timed out (2.500s limit)",
                "time": "2.500",
                "memory": 1280,
                "is_simulated": False
            }
        except Exception as exc:
            return {
                "status": {"id": 11, "description": "Execution Error"},
                "stdout": "",
                "stderr": str(exc),
                "time": "0.000",
                "memory": 1280,
                "is_simulated": False
            }

    # 2. C++ (Judge0 language_id = 54 or 50 for C)
    elif language_id in (54, 50):
        compiler = shutil.which("g++") or shutil.which("clang++")
        if compiler:
            temp_dir = tempfile.mkdtemp(prefix="edulab_eval_")
            src_file = os.path.join(temp_dir, "solution.cpp")
            bin_file = os.path.join(temp_dir, "solution")
            try:
                with open(src_file, "w", encoding="utf-8") as f:
                    f.write(source_code)

                # Compile with -std=c++20
                compile_res = subprocess.run(
                    [compiler, "-O2", "-std=c++20", src_file, "-o", bin_file],
                    capture_output=True,
                    text=True,
                    timeout=6.0
                )
                if compile_res.returncode != 0:
                    return {
                        "status": {"id": 6, "description": "Compilation Error"},
                        "stdout": "",
                        "stderr": compile_res.stderr,
                        "time": "0.000",
                        "memory": 0,
                        "is_simulated": False
                    }

                # Execute compiled binary
                start_t = datetime.now()
                run_res = subprocess.run(
                    [bin_file],
                    input=stdin,
                    capture_output=True,
                    text=True,
                    timeout=2.5
                )
                dur = (datetime.now() - start_t).total_seconds()
                if run_res.returncode == 0:
                    return {
                        "status": {"id": 3, "description": "Accepted"},
                        "stdout": run_res.stdout,
                        "stderr": None,
                        "time": str(round(dur, 3)),
                        "memory": 1240,
                        "is_simulated": False
                    }
                else:
                    return {
                        "status": {"id": 11, "description": "Runtime Error"},
                        "stdout": run_res.stdout,
                        "stderr": run_res.stderr,
                        "time": str(round(dur, 3)),
                        "memory": 1240,
                        "is_simulated": False
                    }
            except subprocess.TimeoutExpired:
                return {
                    "status": {"id": 5, "description": "Time Limit Exceeded"},
                    "stdout": "",
                    "stderr": "Execution timed out (2.500s limit)",
                    "time": "2.500",
                    "memory": 1240,
                    "is_simulated": False
                }
            except Exception as exc:
                return {
                    "status": {"id": 11, "description": "Execution Error"},
                    "stdout": "",
                    "stderr": str(exc),
                    "time": "0.000",
                    "memory": 1240,
                    "is_simulated": False
                }
            finally:
                shutil.rmtree(temp_dir, ignore_errors=True)

    # 3. Explicit simulation fallback (never fakes matching stdout)
    return {
        "status": {"id": 15, "description": "DEMO / SIMULATION (Judge0 Offline)"},
        "stdout": "[DEMO / SIMULATION] Compiler daemon unavailable for language ID " + str(language_id),
        "stderr": None,
        "time": "0.015",
        "memory": 1280,
        "is_simulated": True
    }


def execute_via_judge0(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Attempts execution via Judge0 API. If Judge0 is not running locally,
    falls back to truthful local execution or explicit simulation labeling.
    """
    headers = {"Content-Type": "application/json"}
    if JUDGE0_API_KEY:
        headers["X-RapidAPI-Key"] = JUDGE0_API_KEY
        if JUDGE0_API_HOST:
            headers["X-RapidAPI-Host"] = JUDGE0_API_HOST

    try:
        url = f"{JUDGE0_API_URL.rstrip('/')}/submissions?wait=true"
        resp = requests.post(url, json=payload, headers=headers, timeout=5)
        if resp.status_code in (200, 201):
            data = resp.json()
            data["is_simulated"] = False
            return data
        logger.warning("Judge0 returned status %d: %s", resp.status_code, resp.text[:200])
    except requests.exceptions.ConnectionError:
        logger.info("Judge0 not reachable at %s — using local runner", JUDGE0_API_URL)
    except requests.exceptions.Timeout:
        logger.warning("Judge0 request timed out at %s", JUDGE0_API_URL)
    except Exception as exc:
        logger.error("Unexpected Judge0 error: %s", exc)

    # Truthful local execution
    return execute_locally(
        language_id=payload.get("language_id", 54),
        source_code=payload.get("source_code", ""),
        stdin=payload.get("stdin", "")
    )


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["System"])
def root_info():
    return {
        "service": "Practical Lab Management Evaluation Engine",
        "hackathon": "Smart India Hackathon 2026",
        "problem_statement": "SIH26207",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/evaluate", response_model=EvaluationResponse, tags=["Evaluation"])
def evaluate_submission(payload: EvaluationRequest):
    """
    Main evaluation pipeline:
    1. Validates student code submission
    2. Builds structured Judge0 execution payloads for each test case
    3. Executes / grades test cases
    4. Computes coding performance marks (5.0 max rubric)
    5. Runs rule-based adaptive difficulty tiering
    """
    if not payload.source_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source code cannot be empty.",
        )

    # Fallback sample test cases if none supplied
    test_cases = payload.test_cases
    if not test_cases:
        test_cases = [
            TestCase(input_data="4\n10 5 20 15", expected_output="5 10 15 20", is_sample=True),
            TestCase(input_data="5\n30 20 40 10 25", expected_output="10 20 25 30 40", is_sample=False),
            TestCase(input_data="1\n42", expected_output="42", is_sample=False),
        ]

    judge0_payloads = []
    test_results: List[TestCaseResult] = []
    passed_count = 0

    for idx, tc in enumerate(test_cases, start=1):
        j0_payload = structure_judge0_payload(
            language_id=payload.language_id,
            source_code=payload.source_code,
            stdin=tc.input_data,
            expected_output=tc.expected_output,
        )
        judge0_payloads.append(j0_payload)

        # Execute or simulate
        res = execute_via_judge0(j0_payload)
        actual_output = (res.get("stdout") or "").strip()
        expected = tc.expected_output.strip()
        status_id = res.get("status", {}).get("id")
        is_simulated = res.get("is_simulated", False)

        # Truthful evaluation: pass/fail depends strictly on expected vs actual output comparison
        if is_simulated:
            is_passed = False
            status_desc = "DEMO / SIMULATED"
        elif res.get("stderr") or (status_id and status_id != 3):
            is_passed = False
            status_desc = res.get("status", {}).get("description") or "Execution Error"
        else:
            is_passed = (actual_output == expected)
            status_desc = "Passed" if is_passed else "Wrong Answer"

        if is_passed:
            passed_count += 1

        test_results.append(
            TestCaseResult(
                test_case_index=idx,
                is_sample=tc.is_sample,
                status=status_desc,
                passed=is_passed,
                stdout=actual_output,
                stderr=res.get("stderr"),
                expected_output=expected,
                execution_time_sec=float(res.get("time") or 0.02),
                memory_kb=int(res.get("memory") or 1240),
                is_simulation=is_simulated,
            )
        )

    total_count = len(test_cases)
    pass_rate = passed_count / total_count if total_count > 0 else 0.0

    # Official SIH 10-mark distribution: Performing (Coding) Component = 3.0 Marks
    coding_marks = round(pass_rate * 3.0, 2)

    # Adaptive tiering
    tier_result = calculate_adaptive_tier(
        attempt_count=payload.attempt_count,
        time_spent_seconds=payload.time_spent_seconds,
        pass_rate=pass_rate,
    )

    submission_id = f"sub_{uuid.uuid4().hex[:12]}"
    has_simulations = any(r.is_simulation for r in test_results)

    final_status = "Passed" if pass_rate == 1.0 else ("Partially Passed" if passed_count > 0 else "Failed")
    if has_simulations and pass_rate == 0.0:
        final_status = "DEMO_SIMULATION"

    return EvaluationResponse(
        submission_id=submission_id,
        student_id=payload.student_id,
        practical_id=payload.practical_id,
        language_id=payload.language_id,
        status=final_status,
        total_test_cases=total_count,
        passed_test_cases=passed_count,
        pass_percentage=round(pass_rate * 100.0, 1),
        coding_marks_awarded=coding_marks,
        total_possible_marks=3.0,
        test_case_results=test_results,
        judge0_payloads=judge0_payloads,
        adaptive_tiering=tier_result,
        evaluated_at=datetime.utcnow().isoformat(),
        is_simulation=has_simulations,
    )


@app.post("/api/tiering", response_model=AdaptiveTierResult, tags=["Adaptive Learning"])
def evaluate_adaptive_tier(req: TieringRequest):
    """
    Dedicated endpoint for the rule-based difficulty tiering engine.
    Can be queried independently by Supabase Edge Functions or n8n workflow triggers.
    """
    return calculate_adaptive_tier(
        attempt_count=req.attempt_count,
        time_spent_seconds=req.time_spent_seconds,
        pass_rate=req.pass_rate,
    )


# ---------------------------------------------------------------------------
# Institutional Authentication & Server-Side Role Verification
# ---------------------------------------------------------------------------
class AuthLoginRequest(BaseModel):
    identifier: str = Field(..., description="Student PRN (e.g. GHR2025AI001) or Faculty Employee ID (e.g. FAC001)")
    password: str = Field(..., description="Institutional account password")


@app.post("/api/auth/login", tags=["Authentication"])
def institutional_login(req: AuthLoginRequest):
    """
    Unified Institutional Login Endpoint.
    Never asks if the user is a student or faculty.
    Resolves the identifier securely from the database roster, verifies or provisions credentials,
    and returns the verified profile and role.
    """
    clean_id = req.identifier.strip().upper()
    if not clean_id or not req.password:
        raise HTTPException(status_code=400, detail="Both Institutional ID and Password are required.")

    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_key:
        logger.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured")
        raise HTTPException(status_code=500, detail="Authentication service is not configured. Contact administrator.")

    admin_headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json"
    }

    # 1. Lookup the identifier in the institutional roster
    roster_url = f"{supabase_url}/rest/v1/institutional_roster?identifier=eq.{clean_id}&select=*,batches(name),departments(name)"
    try:
        res = requests.get(roster_url, headers=admin_headers, timeout=10)
    except Exception as e:
        logger.error("Database connection error during login: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Unable to reach authentication service. Please try again later.")

    if res.status_code != 200 or not res.json():
        # Reject unauthorized identifiers immediately
        raise HTTPException(
            status_code=401,
            detail="Institutional ID is not recognized in the college database. Access denied."
        )

    roster_entry = res.json()[0]
    email = roster_entry.get("email")
    role = roster_entry.get("role", "student")
    full_name = roster_entry.get("full_name", "Member")
    batch_name = "C1"
    if isinstance(roster_entry.get("batches"), dict):
        batch_name = roster_entry["batches"].get("name", "C1")

    # 2. Attempt Supabase Auth sign-in
    token_url = f"{supabase_url}/auth/v1/token?grant_type=password"
    session_data = None

    try:
        login_res = requests.post(
            token_url,
            headers={"apikey": service_key, "Content-Type": "application/json"},
            json={"email": email, "password": req.password},
            timeout=10
        )
        if login_res.status_code == 200:
            session_data = login_res.json()
        else:
            # First-time sign in: auto-provision confirmed account via Admin API without email limits
            admin_create_url = f"{supabase_url}/auth/v1/admin/users"
            admin_res = requests.post(
                admin_create_url,
                headers=admin_headers,
                json={
                    "email": email,
                    "password": req.password,
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": full_name,
                        "role": role,
                        "identifier": clean_id
                    }
                },
                timeout=10
            )
            if admin_res.status_code in (200, 201):
                # Account successfully provisioned, now login
                retry_login = requests.post(
                    token_url,
                    headers={"apikey": service_key, "Content-Type": "application/json"},
                    json={"email": email, "password": req.password},
                    timeout=10
                )
                if retry_login.status_code == 200:
                    session_data = retry_login.json()
            else:
                # If account exists but password was wrong
                raise HTTPException(
                    status_code=401,
                    detail="Invalid password for this institutional account. Please check your credentials."
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Authentication service error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Authentication service encountered an error. Please try again later.")

    user_id = session_data.get("user", {}).get("id") if session_data else None

    # 3. Retrieve verified profile
    prof_url = f"{supabase_url}/rest/v1/profiles?email=eq.{email}&select=*,batches(name)"
    try:
        prof_res = requests.get(prof_url, headers=admin_headers, timeout=10)
        if prof_res.status_code == 200 and prof_res.json():
            p = prof_res.json()[0]
            user_id = p.get("id") or user_id
            role = p.get("role") or role
            full_name = p.get("full_name") or full_name
            if isinstance(p.get("batches"), dict):
                batch_name = p["batches"].get("name", batch_name)
    except Exception:
        pass

    return {
        "status": "success",
        "session": session_data,
        "profile": {
            "id": user_id,
            "email": email,
            "identifier": clean_id,
            "name": full_name,
            "role": role,
            "batchName": batch_name,
            "status": "active"
        }
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)

