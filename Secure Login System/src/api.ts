import { User, SessionInfo, AuditLog, SecurityStats, SqlSimulationResult, DemoAccount } from './types';

const TOKEN_KEY = 'aegis_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // send cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as Error & { status: number; data: any };
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  async register(payload: { email: string; username: string; password: string }) {
    const res = await request<{
      message: string;
      token: string;
      user: User;
      session: SessionInfo;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(payload: { emailOrUsername: string; password: string }) {
    const res = await request<{
      requires2FA: boolean;
      token?: string;
      user?: User;
      session?: SessionInfo;
      challengeToken?: string;
      email?: string;
      maskedEmail?: string;
      message?: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.requires2FA && res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async verify2FA(payload: { challengeToken: string; code: string; isBackupCode?: boolean }) {
    const res = await request<{
      token: string;
      user: User;
      session: SessionInfo;
    }>('/api/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe() {
    return request<{ user: User; session: SessionInfo }>('/api/auth/me');
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async logoutAll() {
    try {
      return await request<{ message: string }>('/api/auth/logout-all', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async getSessions() {
    return request<{ sessions: SessionInfo[] }>('/api/auth/sessions');
  },

  async revokeSession(sessionId: string) {
    return request<{ message: string }>('/api/auth/sessions/revoke', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  async setup2FA() {
    return request<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }>('/api/auth/2fa/setup', {
      method: 'POST',
    });
  },

  async enable2FA(payload: { secret: string; code: string }) {
    return request<{ message: string; backupCodes: string[] }>('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async disable2FA(password: string) {
    return request<{ message: string }>('/api/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAuditLogs() {
    return request<{ logs: AuditLog[] }>('/api/audit-logs');
  },

  async getSecurityStats() {
    return request<SecurityStats>('/api/security/stats');
  },

  async testSqlInjection(input: string, mode: 'vulnerable' | 'parameterized') {
    return request<SqlSimulationResult>('/api/security/test-sql-injection', {
      method: 'POST',
      body: JSON.stringify({ input, mode }),
    });
  },

  async getDemoAccounts() {
    return request<{ accounts: DemoAccount[] }>('/api/demo-accounts');
  },

  async pushToGitHub(payload: {
    repoUrl: string;
    personalAccessToken: string;
    targetFolder?: string;
    branch?: string;
    commitMessage?: string;
  }) {
    return request<{ success: boolean; message: string }>('/api/github/push', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
