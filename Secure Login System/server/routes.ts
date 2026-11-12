import { Router, Request, Response, NextFunction } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generate2FASecret,
  generate2FAQRCode,
  verify2FACode,
  generateBackupCodes,
  hashBackupCode,
  create2FAChallenge,
  verify2FAChallenge,
  checkIpRateLimit,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  SESSION_EXPIRY_MS,
  BCRYPT_SALT_ROUNDS,
  generateTotpCode,
} from './auth.js';
import { db, UserRecord, SessionRecord } from './db.js';

export const router = Router();

// Extend Request to include authenticated user & session
export interface AuthRequest extends Request {
  user?: UserRecord;
  sessionRecord?: SessionRecord;
}

// Device detection helper
function getDeviceName(userAgent: string): string {
  if (!userAgent) return 'Unknown Device';
  if (/mobile/i.test(userAgent)) {
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'Apple Mobile Device';
    if (/android/i.test(userAgent)) return 'Android Device';
    return 'Mobile Device';
  }
  if (/macintosh|mac os x/i.test(userAgent)) return 'macOS Computer';
  if (/windows/i.test(userAgent)) return 'Windows PC';
  if (/linux/i.test(userAgent)) return 'Linux Workstation';
  return 'Web Client';
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Authentication Middleware
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.aegis_session) {
    token = req.cookies.aegis_session;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No session token provided.' });
    return;
  }

  const session = db.getSession(token);
  if (!session) {
    res.status(401).json({ error: 'Session expired or invalidated. Please log in again.' });
    return;
  }

  const user = db.queryUserById(session.user_id);
  if (!user) {
    res.status(401).json({ error: 'User associated with session not found.' });
    return;
  }

  // Refresh active timestamp
  db.touchSession(token);

  req.user = user;
  req.sessionRecord = session;
  next();
}

// Helper to seed demo accounts on server start
export async function seedDemoAccounts() {
  const aliceEmail = 'alice@example.com';
  if (!db.queryUsersByEmail(aliceEmail)) {
    const passwordHash = await hashPassword('Aegis!Pass2026');
    db.insertUser({
      email: aliceEmail,
      username: 'alice_sec',
      password_hash: passwordHash,
      role: 'user',
      two_factor_enabled: false,
      two_factor_secret: null,
      failed_login_attempts: 0,
      locked_until: null,
    });
  }

  const bobEmail = 'bob@defense.gov';
  if (!db.queryUsersByEmail(bobEmail)) {
    const passwordHash = await hashPassword('Vault#2026Secure');
    const secret = generate2FASecret();
    const bob = db.insertUser({
      email: bobEmail,
      username: 'bob_agent',
      password_hash: passwordHash,
      role: 'admin',
      two_factor_enabled: true,
      two_factor_secret: secret,
      failed_login_attempts: 0,
      locked_until: null,
    });

    // Generate backup codes for Bob
    const { plainCodes, hashedCodes } = generateBackupCodes();
    db.setBackupCodes(bob.id, hashedCodes);
  }
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

/**
 * POST /api/auth/register
 */
router.post('/auth/register', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // IP Rate limiting
  const rate = checkIpRateLimit(ip, 20, 60);
  if (!rate.allowed) {
    db.addAuditLog({
      user_id: null,
      email: null,
      event_type: 'RATE_LIMITED',
      ip_address: ip,
      user_agent: userAgent,
      threat_level: 'WARNING',
      details: `Registration rate limit exceeded. Retry after ${rate.retryAfter}s`,
    });
    return res.status(429).json({ error: `Too many requests. Please try again in ${rate.retryAfter} seconds.` });
  }

  // Validate input
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map((e) => e.message);
    return res.status(400).json({ error: errors[0], details: errors });
  }

  const { email, username, password } = parseResult.data;

  // Parameterized Query: check if user exists
  if (db.queryUsersByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email address already exists.' });
  }

  if (db.queryUserByUsername(username)) {
    return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
  }

  try {
    // Hash password with bcryptjs (12 rounds)
    const passwordHash = await hashPassword(password);

    // Insert user safely
    const newUser = db.insertUser({
      email,
      username,
      password_hash: passwordHash,
      role: 'user',
      two_factor_enabled: false,
      two_factor_secret: null,
      failed_login_attempts: 0,
      locked_until: null,
    });

    // Create immediate session
    const token = generateSessionToken();
    const session = db.insertSession({
      user_id: newUser.id,
      token,
      ip_address: ip,
      user_agent: userAgent,
      device_name: getDeviceName(userAgent),
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      expires_at: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString(),
      is_revoked: false,
    });

    db.addAuditLog({
      user_id: newUser.id,
      email: newUser.email,
      event_type: 'REGISTER',
      ip_address: ip,
      user_agent: userAgent,
      threat_level: 'INFO',
      details: `User registered successfully with bcrypt (12 rounds). Session initiated.`,
    });

    res.cookie('aegis_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY_MS,
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        two_factor_enabled: newUser.two_factor_enabled,
        created_at: newUser.created_at,
      },
      session: {
        id: session.id,
        deviceName: session.device_name,
        expiresAt: session.expires_at,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal security error during registration.' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // IP Rate limiting
  const rate = checkIpRateLimit(ip, 15, 60);
  if (!rate.allowed) {
    db.addAuditLog({
      user_id: null,
      email: null,
      event_type: 'RATE_LIMITED',
      ip_address: ip,
      user_agent: userAgent,
      threat_level: 'WARNING',
      details: `Login rate limit exceeded. Retry after ${rate.retryAfter}s`,
    });
    return res.status(429).json({ error: `Too many login attempts. Please wait ${rate.retryAfter} seconds.` });
  }

  // Parse input
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid login credentials format.' });
  }

  const { emailOrUsername, password } = parseResult.data;

  // Parameterized Query: find user by email or username
  let user: UserRecord | null = null;
  if (emailOrUsername.includes('@')) {
    user = db.queryUsersByEmail(emailOrUsername);
  } else {
    user = db.queryUserByUsername(emailOrUsername);
  }

  // Generic failure response prevents user enumeration attacks
  const genericFailMessage = 'Invalid credentials. Please verify your email/username and password.';

  if (!user) {
    // Artificial delay to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 150));
    db.addAuditLog({
      user_id: null,
      email: emailOrUsername,
      event_type: 'LOGIN_FAILED',
      ip_address: ip,
      user_agent: userAgent,
      threat_level: 'WARNING',
      details: `Failed login attempt for non-existent or mismatched account identifier.`,
    });
    return res.status(401).json({ error: genericFailMessage });
  }

  // Check account lockout
  if (user.locked_until && user.locked_until > Date.now()) {
    const minutesLeft = Math.ceil((user.locked_until - Date.now()) / (60 * 1000));
    db.addAuditLog({
      user_id: user.id,
      email: user.email,
      event_type: 'LOGIN_FAILED',
      ip_address: ip,
      user_agent: userAgent,
      threat_level: 'CRITICAL',
      details: `Login blocked: Account is temporarily locked due to excessive failed attempts. ${minutesLeft} minutes remaining.`,
    });
    return res.status(403).json({
      error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute(s).`,
      locked: true,
      lockedUntil: user.locked_until,
    });
  }

  // Verify bcrypt password
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    const newFailCount = user.failed_login_attempts + 1;
    let lockedUntil: number | null = null;

    if (newFailCount >= MAX_LOGIN_ATTEMPTS) {
      lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      db.updateUser(user.id, {
        failed_login_attempts: newFailCount,
        locked_until: lockedUntil,
      });

      db.addAuditLog({
        user_id: user.id,
        email: user.email,
        event_type: 'LOGIN_FAILED',
        ip_address: ip,
        user_agent: userAgent,
        threat_level: 'CRITICAL',
        details: `Account LOCKED for 15 minutes after reaching ${newFailCount} consecutive failed attempts.`,
      });

      return res.status(403).json({
        error: `Account locked for 15 minutes due to ${newFailCount} consecutive incorrect attempts.`,
        locked: true,
        lockedUntil,
      });
    }

    db.updateUser(user.id, { failed_login_attempts: newFailCount });
    db.addAuditLog({
      user_id: user.id,
      email: user.email,
      event_type: 'LOGIN_FAILED',
      ip_address: ip,
      user_agent: userAgent,
      threat_level: 'WARNING',
      details: `Incorrect password attempt (${newFailCount}/${MAX_LOGIN_ATTEMPTS}).`,
    });

    return res.status(401).json({
      error: `${genericFailMessage} (${MAX_LOGIN_ATTEMPTS - newFailCount} attempts remaining before temporary lockout)`,
      attemptsRemaining: MAX_LOGIN_ATTEMPTS - newFailCount,
    });
  }

  // Password is correct! Reset failure counters
  db.updateUser(user.id, { failed_login_attempts: 0, locked_until: null });

  // Check if Two-Factor Authentication is enabled
  if (user.two_factor_enabled) {
    const challengeToken = create2FAChallenge(user.id);
    return res.status(200).json({
      requires2FA: true,
      challengeToken,
      email: user.email,
      maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      message: 'Password verified. Please submit your 6-digit 2FA code or backup code.',
    });
  }

  // Issue Session Token
  const token = generateSessionToken();
  const session = db.insertSession({
    user_id: user.id,
    token,
    ip_address: ip,
    user_agent: userAgent,
    device_name: getDeviceName(userAgent),
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    expires_at: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString(),
    is_revoked: false,
  });

  db.addAuditLog({
    user_id: user.id,
    email: user.email,
    event_type: 'LOGIN_SUCCESS',
    ip_address: ip,
    user_agent: userAgent,
    threat_level: 'INFO',
    details: `Successful login with bcrypt password verification. Session created.`,
  });

  res.cookie('aegis_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_MS,
  });

  return res.status(200).json({
    requires2FA: false,
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      two_factor_enabled: user.two_factor_enabled,
      created_at: user.created_at,
    },
    session: {
      id: session.id,
      deviceName: session.device_name,
      expiresAt: session.expires_at,
    },
  });
});

/**
 * POST /api/auth/verify-2fa
 * Complete login challenge using TOTP authenticator code or backup recovery code
 */
router.post('/auth/verify-2fa', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const { challengeToken, code, isBackupCode } = req.body;

  if (!challengeToken || !code) {
    return res.status(400).json({ error: 'Challenge token and verification code are required.' });
  }

  const userId = verify2FAChallenge(challengeToken);
  if (!userId) {
    return res.status(401).json({ error: '2FA session challenge expired or invalid. Please log in again.' });
  }

  const user = db.queryUserById(userId);
  if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
    return res.status(400).json({ error: '2FA is not active on this account.' });
  }

  let codeValid = false;

  if (isBackupCode) {
    // Check backup recovery code
    const hashed = hashBackupCode(code);
    codeValid = db.markBackupCodeUsed(user.id, hashed);
  } else {
    // Verify TOTP 6-digit code
    codeValid = verify2FACode(code, user.two_factor_secret);
  }

  if (!codeValid) {
    // Re-issue a fresh challenge so user can try again
    const nextChallenge = create2FAChallenge(user.id);
    db.addAuditLog({
      user_id: user.id,
      email: user.email,
      event_type: 'LOGIN_FAILED',
      ip_address: ip,
      user_agent: userAgent,
      threat_level: 'WARNING',
      details: `Failed 2FA code verification attempt (${isBackupCode ? 'Backup Code' : 'TOTP Code'}).`,
    });

    return res.status(401).json({
      error: isBackupCode ? 'Invalid or already used backup code.' : 'Invalid 2FA verification code. Please check your authenticator app.',
      challengeToken: nextChallenge,
    });
  }

  // 2FA Verified! Issue full session token
  const token = generateSessionToken();
  const session = db.insertSession({
    user_id: user.id,
    token,
    ip_address: ip,
    user_agent: userAgent,
    device_name: getDeviceName(userAgent),
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
    expires_at: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString(),
    is_revoked: false,
  });

  db.addAuditLog({
    user_id: user.id,
    email: user.email,
    event_type: '2FA_VERIFIED',
    ip_address: ip,
    user_agent: userAgent,
    threat_level: 'INFO',
    details: `Two-Factor Authentication successful (${isBackupCode ? 'Backup Code used' : 'TOTP Authenticator code'}).`,
  });

  res.cookie('aegis_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY_MS,
  });

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      two_factor_enabled: user.two_factor_enabled,
      created_at: user.created_at,
    },
    session: {
      id: session.id,
      deviceName: session.device_name,
      expiresAt: session.expires_at,
    },
  });
});

/**
 * GET /api/auth/me
 */
router.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const session = req.sessionRecord!;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      two_factor_enabled: user.two_factor_enabled,
      created_at: user.created_at,
    },
    session: {
      id: session.id,
      deviceName: session.device_name,
      ipAddress: session.ip_address,
      lastActive: session.last_active,
      expiresAt: session.expires_at,
    },
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/auth/logout', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const session = req.sessionRecord!;

  db.revokeSession(session.token);

  db.addAuditLog({
    user_id: user.id,
    email: user.email,
    event_type: 'LOGOUT',
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    threat_level: 'INFO',
    details: `Session revoked cleanly by user.`,
  });

  res.clearCookie('aegis_session');
  res.json({ message: 'Logged out successfully.' });
});

/**
 * POST /api/auth/logout-all
 */
router.post('/auth/logout-all', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const count = db.revokeAllUserSessions(user.id);

  db.addAuditLog({
    user_id: user.id,
    email: user.email,
    event_type: 'LOGOUT_ALL',
    ip_address: getClientIp(req),
    user_agent: req.headers['user-agent'] || 'Unknown',
    threat_level: 'WARNING',
    details: `Revoked all ${count} active sessions across all devices.`,
  });

  res.clearCookie('aegis_session');
  res.json({ message: `Successfully revoked ${count} active sessions. All devices logged out.` });
});

/**
 * GET /api/auth/sessions
 */
router.get('/auth/sessions', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const currentToken = req.sessionRecord!.token;
  const sessions = db.getUserSessions(user.id).map((s) => ({
    id: s.id,
    deviceName: s.device_name,
    ipAddress: s.ip_address,
    userAgent: s.user_agent,
    createdAt: s.created_at,
    lastActive: s.last_active,
    expiresAt: s.expires_at,
    isCurrent: s.token === currentToken,
    isRevoked: s.is_revoked,
  }));

  res.json({ sessions });
});

/**
 * POST /api/auth/sessions/revoke
 */
router.post('/auth/sessions/revoke', requireAuth, (req: AuthRequest, res: Response) => {
  const { sessionId } = req.body;
  const user = req.user!;
  const all = db.getUserSessions(user.id);
  const target = all.find((s) => s.id === sessionId);

  if (!target) {
    return res.status(404).json({ error: 'Session not found or does not belong to you.' });
  }

  db.revokeSession(target.token);

  db.addAuditLog({
    user_id: user.id,
    email: user.email,
    event_type: 'SESSION_REVOKED',
    ip_address: getClientIp(req),
    user_agent: req.headers['user-agent'] || 'Unknown',
    threat_level: 'INFO',
    details: `Revoked session on device: ${target.device_name} (IP: ${target.ip_address})`,
  });

  res.json({ message: 'Session revoked successfully.' });
});

/**
 * POST /api/auth/2fa/setup
 * Generates secret & QR code for setting up TOTP
 */
router.post('/auth/2fa/setup', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const secret = generate2FASecret();
  const { qrCodeDataUrl, otpauthUrl } = await generate2FAQRCode(user.email, secret);

  res.json({
    secret,
    qrCodeDataUrl,
    otpauthUrl,
  });
});

/**
 * POST /api/auth/2fa/enable
 * Verifies code and confirms activation, produces backup recovery codes
 */
router.post('/auth/2fa/enable', requireAuth, (req: AuthRequest, res: Response) => {
  const { secret, code } = req.body;
  const user = req.user!;

  if (!secret || !code) {
    return res.status(400).json({ error: 'Secret and verification code are required.' });
  }

  const isValid = verify2FACode(code, secret);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid verification code. Ensure your device time is synchronized.' });
  }

  // Generate backup recovery codes
  const { plainCodes, hashedCodes } = generateBackupCodes();
  db.setBackupCodes(user.id, hashedCodes);

  // Enable 2FA on user
  db.updateUser(user.id, {
    two_factor_enabled: true,
    two_factor_secret: secret,
  });

  db.addAuditLog({
    user_id: user.id,
    email: user.email,
    event_type: '2FA_ENABLED',
    ip_address: getClientIp(req),
    user_agent: req.headers['user-agent'] || 'Unknown',
    threat_level: 'INFO',
    details: `Two-Factor Authentication enabled with RFC 6238 TOTP and 8 backup codes.`,
  });

  res.json({
    message: 'Two-Factor Authentication enabled successfully!',
    backupCodes: plainCodes,
  });
});

/**
 * POST /api/auth/2fa/disable
 * Requires current password verification to disable
 */
router.post('/auth/2fa/disable', requireAuth, async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  const user = req.user!;

  if (!password) {
    return res.status(400).json({ error: 'Current password is required to disable 2FA.' });
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  db.updateUser(user.id, {
    two_factor_enabled: false,
    two_factor_secret: null,
  });

  // clear backup codes
  db.setBackupCodes(user.id, []);

  db.addAuditLog({
    user_id: user.id,
    email: user.email,
    event_type: '2FA_DISABLED',
    ip_address: getClientIp(req),
    user_agent: req.headers['user-agent'] || 'Unknown',
    threat_level: 'WARNING',
    details: `Two-Factor Authentication was disabled by user.`,
  });

  res.json({ message: 'Two-Factor Authentication disabled successfully.' });
});

/**
 * POST /api/auth/change-password
 */
router.post('/auth/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  const parseResult = changePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid password format.' });
  }

  const { currentPassword, newPassword } = parseResult.data;
  const user = req.user!;

  const isCurrentValid = await verifyPassword(currentPassword, user.password_hash);
  if (!isCurrentValid) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  // Hash new password
  const newHash = await hashPassword(newPassword);
  db.updateUser(user.id, { password_hash: newHash });

  db.addAuditLog({
    user_id: user.id,
    email: user.email,
    event_type: 'PASSWORD_CHANGED',
    ip_address: getClientIp(req),
    user_agent: req.headers['user-agent'] || 'Unknown',
    threat_level: 'INFO',
    details: `Password changed and re-hashed with bcrypt (12 rounds).`,
  });

  res.json({ message: 'Password updated successfully.' });
});

/**
 * GET /api/audit-logs
 */
router.get('/audit-logs', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  // Admins see all logs, regular users see their own
  const logs = user.role === 'admin' ? db.getAuditLogs(undefined, 80) : db.getAuditLogs(user.id, 50);
  res.json({ logs });
});

/**
 * GET /api/security/stats
 */
router.get('/security/stats', (req: Request, res: Response) => {
  const users = db.getAllUsersSafe();
  const activeSessions = users.length; // baseline
  const twoFactorCount = users.filter((u) => u.two_factor_enabled).length;

  res.json({
    bcryptSaltRounds: BCRYPT_SALT_ROUNDS,
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    lockoutDurationMinutes: LOCKOUT_DURATION_MS / 60000,
    sessionExpiryHours: SESSION_EXPIRY_MS / 3600000,
    registeredUsersCount: users.length,
    usersWith2FA: twoFactorCount,
    defenseFeatures: [
      { name: 'Bcrypt Hash Cost (12)', status: 'Active', description: 'Resists GPU & ASIC brute force attacks' },
      { name: 'Parameterized Queries', status: 'Active', description: 'Zero SQL Injection vulnerabilities' },
      { name: 'Account Lockout Guard', status: 'Active', description: 'Blocks brute-force after 5 failures' },
      { name: 'TOTP 2FA (RFC 6238)', status: 'Active', description: 'Time-synchronized one-time passwords' },
      { name: 'Crypto Random Sessions', status: 'Active', description: '256-bit cryptographically secure session IDs' },
      { name: 'Audit Trail & Telemetry', status: 'Active', description: 'Immutable logging of authentication events' },
    ],
  });
});

/**
 * POST /api/security/test-sql-injection
 * Demonstrative Attack & Defense Simulator
 */
router.post('/security/test-sql-injection', (req: Request, res: Response) => {
  const { input, mode } = req.body;
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'Input query payload is required.' });
  }

  const result = db.simulateSqlQuery(input, mode === 'vulnerable' ? 'vulnerable' : 'parameterized');

  // Log simulation event
  if (result.hasSqliSignature) {
    db.addAuditLog({
      user_id: null,
      email: null,
      event_type: mode === 'vulnerable' ? 'SQL_INJECTION_SIMULATED_ATTACK' : 'SQL_INJECTION_BLOCKED',
      ip_address: ip,
      user_agent: userAgent,
      threat_level: mode === 'vulnerable' ? 'CRITICAL' : 'INFO',
      details: `Simulated SQL injection payload test: "${input.slice(0, 50)}..." in [${mode.toUpperCase()}] mode. Result: ${result.vulnerabilityStatus}`,
    });
  }

  res.json(result);
});

/**
 * GET /api/demo-accounts
 * Helper endpoint to view available demo test credentials and live TOTP token for Bob
 */
router.get('/demo-accounts', (req: Request, res: Response) => {
  const bob = db.queryUsersByEmail('bob@defense.gov');
  let bobCurrentTotp = '123456';
  if (bob?.two_factor_secret) {
    bobCurrentTotp = generateTotpCode(bob.two_factor_secret);
  }

  res.json({
    accounts: [
      {
        email: 'alice@example.com',
        username: 'alice_sec',
        password: 'Aegis!Pass2026',
        role: 'user',
        has2FA: false,
        note: 'Standard user, ideal for testing 2FA setup and session management.',
      },
      {
        email: 'bob@defense.gov',
        username: 'bob_agent',
        password: 'Vault#2026Secure',
        role: 'admin',
        has2FA: true,
        currentTotp: bobCurrentTotp,
        note: 'Admin account with 2FA already enforced. Built-in TOTP simulator available.',
      },
    ],
  });
});

/**
 * POST /api/github/push
 * Automated GitHub push service (supports both root repository or subfolder in existing repository)
 */
router.post('/github/push', async (req: Request, res: Response) => {
  const { repoUrl, personalAccessToken, targetFolder, branch = 'main', commitMessage = 'feat: add AegisLock secure login system' } = req.body;

  if (!repoUrl || !personalAccessToken) {
    return res.status(400).json({ error: 'GitHub repository URL and Personal Access Token (PAT) are required.' });
  }

  // Sanitize repoUrl
  let cleanUrl = String(repoUrl).trim().replace(/\/$/, '');
  if (!cleanUrl.endsWith('.git')) cleanUrl += '.git';

  // Format authenticated URL
  const tokenClean = String(personalAccessToken).trim();
  const authUrl = cleanUrl.replace(/^https:\/\//, `https://${encodeURIComponent(tokenClean)}@`);

  try {
    if (targetFolder && targetFolder.trim() !== '' && targetFolder.trim() !== '.') {
      const sanitizedFolder = targetFolder.trim().replace(/^\/+|\/+$/g, '');
      const tempDir = path.join('/tmp', `gh-export-${Date.now()}`);

      // 1. Clone user's existing repo
      try {
        await execAsync(`git clone --depth 1 --branch ${branch} "${authUrl}" "${tempDir}"`);
      } catch {
        // Fallback to default branch clone if branch doesn't exist yet
        await execAsync(`git clone "${authUrl}" "${tempDir}"`);
      }

      // 2. Create destination folder
      const destDir = path.join(tempDir, sanitizedFolder);
      await fs.promises.mkdir(destDir, { recursive: true });

      // 3. Copy our application files
      const currentDir = process.cwd();
      const filesToCopy = [
        'src',
        'server',
        'server.ts',
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'README.md',
        '.env.example',
        'metadata.json',
      ];

      for (const item of filesToCopy) {
        const srcItem = path.join(currentDir, item);
        const destItem = path.join(destDir, item);
        if (fs.existsSync(srcItem)) {
          await execAsync(`cp -r "${srcItem}" "${destItem}"`);
        }
      }

      // 4. Commit and push from tempDir
      await execAsync(
        `cd "${tempDir}" && git config user.name "AegisLock" && git config user.email "bot@aegislock.local" && git add "${sanitizedFolder}" && git commit -m "${commitMessage}" && git push origin HEAD:${branch}`
      );

      // Cleanup
      await execAsync(`rm -rf "${tempDir}"`);

      return res.json({
        success: true,
        message: `Successfully added and pushed the application into "${sanitizedFolder}/" in ${repoUrl}!`,
      });
    } else {
      // Push directly to root of repository
      await execAsync(`git remote remove github-target 2>/dev/null || true`);
      await execAsync(`git remote add github-target "${authUrl}"`);
      await execAsync(`git push -u github-target main:${branch} --force`);
      await execAsync(`git remote remove github-target`);

      return res.json({
        success: true,
        message: `Successfully pushed application to root of ${repoUrl}!`,
      });
    }
  } catch (error: any) {
    console.error('GitHub push error:', error);
    const rawError = error?.stderr || error?.message || 'Failed to push to GitHub.';
    // Mask token if present in stderr
    const safeError = rawError.replace(new RegExp(tokenClean, 'g'), '***');
    return res.status(500).json({
      error: `GitHub Push failed: ${safeError}. Please check your repository URL and Personal Access Token (ensure 'repo' permissions are enabled).`,
    });
  }
});

