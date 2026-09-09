/* EduLab Nova - FastAPI Evaluation Microservice Client */
import { supabase } from '../supabaseClient';

const API_BASE_URL = import.meta.env.VITE_EVALUATION_API_URL || 'http://localhost:8000';

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn('Could not extract session token for evaluator API:', err);
  }
  return headers;
}

export async function evaluateSubmission(payload) {
  const headers = await getAuthHeaders();
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    console.error('FastAPI evaluation microservice connection failure:', netErr);
    throw new Error('Code execution service is currently unavailable. Ensure backend service is reachable.');
  }

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || '';
    } catch {
      // Ignore json parse error
    }

    if (res.status === 503) {
      throw new Error(errorDetail || 'Code execution service is currently unavailable.');
    } else if (res.status === 401) {
      throw new Error(errorDetail || 'Authentication required to evaluate code submission.');
    } else if (res.status === 403) {
      throw new Error(errorDetail || 'Permission denied for code evaluation.');
    } else {
      throw new Error(errorDetail || `Evaluation service responded with status ${res.status}`);
    }
  }

  return await res.json();
}

export async function calculateTier(metrics) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/tiering`, {
      method: 'POST',
      headers,
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
