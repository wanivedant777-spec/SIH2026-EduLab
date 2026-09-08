"""
Unit and Integration Tests for FastAPI Evaluation Backend Service
Covers:
- System Root (GET /)
- System Health & Judge0 reachability probing (GET /health)
- Rule-based Adaptive Tiering Logic
- Judge0 Payload Formatting
- Local Subprocess Execution Fallback
"""

import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

# Ensure server module can be imported
sys.path.insert(0, str(Path(__file__).parent))

from main import (
    app,
    structure_judge0_payload,
    calculate_adaptive_tier,
    execute_locally,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_root_endpoint(client):
    """Test that GET / returns correct microservice metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Practical Lab Management Evaluation Engine" in data["service"]
    assert data["hackathon"] == "Smart India Hackathon 2026"
    assert data["problem_statement"] == "SIH26207"
    assert data["docs_url"] == "/docs"


def test_health_endpoint_judge0_reachable(client):
    """Test /health when Judge0 CE /system_info responds successfully."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "version": "1.13.0",
        "system": "Linux 6.6.0-dummy",
    }

    with patch("requests.get", return_value=mock_resp):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["judge0"]["status"] == "reachable"
        assert data["judge0"]["version"] == "1.13.0"
        assert data["judge0"]["execution_mode"] == "judge0_sandbox"


def test_health_endpoint_judge0_unreachable(client):
    """Test /health when Judge0 cannot be contacted (falls back gracefully)."""
    with patch("requests.get", side_effect=Exception("Connection refused")):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["judge0"]["status"] == "unreachable"
        assert data["judge0"]["version"] is None
        assert data["judge0"]["execution_mode"] == "local_fallback"


def test_structure_judge0_payload():
    """Verify Judge0 payload adheres to CE API specifications."""
    payload = structure_judge0_payload(
        language_id=71,
        source_code="print('Hello World')",
        stdin="test input\n",
        expected_output="Hello World\n",
        cpu_time_limit=3.0,
        memory_limit=256000,
    )
    assert payload["language_id"] == 71
    assert payload["source_code"] == "print('Hello World')"
    assert payload["stdin"] == "test input"
    assert payload["expected_output"] == "Hello World"
    assert payload["cpu_time_limit"] == 3.0
    assert payload["memory_limit"] == 256000


def test_calculate_adaptive_tier_advanced():
    """Verify students with 100% pass rate in <=2 attempts are assigned Advanced."""
    tier = calculate_adaptive_tier(attempt_count=1, time_spent_seconds=600, pass_rate=1.0)
    assert tier.assigned_tier == "Advanced"
    assert tier.recommended_difficulty == "Hard"
    assert tier.metrics["pass_percentage"] == 100.0


def test_calculate_adaptive_tier_proficient():
    """Verify students with >=70% pass rate are assigned Proficient."""
    tier = calculate_adaptive_tier(attempt_count=3, time_spent_seconds=1800, pass_rate=0.75)
    assert tier.assigned_tier == "Proficient"
    assert tier.recommended_difficulty == "Medium"


def test_calculate_adaptive_tier_beginner():
    """Verify students with low pass rate are assigned Beginner."""
    tier = calculate_adaptive_tier(attempt_count=4, time_spent_seconds=2400, pass_rate=0.4)
    assert tier.assigned_tier == "Beginner"
    assert tier.recommended_difficulty == "Easy"


def test_execute_locally_python_success():
    """Test local fallback runner for Python execution."""
    code = "import sys\nline = sys.stdin.read().strip()\nprint(f'Echo: {line}')"
    res = execute_locally(
        language_id=71,
        source_code=code,
        stdin="Antigravity",
    )
    assert res["status"]["id"] == 3  # Accepted
    assert res["status"]["description"] == "Accepted"
    assert "Echo: Antigravity" in res["stdout"]


def test_execute_locally_python_runtime_error():
    """Test local fallback runner detects syntax/runtime errors."""
    code = "raise ValueError('Custom failure')"
    res = execute_locally(
        language_id=71,
        source_code=code,
        stdin="",
    )
    assert res["status"]["id"] == 6  # Runtime Error
    assert res["status"]["description"] == "Runtime Error"
    assert "ValueError: Custom failure" in res["stderr"]
