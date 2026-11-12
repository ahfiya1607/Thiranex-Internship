import React, { useState, useEffect } from 'react';
import { Key, Shield, ShieldCheck, Smartphone, Copy, Check, ArrowRight, UserCheck, Sparkles, Clock } from 'lucide-react';
import { api } from '../api';
import { DemoAccount, User, SessionInfo } from '../types';

interface DemoAccountsCardProps {
  onAutoLogin: (account: DemoAccount) => void;
}

export const DemoAccountsCard: React.FC<DemoAccountsCardProps> = ({ onAutoLogin }) => {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [copiedPass, setCopiedPass] = useState<string | null>(null);

  // Mock synchronized TOTP code for Bob demo account
  const [bobTotpCode, setBobTotpCode] = useState('123456');
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  const fetchAccounts = () => {
    api.getDemoAccounts().then((data) => {
      setAccounts(data.accounts);
      const bob = data.accounts.find((a) => a.email === 'bob@defense.gov');
      if (bob?.currentTotp) {
        setBobTotpCode(bob.currentTotp);
      }
    }).catch(console.error);
  };

  useEffect(() => {
    fetchAccounts();

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setSecondsRemaining(remaining);
      // When step completes, refresh server token
      if (remaining === 30 || remaining === 1) {
        fetchAccounts();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPass(id);
    setTimeout(() => setCopiedPass(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-center gap-3.5 mb-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Pre-Configured Demo Accounts</h1>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Instant Evaluation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Jump straight into evaluating user roles, 2FA workflows, and session revocation
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alice */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  AL
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Alice Security Tester</h3>
                  <span className="text-xs text-slate-400">Standard User • Clean Slate</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded bg-slate-800 text-slate-300">
                2FA: Not Active
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Standard user account with 2FA initially disabled. Perfect for testing the interactive 2FA setup flow,
              scanning the real QR code with your phone, generating backup codes, and testing password change.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-cyan-300">alice@example.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200">Aegis!Pass2026</span>
                  <button
                    onClick={() => handleCopy('Aegis!Pass2026', 'alice')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedPass === 'alice' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              onAutoLogin({
                email: 'alice@example.com',
                username: 'alice_sec',
                password: 'Aegis!Pass2026',
                role: 'user',
                has2FA: false,
                note: '',
              })
            }
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Auto-Fill &amp; Sign In as Alice</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bob */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  BO
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Bob Defense Officer</h3>
                  <span className="text-xs text-slate-400">System Admin • 2FA Enforced</span>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                2FA: Enforced
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Admin account with Two-Factor Authentication actively enforced. Logging in as Bob triggers the mandatory
              secondary 2FA challenge screen.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-cyan-300">bob@defense.gov</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200">Vault#2026Secure</span>
                  <button
                    onClick={() => handleCopy('Vault#2026Secure', 'bob')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedPass === 'bob' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Virtual Authenticator Widget for Bob */}
            <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-semibold text-cyan-300 block">Bob's 2FA Helper</span>
                  <span className="text-[10px] text-slate-400">Refreshes in {secondsRemaining}s</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-cyan-200 tracking-wider">{bobTotpCode}</span>
                <button
                  onClick={() => handleCopy(bobTotpCode, 'bob_totp')}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Copy 2FA code"
                >
                  {copiedPass === 'bob_totp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              onAutoLogin({
                email: 'bob@defense.gov',
                username: 'bob_agent',
                password: 'Vault#2026Secure',
                role: 'admin',
                has2FA: true,
                note: '',
              })
            }
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Auto-Fill &amp; Sign In as Bob (Triggers 2FA)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
