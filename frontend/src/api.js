// All backend calls live here.
// Locally, vite proxies /api to localhost:4000.
// On Vercel, set VITE_API_URL=https://your-render-service.onrender.com

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';
const TOKEN_KEY = 'sentryscan_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore storage errors
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

async function handleJson(res, fallbackError) {
  const text = await res.text().catch(() => '');
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(
      data.error ||
        `${fallbackError} (HTTP ${res.status}${!API_ORIGIN && window.location.hostname !== 'localhost' ? ' — VITE_API_URL is not configured' : ''})`
    );
  }
  return data;
}

/* -------------------- Auth -------------------- */

export async function signup({ name, email, password, organization }) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, organization }),
  });
  return handleJson(res, 'Failed to create account');
}

export async function login({ email, password }) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleJson(res, 'Failed to sign in');
}

export async function getMe() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${BASE}/auth/me`, {
    headers: authHeaders(),
  });
  if (res.status === 401) {
    clearToken();
    return null;
  }
  return handleJson(res, 'Failed to load profile');
}

export async function updateProfile(payload) {
  const res = await fetch(`${BASE}/auth/profile`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to update profile');
}

/* -------------------- Scans -------------------- */

export async function startScan(url, options = {}) {
  const res = await fetch(`${BASE}/scan`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ url, ...options }),
  });
  return handleJson(res, 'Failed to start scan');
}

export async function getScan(id) {
  const res = await fetch(`${BASE}/scan/${id}`, {
    headers: authHeaders(),
  });
  return handleJson(res, 'Failed to fetch scan');
}

export async function getHistory(scope = 'mine') {
  const res = await fetch(`${BASE}/scans?scope=${encodeURIComponent(scope)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function deleteScan(id) {
  const res = await fetch(`${BASE}/scan/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleJson(res, 'Failed to delete scan');
}
