// Small fetch wrapper shared by dashboard.js and admin.js
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('kudos_token');
}

function getStoredUser() {
  const raw = localStorage.getItem('kudos_user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem('kudos_token', token);
  localStorage.setItem('kudos_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('kudos_token');
  localStorage.removeItem('kudos_user');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {},
    token ? { Authorization: `Bearer ${token}` } : {}
  );

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}

function requireLoginOrRedirect() {
  if (!getToken()) {
    window.location.href = 'index.html';
    return null;
  }
  return getStoredUser();
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}
