// Thin client for the FORK. backend.
// Set VITE_API_URL in a .env file to point at a deployed backend;
// defaults to the local FastAPI dev server.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'fork-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.detail) detail = data.detail;
    } catch (e) {}
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  join: (name, college, github) =>
    request('/join', { method: 'POST', body: { name, college, github: github || null } }),

  me: () => request('/me', { auth: true }),

  users: () => request('/users'),

  posts: () => request('/posts'),

  createPost: (type, content) =>
    request('/posts', { method: 'POST', auth: true, body: { type, content } }),

  reactToPost: (postId) =>
    request(`/posts/${postId}/react`, { method: 'POST', auth: true }),

  refreshGithub: () => request('/me/github/refresh', { method: 'POST', auth: true }),

  leave: () => request('/me', { method: 'DELETE', auth: true }),
};
