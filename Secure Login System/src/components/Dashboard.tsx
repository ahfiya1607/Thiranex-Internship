import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Key,
  LogOut,
  RefreshCw,
  Clock,
  Globe,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { api } from '../api';
import { User, SessionInfo } from '../types';
import { TwoFactorModal } from './TwoFactorModal';

interface DashboardProps {
  user: User;
  session: SessionInfo;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
  onNavigateToSqli: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  session,
  onUserUpdated,
  onLogout,
  onNavigateToSqli,
}) => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  // Disable 2FA state
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Action status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await api.getSessions();
      setSessions(data.sessions);
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      setStatusMessage('Device session revoked successfully.');
      fetchSessions();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to revoke session.');
    }
  };

  const handleLogoutAllOther = async () => {
    try {
      const res = await api.logoutAll();
      setStatusMessage(res.message);
      fetchSessions();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to revoke all sessions.');
    }
  };

  const handleConfirmDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) return;

    try {
      await api.disable2FA(disablePassword);
      const updatedUser = { ...user, two_factor_enabled: false };
      onUserUpdated(updatedUser);
      setIsDisabling2FA(false);
      setDisablePassword('');
      setDisableError(null);
      setStatusMessage('Two-Factor Authentication has been disabled.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setDisableError(err.message || 'Failed to disable 2FA. Incorrect password.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Password successfully updated and re-hashed with Bcrypt (12 rounds).');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Security posture score
  const postureScore = user.two_factor_enabled ? 100 : 65;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Status banner */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* User Hero & Security Overview Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl shadow-inner">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-white tracking-tight">{user.username}</h1>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{user.email}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700/80 hover:border-rose-500/30 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>End Active Session</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Session Defense</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Crypto 256-bit Token
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Password Storage</span>
              <span className="font-semibold text-cyan-400">Bcrypt (Cost 12)</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Database Query Mode</span>
              <span className="font-semibold text-emerald-400">Parameterized (Safe)</span>
            </div>
          </div>
        </div>

        {/* Security Health Score Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Security Posture Score
              </span>
              {user.two_factor_enabled ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-extrabold text-white">{postureScore}</span>
              <span className="text-sm font-medium text-slate-400">/ 100</span>
              <span
                className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${
                  user.two_factor_enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {user.two_factor_enabled ? 'Hardened' : 'Needs 2FA'}
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  user.two_factor_enabled ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${postureScore}%` }}
              ></div>
            </div>

            <p className="text-xs text-slate-400">
              {user.two_factor_enabled
                ? 'Excellent! Two-Factor Authentication and salted Bcrypt hashing are fully active.'
                : 'Account vulnerability: Activate Two-Factor Authentication to shield against credential theft.'}
            </p>
          </div>

          {!user.two_factor_enabled && (
            <button
              onClick={() => setIs2FAModalOpen(true)}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Enable 2FA (+35 Pts)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 2FA & Active Sessions & Password Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TWO-FACTOR AUTHENTICATION CONTROL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-400">RFC 6238 Time-Based OTP (TOTP)</p>
              </div>
            </div>

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                user.two_factor_enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {user.two_factor_enabled ? 'Active & Enforced' : 'Disabled'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-5">
            Two-Factor Authentication adds a secondary cryptographic challenge requiring an ephemeral 6-digit code
            from your authenticator device (e.g. Google Authenticator, 1Password) along with 8 single-use emergency backup recovery codes.
          </p>

          {user.two_factor_enabled ? (
            <div>
              {!isDisabling2FA ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      TOTP Authenticator Protection Active
                    </span>
                    <button
                      onClick={() => setIsDisabling2FA(true)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-semibold cursor-pointer"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmDisable2FA} className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl text-xs space-y-3">
                  <span className="font-semibold text-rose-300 block">
                    Confirm 2FA Deactivation with Current Password:
                  </span>
                  {disableError && <p className="text-rose-400">{disableError}</p>}
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-rose-500"
                    required
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDisabling2FA(false);
                        setDisablePassword('');
                        setDisableError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                    >
                      Confirm Deactivation
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIs2FAModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Configure 2FA Authenticator &amp; Backup Codes</span>
            </button>
          )}
        </div>

        {/* CHANGE PASSWORD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Change Password</h3>
              <p className="text-xs text-slate-400">Re-hash with Bcrypt 12 salt rounds</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Current Password</label>
              <input
                type={showPasswordFields ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">New Password</label>
                <input
                  type={showPasswordFields ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, mixed symbols"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Confirm New Password</label>
                <input
                  type={showPasswordFields ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPasswordFields(!showPasswordFields)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {showPasswordFields ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswordFields ? 'Hide passwords' : 'Show passwords'}</span>
              </button>

              <button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isChangingPassword ? 'Re-hashing...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SESSION MANAGEMENT SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Active Session Management</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographically signed tokens with sliding 24-hour expiry and client fingerprinting
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              disabled={isLoadingSessions}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh session list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
            </button>
            {sessions.filter((s) => !s.isCurrent && !s.isRevoked).length > 0 && (
              <button
                onClick={handleLogoutAllOther}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                Revoke All Other Devices
              </button>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                s.isCurrent
                  ? 'bg-emerald-950/20 border-emerald-500/30 shadow-sm'
                  : s.isRevoked
                  ? 'bg-slate-950/30 border-slate-800/40 opacity-50'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    s.isCurrent
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{s.deviceName}</span>
                    {s.isCurrent && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        This Device (Current)
                      </span>
                    )}
                    {s.isRevoked && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                        Revoked
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-500" />
                      IP: {s.ipAddress || '127.0.0.1'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Active: {s.lastActive ? new Date(s.lastActive).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>

              {!s.isCurrent && !s.isRevoked && (
                <button
                  onClick={() => handleRevokeSession(s.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 transition-colors flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke Access</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2FA SETUP MODAL */}
      <TwoFactorModal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        on2FAEnabled={() => {
          onUserUpdated({ ...user, two_factor_enabled: true });
          setStatusMessage('Two-Factor Authentication is now enabled on your account!');
        }}
      />
    </div>
  );
};
