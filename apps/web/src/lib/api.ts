// Thin fetch wrapper. Always sends the session cookie and surfaces API errors
// in a consistent shape.

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: { fields?: Array<{ path: string; message: string }>; problems?: string[] };
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: ApiErrorShape['details'];
  constructor(status: number, body: ApiErrorShape) {
    super(body?.message || 'Request failed');
    this.status = status;
    this.code = body?.code || 'error';
    this.details = body?.details;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method, credentials: 'include', headers: {} };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? { code: 'error', message: res.statusText });
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
};
