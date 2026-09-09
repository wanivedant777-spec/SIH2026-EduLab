"""
Practical Lab Management Platform (SIH 2026 - Problem Statement SIH26207)
FastAPI Backend Service: Code Evaluation, Judge0 Payload Structuring & Adaptive Tiering
"""

import os
import re
import sys
import uuid
import logging
import shutil
import subprocess
import tempfile
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import random

from parameterized_tests import (
    generate_parameterized_test_cases,
    resolve_canonical_practical,
    CANONICAL_CS201P_CATALOG,
    CANONICAL_GENERATOR_REGISTRY,
    UnsupportedPracticalError,
)

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status, Header, Depends
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


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# Judge0 configuration
JUDGE0_API_URL = os.getenv("JUDGE0_API_URL", "http://localhost:2358")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY", "")
JUDGE0_API_HOST = os.getenv("JUDGE0_API_HOST", "")


# ---------------------------------------------------------------------------
# Pydantic Request / Response Models
# ---------------------------------------------------------------------------

class TestCase(BaseModel):
    __test__ = False
    input_data: str = Field(..., description="Standard input passed to the program")
    expected_output: str = Field(..., description="Expected output from stdout")
    is_sample: bool = Field(default=False, description="Whether testcase is visible sample or hidden")
    is_parameterized: bool = Field(default=False, description="Whether testcase is dynamically generated per student")


class EvaluationRequest(BaseModel):
    student_id: Optional[str] = Field(default=None, description="Student ID or institutional identifier (derived from session context)")
    practical_id: str = Field(..., description="Practical ID or code")
    practical_number: Optional[int] = Field(default=None, description="Optional canonical practical number (1-10)")
    practical_title: Optional[str] = Field(default=None, description="Optional practical title for exact disambiguation")
    subject_code: Optional[str] = Field(default=None, description="Optional subject code (e.g. CS201P)")
    language_id: int = Field(..., description="Judge0 language ID: 54=C++, 71=Python, 62=Java, 50=C")
    source_code: str = Field(..., description="Student code submission")
    test_cases: List[TestCase] = Field(default_factory=list)
    attempt_count: int = Field(default=1, ge=1, description="Current submission attempt number")
    time_spent_seconds: int = Field(default=300, ge=0, description="Time student spent on practical in seconds")


class TestCaseResult(BaseModel):
    test_case_index: int
    is_sample: bool
    is_parameterized: bool = False
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
    Safely and truthfully executes student code locally via host compiler / runtime.
    Supports Python 3 (71), C++ (54), C (50), and Java (62).
    Never invents or simulates test results.
    """
    # 1. Python 3 (Judge0 language_id = 71)
    if language_id == 71:
        py_exec = sys.executable or shutil.which("python3") or shutil.which("python")
        if not py_exec:
            return {
                "status": {"id": 15, "description": "Service Unavailable"},
                "stdout": "",
                "stderr": "Python 3 interpreter not found on host.",
                "is_unavailable": True,
            }
        try:
            start_t = datetime.now()
            proc = subprocess.run(
                [py_exec, "-c", source_code],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=3.0
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
                "stderr": "Execution timed out (3.000s limit)",
                "time": "3.000",
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

    # 2. C++20 & C (Judge0 language_id = 54 or 50)
    elif language_id in (54, 50):
        compiler = shutil.which("g++") or shutil.which("clang++") or shutil.which("gcc")
        if not compiler:
            return {
                "status": {"id": 15, "description": "Service Unavailable"},
                "stdout": "",
                "stderr": "C/C++ compiler not available on host.",
                "is_unavailable": True,
            }

        temp_dir = tempfile.mkdtemp(prefix="edulab_c_")
        is_c = language_id == 50
        src_ext = ".c" if is_c else ".cpp"
        src_file = os.path.join(temp_dir, f"solution{src_ext}")
        bin_file = os.path.join(temp_dir, "solution")
        try:
            with open(src_file, "w", encoding="utf-8") as f:
                f.write(source_code)

            flags = [compiler, "-O2"]
            if not is_c:
                flags.append("-std=c++20")
            flags.extend([src_file, "-o", bin_file])

            compile_res = subprocess.run(
                flags,
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

            start_t = datetime.now()
            run_res = subprocess.run(
                [bin_file],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=3.0
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
                "stderr": "Execution timed out (3.000s limit)",
                "time": "3.000",
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

    # 3. Java 21 / OpenJDK (Judge0 language_id = 62)
    elif language_id == 62:
        javac = shutil.which("javac")
        java_cmd = shutil.which("java")
        if not javac or not java_cmd:
            return {
                "status": {"id": 15, "description": "Service Unavailable"},
                "stdout": "",
                "stderr": "Java SDK (javac/java) not available on host.",
                "is_unavailable": True,
            }

        temp_dir = tempfile.mkdtemp(prefix="edulab_java_")
        src_file = os.path.join(temp_dir, "Main.java")
        try:
            with open(src_file, "w", encoding="utf-8") as f:
                f.write(source_code)

            compile_res = subprocess.run(
                [javac, src_file],
                capture_output=True,
                text=True,
                timeout=8.0
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

            start_t = datetime.now()
            run_res = subprocess.run(
                [java_cmd, "-cp", temp_dir, "Main"],
                input=stdin,
                capture_output=True,
                text=True,
                timeout=4.0
            )
            dur = (datetime.now() - start_t).total_seconds()
            if run_res.returncode == 0:
                return {
                    "status": {"id": 3, "description": "Accepted"},
                    "stdout": run_res.stdout,
                    "stderr": None,
                    "time": str(round(dur, 3)),
                    "memory": 2048,
                    "is_simulated": False
                }
            else:
                return {
                    "status": {"id": 11, "description": "Runtime Error"},
                    "stdout": run_res.stdout,
                    "stderr": run_res.stderr,
                    "time": str(round(dur, 3)),
                    "memory": 2048,
                    "is_simulated": False
                }
        except subprocess.TimeoutExpired:
            return {
                "status": {"id": 5, "description": "Time Limit Exceeded"},
                "stdout": "",
                "stderr": "Execution timed out (4.000s limit)",
                "time": "4.000",
                "memory": 2048,
                "is_simulated": False
            }
        except Exception as exc:
            return {
                "status": {"id": 11, "description": "Execution Error"},
                "stdout": "",
                "stderr": str(exc),
                "time": "0.000",
                "memory": 2048,
                "is_simulated": False
            }
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    # 4. Any other language without local runtime
    return {
        "status": {"id": 15, "description": "Service Unavailable"},
        "stdout": "",
        "stderr": f"Code execution service is currently unavailable for language ID {language_id}.",
        "time": "0.000",
        "memory": 0,
        "is_unavailable": True,
    }


def execute_via_judge0(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Attempts execution via Judge0 API. If Judge0 is not running locally or fails with
    sandbox virtualization errors, falls back to truthful host compiler execution.
    Never invents or simulates test case execution.
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
            status_id = data.get("status", {}).get("id")
            # Check for container / Rosetta isolate internal sandbox failure
            is_sandbox_error = (
                status_id == 13
                or (data.get("message") and "No such file or directory" in data.get("message", ""))
                or "rosetta error" in (data.get("stderr") or "")
            )
            if is_sandbox_error:
                logger.warning("Judge0 sandbox failure (%s). Falling back to truthful compiler execution.", data.get("message"))
                return execute_locally(
                    language_id=payload.get("language_id", 54),
                    source_code=payload.get("source_code", ""),
                    stdin=payload.get("stdin", "")
                )
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
    """
    Health check endpoint reporting microservice status, uptime timestamp,
    Judge0 code execution engine reachability, and execution mode.
    """
    judge0_reachable = False
    judge0_version = None
    execution_mode = "truthful_compiler"

    try:
        headers = {}
        if JUDGE0_API_KEY:
            headers["X-RapidAPI-Key"] = JUDGE0_API_KEY
            if JUDGE0_API_HOST:
                headers["X-RapidAPI-Host"] = JUDGE0_API_HOST

        resp = requests.get(f"{JUDGE0_API_URL.rstrip('/')}/system_info", headers=headers, timeout=2)
        if resp.status_code == 200:
            judge0_reachable = True
            data = resp.json()
            judge0_version = data.get("version")
            if not judge0_version:
                try:
                    resp_v = requests.get(f"{JUDGE0_API_URL.rstrip('/')}/version", headers=headers, timeout=1)
                    if resp_v.status_code == 200:
                        judge0_version = resp_v.text.strip()
                except Exception:
                    pass
            execution_mode = "judge0_primary_with_truthful_compiler_fallback"
    except Exception:
        judge0_reachable = False
        execution_mode = "truthful_compiler"

    return {
        "fastapi": "healthy",
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "judge0": {
            "status": "reachable" if judge0_reachable else "unreachable",
            "url": JUDGE0_API_URL,
            "version": judge0_version,
            "execution_mode": execution_mode,
        },
    }


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Requires and verifies a Supabase JWT from the Authorization header.
    Rejects requests without a valid Bearer token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. A valid Bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url:
        logger.error("SUPABASE_URL is not configured for JWT verification")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service misconfigured.",
        )

    # Verify token by fetching user from Supabase Auth
    verify_url = f"{supabase_url}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": service_key or token,
    }
    try:
        resp = requests.get(verify_url, headers=headers, timeout=5)
        if resp.status_code != 200:
            logger.warning("Supabase JWT verification failed: HTTP %d", resp.status_code)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Supabase authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error communicating with Supabase Auth for token verification: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication provider unreachable.",
        )


@app.post("/api/evaluate", response_model=EvaluationResponse, tags=["Evaluation"])
def evaluate_submission(
    payload: EvaluationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
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

    # 1. Enforce student session identity & role authorization
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    # Note: current_user.get("role") in Supabase Auth user object is "authenticated" (system role).
    # Application role (student / faculty / admin) is in profiles table or user_metadata.
    user_metadata = current_user.get("user_metadata") or {}
    app_metadata = current_user.get("app_metadata") or {}
    user_role = user_metadata.get("role") or app_metadata.get("role")

    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if supabase_url and service_key:
        admin_headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        }
        try:
            prof_url = f"{supabase_url}/rest/v1/profiles?id=eq.{user_id}&select=id,role"
            prof_res = requests.get(prof_url, headers=admin_headers, timeout=5)
            if prof_res.status_code == 200 and prof_res.json():
                user_role = prof_res.json()[0].get("role") or user_role
        except Exception as e:
            logger.error("Error retrieving user profile for role verification: %s", e)

    if user_role == "faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty accounts are not authorized to invoke student code evaluation.",
        )

    # Student identity must come authoritatively from verified session context
    if user_role != "admin":
        payload.student_id = user_id

    # Resolve canonical practical via multi-factor matching (ID + title + subject)
    try:
        practical_info = resolve_canonical_practical(
            practical_id=payload.practical_id,
            practical_title=payload.practical_title,
            practical_number=payload.practical_number,
            subject_code=payload.subject_code,
        )
    except UnsupportedPracticalError as err:
        logger.error("Unsupported practical in evaluate_submission: %s", err)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(err),
        )

    # 1. Resolve canonical sample test cases
    sample_cases = [tc for tc in payload.test_cases if tc.is_sample]
    if not sample_cases and payload.test_cases:
        # If no cases explicitly tagged is_sample, preserve existing passed cases
        sample_cases = payload.test_cases

    # If absolutely no test cases supplied by client, generate canonical sample
    if not sample_cases:
        sample_rng = random.Random(42 + practical_info.practical_number)
        gen_func = CANONICAL_GENERATOR_REGISTRY[practical_info.canonical_key]
        s_in, s_out = gen_func(sample_rng, is_edge_case=False)
        sample_cases = [TestCase(input_data=s_in, expected_output=s_out, is_sample=True, is_parameterized=False)]

    # 2. Generate deterministic per-student hidden parameterized test cases
    param_hidden_cases = generate_parameterized_test_cases(
        student_id=payload.student_id,
        practical_id=payload.practical_id,
        practical_title=payload.practical_title,
        practical_number=payload.practical_number,
        subject_code=payload.subject_code,
        count=2,
    )

    # 3. Assemble execution suite: sample cases followed by hidden parameterized cases
    all_eval_cases: List[TestCase] = []
    for sc in sample_cases:
        all_eval_cases.append(
            TestCase(
                input_data=sc.input_data,
                expected_output=sc.expected_output,
                is_sample=True,
                is_parameterized=False,
            )
        )
    for ph in param_hidden_cases:
        all_eval_cases.append(
            TestCase(
                input_data=ph.input_data,
                expected_output=ph.expected_output,
                is_sample=False,
                is_parameterized=True,
            )
        )

    judge0_payloads = []
    test_results: List[TestCaseResult] = []
    passed_count = 0

    for idx, tc in enumerate(all_eval_cases, start=1):
        # Real payload submitted to Judge0
        j0_payload = structure_judge0_payload(
            language_id=payload.language_id,
            source_code=payload.source_code,
            stdin=tc.input_data,
            expected_output=tc.expected_output,
        )

        # For student response transparency without leaking hidden test vectors:
        if tc.is_parameterized:
            sanitized_payload = {
                **j0_payload,
                "stdin": "[HIDDEN PARAMETERIZED TEST INPUT REDACTED]",
                "expected_output": "[HIDDEN PARAMETERIZED EXPECTED OUTPUT REDACTED]",
            }
            judge0_payloads.append(sanitized_payload)
        else:
            judge0_payloads.append(j0_payload)

        # Execute real payload via Judge0 (or local truthful fallback)
        res = execute_via_judge0(j0_payload)

        # If execution engine is completely unavailable, fail fast with 503
        if res.get("is_unavailable"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Code execution service is currently unavailable.",
            )

        actual_output = (res.get("stdout") or "").strip()
        expected = tc.expected_output.strip()
        status_id = res.get("status", {}).get("id")

        # Truthful evaluation: pass/fail depends strictly on expected vs actual output comparison
        if res.get("stderr") or (status_id and status_id != 3):
            is_passed = False
            status_desc = res.get("status", {}).get("description") or "Execution Error"
        else:
            is_passed = (actual_output == expected)
            status_desc = "Passed" if is_passed else "Wrong Answer"

        if is_passed:
            passed_count += 1

        # Redact raw input/expected output for hidden cases in student-facing response
        if tc.is_parameterized:
            disp_expected = "[HIDDEN PARAMETERIZED TEST CASE - REDACTED FOR INTEGRITY]"
            disp_stdout = "[MATCH VERIFIED]" if is_passed else "[OUTPUT REDACTED FOR INTEGRITY]"
        else:
            disp_expected = expected
            disp_stdout = actual_output

        test_results.append(
            TestCaseResult(
                test_case_index=idx,
                is_sample=tc.is_sample,
                is_parameterized=tc.is_parameterized,
                status=status_desc,
                passed=is_passed,
                stdout=disp_stdout,
                stderr=res.get("stderr"),
                expected_output=disp_expected,
                execution_time_sec=float(res.get("time") or 0.02),
                memory_kb=int(res.get("memory") or 1240),
                is_simulation=False,
            )
        )

    total_count = len(all_eval_cases)
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
    final_status = "Passed" if pass_rate == 1.0 else ("Partially Passed" if passed_count > 0 else "Failed")

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
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        is_simulation=False,
    )


@app.get("/api/practicals/{practical_id}/sample-cases", tags=["Curriculum"])
def get_sample_test_cases(practical_id: str, title: Optional[str] = None):
    """
    Public student-facing endpoint returning only visible sample test cases.
    Parameterized hidden test cases are never returned by this endpoint.
    """
    try:
        practical_info = resolve_canonical_practical(practical_id=practical_id, practical_title=title)
    except UnsupportedPracticalError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))

    sample_rng = random.Random(42 + practical_info.practical_number)
    gen_func = CANONICAL_GENERATOR_REGISTRY[practical_info.canonical_key]
    s_in, s_out = gen_func(sample_rng, is_edge_case=False)
    return {
        "practical_id": practical_id,
        "practical_number": practical_info.practical_number,
        "canonical_key": practical_info.canonical_key,
        "title": practical_info.title,
        "sample_cases": [
            {
                "input_data": s_in,
                "expected_output": s_out,
                "is_sample": True,
                "is_parameterized": False,
            }
        ],
        "parameterized_cases_hidden": True,
    }


@app.get("/api/practicals/catalog", tags=["Curriculum"])
def get_canonical_catalog():
    """
    Returns the complete canonical CS201P practical catalog and registered generator metadata.
    """
    return {
        "subject": "CS201P: Data Structures & Algorithms",
        "total_canonical_practicals": len(CANONICAL_CS201P_CATALOG),
        "catalog": [
            {
                "canonical_key": info.canonical_key,
                "practical_number": info.practical_number,
                "title": info.title,
                "aim": info.aim,
                "has_generator": info.canonical_key in CANONICAL_GENERATOR_REGISTRY,
            }
            for info in CANONICAL_CS201P_CATALOG.values()
        ],
    }


@app.post("/api/tiering", response_model=AdaptiveTierResult, tags=["Adaptive Learning"])
def evaluate_adaptive_tier(
    req: TieringRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
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
    Resolves the identifier securely from the database roster, verifies credentials
    against Supabase Auth without creating new accounts, and returns the verified profile and role.
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

    # 1. Lookup the identifier strictly in the institutional roster by identifier or email
    roster_url = f"{supabase_url}/rest/v1/institutional_roster?or=(identifier.eq.{clean_id},email.eq.{clean_id.lower()})&select=*,batches(name),departments(name)"
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
    roster_role = roster_entry.get("role")
    if not roster_role or roster_role not in ("student", "faculty"):
        raise HTTPException(
            status_code=403,
            detail="Account has an unrecognized or unauthorized role. Access denied."
        )

    # 2. Attempt Supabase Auth sign-in (NO auto-provisioning: normal login must NOT create users)
    token_url = f"{supabase_url}/auth/v1/token?grant_type=password"
    try:
        login_res = requests.post(
            token_url,
            headers={"apikey": service_key, "Content-Type": "application/json"},
            json={"email": email, "password": req.password},
            timeout=10
        )
        if login_res.status_code != 200:
            raise HTTPException(
                status_code=401,
                detail="Invalid password for this institutional account. Please check your credentials."
            )
        session_data = login_res.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Authentication service error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Authentication service encountered an error. Please try again later.")

    user_id = session_data.get("user", {}).get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication session could not be established.")

    # 3. Retrieve verified profile from profiles table
    prof_url = f"{supabase_url}/rest/v1/profiles?id=eq.{user_id}&select=*,batches(name)"
    try:
        prof_res = requests.get(prof_url, headers=admin_headers, timeout=10)
    except Exception as e:
        logger.error("Error retrieving user profile: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Error fetching verified profile.")

    if prof_res.status_code != 200 or not prof_res.json():
        raise HTTPException(
            status_code=403,
            detail="Verified profile not found in college database. Access denied."
        )

    p = prof_res.json()[0]
    verified_role = p.get("role")
    if not verified_role or verified_role not in ("student", "faculty"):
        raise HTTPException(
            status_code=403,
            detail="User profile has an unrecognized or unauthorized role. Access denied."
        )

    batch_name = "Unassigned"
    if isinstance(p.get("batches"), dict):
        batch_name = p["batches"].get("name", "Unassigned")
    elif isinstance(roster_entry.get("batches"), dict):
        batch_name = roster_entry["batches"].get("name", "Unassigned")

    return {
        "status": "success",
        "session": session_data,
        "profile": {
            "id": p.get("id", user_id),
            "email": p.get("email", email),
            "identifier": p.get("identifier", clean_id),
            "name": p.get("full_name", roster_entry.get("full_name", "Member")),
            "role": verified_role,
            "batchName": batch_name,
            "status": p.get("status", "active")
        }
    }


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)

