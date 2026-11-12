import React, { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, ArrowLeft, ArrowRight, AlertCircle, Smartphone, LifeBuoy } from 'lucide-react';
import { api } from '../api';
import { User, SessionInfo } from '../types';

interface TwoFactorChallengeProps {
  challengeToken: string;
  email: string;
  maskedEmail: string;
  onSuccess: (user: User, session: SessionInfo) => void;
  onCancel: () => void;
}

export const TwoFactorChallenge: React.FC<TwoFactorChallengeProps> = ({
  challengeToken: initialChallengeToken,
  email,
  maskedEmail,
  onSuccess,
  onCancel,
}) => {
  const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
  const [code, setCode] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  // Synchronized 30-second countdown representation for TOTP RFC 6238
  useEffect(() => {
    const updateTime = () => {
      const seconds = 30 - (Math.floor(Date.now() / 1000) % 30);
      setTimeLeft(seconds);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage(isBackupMode ? 'Please enter a backup code.' : 'Please enter your 6-digit 2FA code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.verify2FA({
        challengeToken,
        code: code.trim(),
        isBackupCode: isBackupMode,
      });

      onSuccess(res.user, res.session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification code failed. Please check and try again.');
      if (err.data?.challengeToken) {
        setChallengeToken(err.data.challengeToken);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 shadow-inner">
          <Smartphone className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Two-Factor Authentication</h2>
        <p className="text-sm text-slate-400 mt-1">
          {isBackupMode ? 'Enter one of your 8 emergency backup codes' : `Enter the 6-digit TOTP code for ${maskedEmail}`}
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40 backdrop-blur-xl">
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl text-xs bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isBackupMode ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Authenticator Code
                </label>
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Refreshes in {timeLeft}s</span>
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  disabled={isLoading}
                  className="w-full text-center text-3xl tracking-[0.5em] font-mono py-3.5 px-4 bg-slate-950/80 border border-slate-700 rounded-xl text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-700"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Open Google Authenticator, 1Password, or Apple Passwords
              </p>

              {email.toLowerCase().includes('bob') && (
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const data = await api.getDemoAccounts();
                        const bob = data.accounts.find((a) => a.email === 'bob@defense.gov');
                        if (bob?.currentTotp) {
                          setCode(bob.currentTotp);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                  >
                    Testing demo account? Click to auto-fill Bob's current 2FA code
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Emergency Backup Recovery Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoFocus
                  maxLength={12}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-center font-mono text-lg tracking-wider text-amber-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-600"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Each single-use backup code is invalidated immediately upon successful verification.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || code.length < (isBackupMode ? 8 : 6)}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Establish Session</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Backup Mode */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => {
              setIsBackupMode(!isBackupMode);
              setCode('');
              setErrorMessage(null);
            }}
            className="text-xs text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isBackupMode ? 'Use 6-digit Authenticator app code instead' : 'Lost access to phone? Use Backup Recovery Code'}</span>
          </button>
        </div>
      </div>

      {/* Return to Login */}
      <div className="text-center mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Credentials</span>
        </button>
      </div>
    </div>
  );
};
