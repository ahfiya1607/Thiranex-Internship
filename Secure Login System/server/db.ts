/**
 * Secure Database Layer
 * Implements strict parameterized queries, preventing SQL injection vulnerabilities.
 * Also includes an isolated demonstrative sandbox for the Security Testing Lab.
 */
import crypto from 'crypto';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'user' | 'auditor';
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  failed_login_attempts: number;
  locked_until: number | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token: string;
  ip_address: string;
  user_agent: string;
  device_name: string;
  created_at: string;
  last_active: string;
  expires_at: string;
  is_revoked: boolean;
}

export interface AuditLogRecord {
  id: string;
  user_id: string | null;
  email: string | null;
  event_type: 'REGISTER' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'LOGOUT_ALL' | '2FA_ENABLED' | '2FA_DISABLED' | '2FA_VERIFIED' | 'PASSWORD_CHANGED' | 'SESSION_REVOKED' | 'RATE_LIMITED' | 'SQL_INJECTION_BLOCKED' | 'SQL_INJECTION_SIMULATED_ATTACK';
  ip_address: string;
  user_agent: string;
  threat_level: 'INFO' | 'WARNING' | 'CRITICAL';
  details: string;
  timestamp: string;
}

export interface BackupCodeRecord {
  id: string;
  user_id: string;
  code_hash: string;
  used: boolean;
  created_at: string;
}

class SecureDatabase {
  private users: Map<string, UserRecord> = new Map();
  private sessions: Map<string, SessionRecord> = new Map();
  private auditLogs: AuditLogRecord[] = [];
  private backupCodes: BackupCodeRecord[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed Demo Users with bcrypt hashes (will be verified with real bcryptjs)
    // Alice: Password is "Aegis!Pass2026"
    // Hash generated with bcryptjs 12 rounds: $2a$12$N3aM43PqmI2uV1O2f1sI0.eRz32uJ7359Y5G.9aW6H8uG7M.6/8O.
    // We'll set these up on initialization in server.ts or insert directly
  }

  // Parameterized Query Engine
  public queryUsersByEmail(email: string): UserRecord | null {
    // Strict parameterization: No string concatenation!
    const sanitizedEmail = String(email).trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === sanitizedEmail) {
        return { ...user };
      }
    }
    return null;
  }

  public queryUserById(id: string): UserRecord | null {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  public queryUserByUsername(username: string): UserRecord | null {
    const sanitized = String(username).trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === sanitized) {
        return { ...user };
      }
    }
    return null;
  }

  public insertUser(user: Omit<UserRecord, 'id' | 'created_at' | 'updated_at'>): UserRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newRecord: UserRecord = {
      ...user,
      id,
      created_at: now,
      updated_at: now,
    };
    this.users.set(id, newRecord);
    return { ...newRecord };
  }

  public updateUser(id: string, updates: Partial<UserRecord>): UserRecord | null {
    const user = this.users.get(id);
    if (!user) return null;
    const updated: UserRecord = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return { ...updated };
  }

  // Session Management
  public insertSession(session: Omit<SessionRecord, 'id'>): SessionRecord {
    const id = crypto.randomUUID();
    const record: SessionRecord = {
      ...session,
      id,
    };
    this.sessions.set(record.token, record);
    return { ...record };
  }

  public getSession(token: string): SessionRecord | null {
    const session = this.sessions.get(token);
    if (!session || session.is_revoked) return null;

    // Check expiry
    if (new Date(session.expires_at).getTime() < Date.now()) {
      session.is_revoked = true;
      return null;
    }

    return { ...session };
  }

  public touchSession(token: string): void {
    const session = this.sessions.get(token);
    if (session && !session.is_revoked) {
      session.last_active = new Date().toISOString();
      // Slide expiry by 24 hours
      session.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
  }

  public revokeSession(token: string): boolean {
    const session = this.sessions.get(token);
    if (session) {
      session.is_revoked = true;
      return true;
    }
    return false;
  }

  public revokeAllUserSessions(userId: string, exceptToken?: string): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.user_id === userId && session.token !== exceptToken && !session.is_revoked) {
        session.is_revoked = true;
        count++;
      }
    }
    return count;
  }

  public getUserSessions(userId: string): SessionRecord[] {
    const list: SessionRecord[] = [];
    const now = Date.now();
    for (const session of this.sessions.values()) {
      if (session.user_id === userId) {
        // filter expired
        const isExpired = new Date(session.expires_at).getTime() < now;
        list.push({
          ...session,
          is_revoked: session.is_revoked || isExpired,
        });
      }
    }
    return list.sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime());
  }

  // 2FA Backup Codes
  public setBackupCodes(userId: string, codeHashes: string[]): void {
    // Remove existing
    this.backupCodes = this.backupCodes.filter((bc) => bc.user_id !== userId);
    const now = new Date().toISOString();
    for (const hash of codeHashes) {
      this.backupCodes.push({
        id: crypto.randomUUID(),
        user_id: userId,
        code_hash: hash,
        used: false,
        created_at: now,
      });
    }
  }

  public getUnusedBackupCodes(userId: string): BackupCodeRecord[] {
    return this.backupCodes.filter((bc) => bc.user_id === userId && !bc.used);
  }

  public markBackupCodeUsed(userId: string, codeHash: string): boolean {
    const code = this.backupCodes.find((bc) => bc.user_id === userId && bc.code_hash === codeHash && !bc.used);
    if (code) {
      code.used = true;
      return true;
    }
    return false;
  }

  // Audit Logs
  public addAuditLog(log: Omit<AuditLogRecord, 'id' | 'timestamp'>): AuditLogRecord {
    const record: AuditLogRecord = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(record); // newest first
    if (this.auditLogs.length > 250) {
      this.auditLogs.pop();
    }
    return record;
  }

  public getAuditLogs(userId?: string, limit: number = 50): AuditLogRecord[] {
    if (userId) {
      return this.auditLogs.filter((log) => log.user_id === userId).slice(0, limit);
    }
    return this.auditLogs.slice(0, limit);
  }

  public getAllUsersSafe(): Array<Omit<UserRecord, 'password_hash' | 'two_factor_secret'>> {
    return Array.from(this.users.values()).map(({ password_hash, two_factor_secret, ...safe }) => safe);
  }

  /**
   * Educational SQL Injection Simulation Engine
   * Shows side-by-side comparison between:
   * 1. Vulnerable Query (string concatenation: `SELECT * FROM users WHERE email = '${input}'`)
   * 2. Parameterized Query (safe binding: `SELECT * FROM users WHERE email = ?`, [input])
   */
  public simulateSqlQuery(input: string, mode: 'vulnerable' | 'parameterized') {
    const rawSqlConstructed = `SELECT id, email, username, role FROM users WHERE email = '${input}';`;
    const parameterizedSql = `SELECT id, email, username, role FROM users WHERE email = ?;`;

    // Detection heuristics for common SQLi patterns
    const sqliPatterns = [
      /('|")\s*(OR|AND)\s*('|")?\w+('|")?\s*=\s*('|")?\w+/i,
      /('|")\s*(OR|AND)\s*\d+\s*=\s*\d+/i,
      /--|#|\/\*/,
      /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)/i,
      /UNION\s+(ALL\s+)?SELECT/i,
    ];

    const hasSqliSignature = sqliPatterns.some((pattern) => pattern.test(input));

    if (mode === 'vulnerable') {
      // In vulnerable mode, simulate what an unescaped SQL engine does
      let breached = false;
      let matchedUsers: Array<Omit<UserRecord, 'password_hash' | 'two_factor_secret'>> = [];

      // If injection payload matches classic bypass (e.g. ' OR '1'='1 or ' OR 1=1 or admin'--)
      if (hasSqliSignature && (input.includes("' OR '1'='1") || input.includes("' OR 1=1") || input.includes("' or 'a'='a") || input.toLowerCase().includes("' or 1=1--") || input.includes("'--"))) {
        breached = true;
        // The attacker bypassed auth and dumps all users!
        matchedUsers = this.getAllUsersSafe();
      } else {
        // Plain equality search
        const found = this.queryUsersByEmail(input);
        if (found) {
          const { password_hash, two_factor_secret, ...safe } = found;
          matchedUsers = [safe];
        }
      }

      return {
        mode: 'vulnerable',
        rawQueryExecuted: rawSqlConstructed,
        inputPassed: input,
        hasSqliSignature,
        vulnerabilityStatus: breached ? 'EXPLOITED' : hasSqliSignature ? 'ATTACK_DETECTED' : 'SAFE',
        explanation: breached
          ? 'CRITICAL VULNERABILITY! The SQL statement was manipulated by malicious input syntax. The parser treated user input as executable SQL logic, bypassing authentication.'
          : 'Query executed without sanitization. Any quote character breaks the SQL parser context.',
        resultsCount: matchedUsers.length,
        results: matchedUsers,
      };
    } else {
      // PARAMETERIZED / SECURE MODE
      // In parameterized mode, the database driver prepares the plan first, and binds the entire input as a literal string data value.
      // Therefore, "' OR '1'='1" is treated purely as an email string containing quotes, NOT executable SQL grammar!
      const user = this.queryUsersByEmail(input);
      const safeResults = user ? [{ id: user.id, email: user.email, username: user.username, role: user.role, two_factor_enabled: user.two_factor_enabled }] : [];

      return {
        mode: 'parameterized',
        preparedTemplate: parameterizedSql,
        boundParameters: [input],
        inputPassed: input,
        hasSqliSignature,
        vulnerabilityStatus: hasSqliSignature ? 'ATTACK_NEUTRALIZED' : 'SAFE',
        explanation: hasSqliSignature
          ? 'ATTACK NEUTRALIZED! Parameterized prepared statements completely separate SQL code structure from user data. The malicious SQL tokens were treated as literal data, preventing syntax injection.'
          : 'Secure parameterized execution safely matched parameter value against user table.',
        resultsCount: safeResults.length,
        results: safeResults,
      };
    }
  }
}

export const db = new SecureDatabase();
