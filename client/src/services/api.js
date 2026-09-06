/* EduLab Nova - FastAPI Evaluation Microservice Client */

const API_BASE_URL = import.meta.env.VITE_EVALUATION_API_URL || 'http://localhost:8000';

export async function evaluateSubmission(payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Evaluation service responded with HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('FastAPI evaluation microservice connection note:', err.message);
    // Explicit simulation fallback when backend daemon is unreachable
    const testCases = payload.test_cases || [];
    const totalCount = testCases.length || 3;

    const testCaseResults = testCases.map((tc, idx) => ({
      test_case_index: idx + 1,
      is_sample: tc.is_sample || false,
      status: 'Offline - Backend Unreachable',
      passed: false,
      stdout: '',
      stderr: `Could not connect to evaluator microservice at ${API_BASE_URL}. Ensure FastAPI is running on port 8000.`,
      expected_output: tc.expected_output,
      execution_time_sec: 0.0,
      memory_kb: 0,
    }));

    return {
      submission_id: `sub_sim_${Date.now().toString(36)}`,
      student_id: payload.student_id,
      practical_id: payload.practical_id,
      language_id: payload.language_id,
      status: 'DEMO_OFFLINE_SIMULATION',
      is_simulation: true,
      total_test_cases: totalCount,
      passed_test_cases: 0,
      pass_percentage: 0.0,
      coding_marks_awarded: 0.0,
      total_possible_marks: 3.0,
      test_case_results: testCaseResults,
      judge0_payloads: [],
      adaptive_tiering: {
        assigned_tier: 'Pending Evaluation',
        recommended_difficulty: 'Standard',
        reasoning: 'Backend evaluator offline. Code execution could not be verified by compiler daemon.',
        metrics: {
          attempt_count: payload.attempt_count || 1,
          time_spent_seconds: payload.time_spent_seconds || 0,
          pass_rate: 0.0,
        },
      },
      evaluated_at: new Date().toISOString(),
    };
  }
}

export async function calculateTier(metrics) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tiering`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    });

    if (!res.ok) {
      throw new Error(`Tiering service responded with HTTP ${res.status}`);
    }

    return await res.json();
  } catch {
    return {
      assigned_tier: metrics.pass_rate >= 0.85 ? 'Advanced' : metrics.pass_rate >= 0.6 ? 'Proficient' : 'Beginner',
      recommended_difficulty: metrics.pass_rate >= 0.85 ? 'Hard' : metrics.pass_rate >= 0.6 ? 'Medium' : 'Easy',
      reasoning: 'Calculated using local rule-based heuristic tiering.',
      metrics,
    };
  }
}
