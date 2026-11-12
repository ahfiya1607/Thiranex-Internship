import React from 'react';
import { Shield, Key, Database, Smartphone, Lock, CheckCircle2, Cpu, Server } from 'lucide-react';

export const SecurityArchitectureDoc: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Security Architecture &amp; Threat Defense</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographic implementations protecting against OWASP Top 10 vulnerabilities
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Password Hashing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Adaptive Password Hashing</h3>
              <span className="text-[11px] text-emerald-400 font-mono">bcrypt (Cost 12) &amp; Argon2 Architecture</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Fast hashing algorithms (MD5, SHA-1, SHA-256) are designed for speed and can compute billions of guesses per second on consumer GPUs.
            AegisLock enforces <strong>bcrypt</strong> with an adaptive work factor of <strong>12 rounds</strong> (4,096 cryptographic iterations).
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5 text-slate-400">
            <div className="text-[11px] text-slate-500 uppercase">Bcrypt Hash Structure Breakdown:</div>
            <div className="p-2 bg-slate-900 rounded border border-slate-800/80 text-cyan-300 break-all text-[11px]">
              <span className="text-emerald-400">$2a</span>
              <span className="text-slate-500">$</span>
              <span className="text-amber-400">12</span>
              <span className="text-slate-500">$</span>
              <span className="text-purple-400">N3aM43PqmI2uV1O2f1sI0.</span>
              <span className="text-cyan-400">eRz32uJ7359Y5G.9aW6H8uG7M.6/8O.</span>
            </div>
            <div className="text-[10px] space-y-0.5 pt-1 text-slate-400">
              <p><strong className="text-emerald-400">$2a</strong>: Bcrypt revision identifier</p>
              <p><strong className="text-amber-400">12</strong>: 2^12 cost factor (exponential computational work)</p>
              <p><strong className="text-purple-400">Salt</strong>: 128-bit CSPRNG salt neutralizing rainbow tables</p>
              <p><strong className="text-cyan-400">Digest</strong>: 184-bit ciphertext digest</p>
            </div>
          </div>
        </div>

        {/* Pillar 2: SQL Injection Defense */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">SQL Injection Neutralization</h3>
              <span className="text-[11px] text-cyan-400 font-mono">Parameterized Prepared Statements</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            SQL Injection occurs when untrusted input is interpolated into query strings.
            AegisLock completely separates the SQL grammar compilation stage from parameter binding.
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 text-[11px]">
                <strong>Pre-compiled AST:</strong> The database engine compiles query logic prior to evaluating user input.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 text-[11px]">
                <strong>Literal Type Isolation:</strong> Payload markers (<code className="text-cyan-400">?</code>) bind strings as raw scalar values, making quote escaping syntax exploits mathematically impossible.
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Two-Factor Authentication */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Two-Factor Authentication (2FA)</h3>
              <span className="text-[11px] text-purple-400 font-mono">RFC 6238 TOTP &amp; One-Time Backup Codes</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Standard password authentication is vulnerable to phishing and keystroke loggers.
            AegisLock integrates RFC 6238 Time-Based One-Time Passwords (compatible with Google Authenticator, Authy, Apple Passwords)
            utilizing HMAC-SHA1 over 30-second epoch intervals.
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 text-[11px]">
                <strong>Clock Drift Tolerance:</strong> Supports +/- 1 step window to gracefully handle device time disparities.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 text-[11px]">
                <strong>Hashed Backup Codes:</strong> 8 single-use recovery codes stored as SHA-256 digests; destroyed immediately on consumption.
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 4: Session Security & Brute-Force Defense */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Session Lifecycle &amp; Brute Force Guard</h3>
              <span className="text-[11px] text-amber-400 font-mono">CSPRNG Tokens &amp; Exponential Lockouts</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Sessions are minted with 256-bit cryptographically secure pseudorandom numbers (<code className="text-amber-300">crypto.randomBytes(32)</code>),
            preventing session prediction or collision.
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 text-[11px]">
                <strong>5-Attempt Account Lockout:</strong> Enforces progressive delay and temporary 15-minute lockouts against dictionary attacks.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-slate-300 text-[11px]">
                <strong>Fine-Grained Invalidation:</strong> Immediate revocation of stolen sessions without affecting legitimate active devices.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
