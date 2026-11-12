import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Sparkles, KeyRound } from 'lucide-react';
import { api } from '../api';
import { User, SessionInfo } from '../types';

interface LoginFormProps {
  onSuccess: (user: User, session: SessionInfo) => void;
  onRequire2FA: (challengeToken: string, email: string, maskedEmail: string) => void;
  onSwitchToRegister: () => void;
  onSelectDemoAccount?: (email: string, pass: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onRequire2FA,
  onSwitchToRegister,
}) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) {
      setErrorMessage('Please fill in both fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.login({ emailOrUsername: emailOrUsername.trim(), password });

      if (res.requires2FA && res.challengeToken && res.email) {
        onRequire2FA(res.challengeToken, res.email, res.maskedEmail || res.email);
        return;
      }

      if (res.user && res.session) {
        onSuccess(res.user, res.session);
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);

      if (err.data?.attemptsRemaining !== undefined) {
        setAttemptsRemaining(err.data.attemptsRemaining);
      }
      if (err.data?.locked) {
        setIsLocked(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (userVal: string, passVal: string) => {
    setEmailOrUsername(userVal);
    setPassword(passVal);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Sign In to AegisLock</h2>
        <p className="text-sm text-slate-400 mt-1">
          Hardened against SQL Injection, Brute Force &amp; Credential Stuffing
        </p>
      </div>

      {/* Quick-Fill Demonstration Accents */}
      <div className="mb-5 p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Test Credentials:
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillCredentials('alice@example.com', 'Aegis!Pass2026')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-left transition-colors border border-slate-700/60 flex flex-col"
          >
            <span className="font-semibold text-emerald-400 truncate">Alice (Standard)</span>
            <span className="text-[10px] text-slate-400">alice@example.com</span>
          </button>
          <button
            type="button"
            onClick={() => fillCredentials('bob@defense.gov', 'Vault#2026Secure')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-left transition-colors border border-slate-700/60 flex flex-col"
          >
            <span className="font-semibold text-cyan-400 truncate">Bob (2FA Enforced)</span>
            <span className="text-[10px] text-slate-400">bob@defense.gov</span>
          </button>
        </div>
      </div>

      {/* Main Login Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40 backdrop-blur-xl">
        {errorMessage && (
          <div
            className={`mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
              isLocked
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-semibold">{errorMessage}</p>
              {attemptsRemaining !== null && !isLocked && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Defensive progressive backoff engaged. Account locks for 15 minutes if failed 5 times.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoComplete="username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="alice@example.com or alice_sec"
                disabled={isLoading}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Bcrypt 12 Rounds
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isLoading}
                required
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Authenticate Securely</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Assurance Footnote */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Zero SQL Injection exposure
          </span>
          <span>Prepared statement binding</span>
        </div>
      </div>

      {/* Switch to Register */}
      <div className="text-center mt-5">
        <p className="text-sm text-slate-400">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            Create Secure Account
          </button>
        </p>
      </div>
    </div>
  );
};
