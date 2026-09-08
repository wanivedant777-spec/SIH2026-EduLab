import { supabase } from '../supabaseClient';

const API_BASE_URL = import.meta.env.VITE_EVALUATION_API_URL || 'http://localhost:8000';

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');
  headers.Authorization = 'Bearer ' + session.access_token;
  return headers;
}

export async function evaluateSubmission(payload) {
  const headers = await getAuthHeaders();
  const response = await fetch(API_BASE_URL + '/api/evaluate', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Evaluation service is unavailable.');
  }
  return data;
}

export async function calculateTier(metrics) {
  const headers = await getAuthHeaders();
  const response = await fetch(API_BASE_URL + '/api/tiering', {
    method: 'POST',
    headers,
    body: JSON.stringify(metrics),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Tiering service is unavailable.');
  return data;
}
