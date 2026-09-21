const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('aurex_token');
}

export async function api<T = any>(path: string, opts: RequestInit & { json?: any } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Accept': 'application/json', ...(opts.headers as Record<string,string> || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let body = opts.body;
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }
  const res = await fetch(BASE + path, { ...opts, headers, body });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { success: false, error: { message: text } }; }
  if (!res.ok || data.success === false) {
    const err = new Error(data?.error?.message || 'Something went wrong. Please try again.');
    (err as any).code = data?.error?.code;
    (err as any).status = res.status;
    throw err;
  }
  return data.data as T;
}

export default api;
