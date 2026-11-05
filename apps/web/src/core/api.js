import { store } from './store.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function apiRequest(endpoint, options = {}) {
  const user = store.getState('currentUser');
  const workspace = store.getState('workspace');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (user?.id) {
    headers['x-demo-user-id'] = user.id;
    headers['Authorization'] = `Bearer ${user.id}`;
  }

  if (workspace?.id) {
    headers['x-workspace-id'] = workspace.id;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network request failed' }));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }

  // Handle CSV/text responses
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    return response.text();
  }

  return response.json();
}
