/**
 * Frontend API client — centralized fetch with logging + error extraction.
 *
 * All API calls go through this client for:
 *  • Base URL management
 *  • Console logging (request + response)
 *  • Structured error extraction
 *  • Timeout handling
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Make an API request with logging and structured error extraction.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : undefined;

  console.log(`📤 ${method} ${endpoint}`, options.body || '');

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body,
      signal: options.signal,
    });

    const data = await res.json();
    console.log(`📥 ${res.status} ${endpoint}`, data);

    if (!res.ok) {
      const errorMsg =
        data?.error?.message ||
        data?.detail ||
        `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.serverError = data?.error || null;
      throw err;
    }

    // Check structured envelope
    if (data.success === false) {
      const err = new Error(data.error?.message || 'Server returned an error');
      err.status = res.status;
      err.serverError = data.error;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    // Network error (backend down, CORS, etc.)
    console.error(`❌ ${method} ${endpoint}`, err);
    const networkErr = new Error(
      `Cannot reach backend at ${API_URL}. Is the server running?`
    );
    networkErr.status = 0;
    networkErr.isNetworkError = true;
    throw networkErr;
  }
}

/**
 * Check backend health.
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { connected: false };
    const data = await res.json();
    console.log('🏥 Backend health:', data);
    return { connected: true, ...data };
  } catch {
    return { connected: false };
  }
}

export { API_URL };
