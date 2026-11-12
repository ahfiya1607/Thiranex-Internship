export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user' | 'auditor';
  two_factor_enabled: boolean;
  created_at: string;
}

export interface SessionInfo {
  id: string;
  deviceName: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  lastActive?: string;
  expiresAt: string;
  isCurrent?: boolean;
  isRevoked?: boolean;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  email: string | null;
  event_type: string;
  ip_address: string;
  user_agent: string;
  threat_level: 'INFO' | 'WARNING' | 'CRITICAL';
  details: string;
  timestamp: string;
}

export interface SecurityStats {
  bcryptSaltRounds: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionExpiryHours: number;
  registeredUsersCount: number;
  usersWith2FA: number;
  defenseFeatures: Array<{
    name: string;
    status: string;
    description: string;
  }>;
}

export interface SqlSimulationResult {
  mode: 'vulnerable' | 'parameterized';
  rawQueryExecuted?: string;
  preparedTemplate?: string;
  boundParameters?: string[];
  inputPassed: string;
  hasSqliSignature: boolean;
  vulnerabilityStatus: 'EXPLOITED' | 'ATTACK_NEUTRALIZED' | 'ATTACK_DETECTED' | 'SAFE';
  explanation: string;
  resultsCount: number;
  results: Array<{
    id: string;
    email: string;
    username: string;
    role: string;
    two_factor_enabled?: boolean;
  }>;
}

export interface DemoAccount {
  email: string;
  username: string;
  password: string;
  role: string;
  has2FA: boolean;
  currentTotp?: string;
  note: string;
}
