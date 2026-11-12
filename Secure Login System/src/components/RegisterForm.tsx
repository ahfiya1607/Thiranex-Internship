import React, { useState, useMemo } from 'react';
import { UserPlus, Mail, User, Eye, EyeOff, Check, X, Shield, ArrowRight, AlertCircle, Key } from 'lucide-react';
import { api } from '../api';
import { User as UserType, SessionInfo } from '../types';

interface RegisterFormProps {
  onSuccess: (user: UserType, session: SessionInfo) => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time password analysis
  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.length) score += 25;
    if (passwordChecks.uppercase) score += 20;
    if (passwordChecks.lowercase) score += 15;
    if (passwordChecks.number) score += 20;
    if (passwordChecks.special) score += 20;
    return score;
  }, [passwordChecks]);

  const strengthMeta = useMemo(() => {
    if (strengthScore <= 25) return { label: 'Very Weak', color: 'bg-rose-500', textColor: 'text-rose-400' };
    if (strengthScore <= 50) return { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-400' };
    if (strengthScore <= 75) return { label: 'Good', color: 'bg-amber-500', textColor: 'text-amber-400' };
    if (strengthScore < 100) return { label: 'Strong', color: 'bg-teal-500', textColor: 'text-teal-400' };
    return { label: 'Optimal Security', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
  }, [strengthScore]);

  const isFormValid = useMemo(() => {
    return (
      email.includes('@') &&
      username.length >= 3 &&
      passwordChecks.length &&
      passwordChecks.uppercase &&
      passwordChecks.lowercase &&
      passwordChecks.number &&
      passwordChecks.special &&
      password === confirmPassword
    );
  }, [email, username, passwordChecks, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
      } else {
        setErrorMessage('Please meet all password complexity requirements.');
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.register({
        email: email.trim(),
        username: username.trim(),
        password,
      });

      onSuccess(res.user, res.session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-3 shadow-inner">
          <UserPlus className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Create Secure Account</h2>
        <p className="text-sm text-slate-400 mt-1">
          Stored with salted Bcrypt (12 rounds) &amp; input sanitization
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40 backdrop-blur-xl">
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl text-xs bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice_dev"
                disabled={isLoading}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">3-30 characters, letters, numbers &amp; underscores only</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@domain.org"
                disabled={isLoading}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              {password && (
                <span className={`text-xs font-semibold ${strengthMeta.textColor}`}>
                  {strengthMeta.label}
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose high-entropy password"
                disabled={isLoading}
                required
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
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

            {/* Strength Progress Bar */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strengthMeta.color}`}
                    style={{ width: `${strengthScore}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              disabled={isLoading}
              required
              className="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
            />
          </div>

          {/* Password Policy Checklist */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs space-y-1.5">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
              Security Policy Checklist:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className={`flex items-center gap-1.5 ${passwordChecks.length ? 'text-emerald-400' : 'text-slate-400'}`}>
                {passwordChecks.length ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                <span>8+ Characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordChecks.uppercase ? 'text-emerald-400' : 'text-slate-400'}`}>
                {passwordChecks.uppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                <span>Uppercase (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordChecks.lowercase ? 'text-emerald-400' : 'text-slate-400'}`}>
                {passwordChecks.lowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                <span>Lowercase (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordChecks.number ? 'text-emerald-400' : 'text-slate-400'}`}>
                {passwordChecks.number ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                <span>Number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${passwordChecks.special ? 'text-emerald-400' : 'text-slate-400'}`}>
                {passwordChecks.special ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                <span>Special Symbol (!@#)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${password && password === confirmPassword ? 'text-emerald-400' : 'text-slate-400'}`}>
                {password && password === confirmPassword ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                <span>Passwords Match</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Initialize Protected Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Switch to Login */}
      <div className="text-center mt-5">
        <p className="text-sm text-slate-400">
          Already registered?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
          >
            Sign In here
          </button>
        </p>
      </div>
    </div>
  );
};
