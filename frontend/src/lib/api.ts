// API & WebSocket Environment Configuration for Local and Cloud (Vercel & Render) Deployments

export const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || '';

export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (BACKEND_URL) {
    const base = BACKEND_URL.replace(/\/+$/, '');
    return `${base}${cleanEndpoint}`;
  }
  return cleanEndpoint;
};

export const getWsUrl = (): string => {
  const envWs = (import.meta as any).env?.VITE_WS_URL;
  if (envWs) return envWs;

  if (BACKEND_URL) {
    const wsProto = BACKEND_URL.startsWith('https') ? 'wss:' : 'ws:';
    const host = BACKEND_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `${wsProto}//${host}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};
