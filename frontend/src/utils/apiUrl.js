// Utility to dynamically determine the correct Backend API and WebSocket URL
// Works seamlessly in local dev, Vercel backup, and production (https://medsign.id)

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('medsign_api_url')?.trim();
    if (custom) {
      if (!custom.includes('localhost') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return custom.replace(/\/$/, '');
      }
      // If custom had stale localhost in production, clean it up
      localStorage.removeItem('medsign_api_url');
    }

    const env = import.meta.env.VITE_API_BASE_URL?.trim();
    if (env && !env.includes('localhost:8000')) {
      return env.replace(/\/$/, '');
    }

    // When running in a production browser (domain or IP), default to current origin
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.origin;
    }
  }

  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
};

export const getStreamingUrl = () => {
  const base = getApiBaseUrl();
  if (base.startsWith('ws://') || base.startsWith('wss://')) {
    return `${base.replace(/\/$/, '')}/api/v1/stream`;
  }
  try {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/api/v1/stream';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    if (typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}/api/v1/stream`;
    }
    return null;
  }
};
