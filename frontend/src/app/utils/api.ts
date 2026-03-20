const APP_ORIGIN = (import.meta.env.VITE_PUBLIC_URL as string) || window.location.origin;

const API_URL = (import.meta.env.VITE_API_URL as string) ||
  (() => {
    const host = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const apiHost = host === 'localhost' || host === '127.0.0.1' ? 'localhost' : host;
    return `${protocol}//${apiHost}:4000/api`;
  })();

export const getAppOrigin = () => APP_ORIGIN;

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try parse json error, otherwise fallback
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  // If response is JSON return parsed JSON
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  // Otherwise return raw response (blob/stream)
  return response;
}

async function download(endpoint: string, suggestedFilename?: string) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${endpoint}`, { method: 'GET', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Download failed' }));
    throw new Error(err.error || 'Download failed');
  }

  // If server redirected to an external URL, just navigate there
  if (res.redirected) {
    window.location.href = res.url;
    return;
  }

  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') || '';
  let filename = suggestedFilename || 'download';
  const match = /filename\*?=([^;]+)/i.exec(cd);
  if (match) filename = match[1].replace(/utf-8''/, '').replace(/"/g, '');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function upload(endpoint: string, file: File, body: Record<string, string> = {}) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(body).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Don't set Content-Type, browser will set it with boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || error.message || 'Upload failed');
  }

  return response.json();
}

export const api = {
  get: (endpoint: string, options: RequestInit = {}) =>
    request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body: any, options: RequestInit = {}) =>
    request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any, options: RequestInit = {}) =>
    request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string, options: RequestInit = {}) =>
    request(endpoint, { ...options, method: 'DELETE' }),
  patch: (endpoint: string, body: any = {}, options: RequestInit = {}) =>
    request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  download,
  upload,
  API_URL,
};
