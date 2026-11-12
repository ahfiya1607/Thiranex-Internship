import React, { useState } from 'react';
import { Terminal, Shield, ShieldAlert, ShieldCheck, Play, Sparkles, AlertTriangle, ArrowRight, Code, Database, Info } from 'lucide-react';
import { api } from '../api';
import { SqlSimulationResult } from '../types';

export const SqlInjectionLab: React.FC = () => {
  const [payload, setPayload] = useState("' OR '1'='1");
  const [executionMode, setExecutionMode] = useState<'vulnerable' | 'parameterized'>('parameterized');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SqlSimulationResult | null>(null);

  const presets = [
    {
      name: "Tautology Bypass (' OR '1'='1)",
      payload: "' OR '1'='1",
      description: "Forces WHERE clause expression to evaluate to true, dumping entire database table.",
    },
    {
      name: "Comment Truncation (admin'--)",
      payload: "admin'--",
      description: "Comments out subsequent password verification tokens in unescaped SQL.",
    },
    {
      name: "Numeric Tautology (' OR 1=1--)",
      payload: "' OR 1=1--",
      description: "Numeric boolean comparison bypassing string quote boundaries.",
    },
    {
      name: "Stacked Destructive Query ('; DROP TABLE...)",
      payload: "'; DROP TABLE users;--",
      description: "Appends secondary DDL query to wipe data if multiple queries are allowed.",
    },
    {
      name: "Union-based Extraction (' UNION SELECT...)",
      payload: "' UNION SELECT id, email, username, role FROM users--",
      description: "Appends union query results to exfiltrate schema and unauthorized records.",
    },
  ];

  const handleRunSimulation = async (modeOverride?: 'vulnerable' | 'parameterized') => {
    const targetMode = modeOverride || executionMode;
    setIsRunning(true);
    try {
      const data = await api.testSqlInjection(payload, targetMode);
      setResult(data);
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">SQL Injection Defense Lab</h1>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Interactive Sandbox
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare unescaped string concatenation vs AegisLock's secure prepared statements
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => {
                setExecutionMode('parameterized');
                if (result) handleRunSimulation('parameterized');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                executionMode === 'parameterized'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>AegisLock Parameterized (Safe)</span>
            </button>
            <button
              onClick={() => {
                setExecutionMode('vulnerable');
                if (result) handleRunSimulation('vulnerable');
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                executionMode === 'vulnerable'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Vulnerable Concatenation (Demo)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Attacks & Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presets List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Attack Vector Presets
          </span>
          <div className="space-y-2">
            {presets.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPayload(item.payload);
                  setResult(null);
                }}
                className={`w-full p-2.5 rounded-xl text-left text-xs transition-colors border flex flex-col ${
                  payload === item.payload
                    ? 'bg-slate-800 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="font-semibold">{item.name}</span>
                <span className="font-mono text-[11px] text-slate-400 mt-0.5 truncate">{item.payload}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input & Simulation Runner */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Test Input Payload (Simulated Email Input)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  placeholder="Enter SQL attack payload..."
                  className="w-full py-2.5 px-3.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-sm text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Visual SQL Assembly */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">
                {executionMode === 'parameterized' ? 'Driver Statement Blueprint:' : 'Raw Unsanitized Query String:'}
              </span>
              {executionMode === 'parameterized' ? (
                <div>
                  <p className="text-slate-300">
                    <span className="text-purple-400">SELECT</span> id, email, username, role <span className="text-purple-400">FROM</span> users <span className="text-purple-400">WHERE</span> email = <span className="text-emerald-400">?</span>;
                  </p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Bound Parameters: <span className="text-cyan-300">["{payload}"]</span>
                  </p>
                </div>
              ) : (
                <p className="text-slate-300 break-all">
                  <span className="text-purple-400">SELECT</span> id, email, username, role <span className="text-purple-400">FROM</span> users <span className="text-purple-400">WHERE</span> email = '<span className="text-rose-400 font-bold">{payload}</span>';
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Active mode:{' '}
              <strong className={executionMode === 'parameterized' ? 'text-emerald-400' : 'text-rose-400'}>
                {executionMode === 'parameterized' ? 'Safe Parameterized' : 'Vulnerable String Concatenation'}
              </strong>
            </span>

            <button
              onClick={() => handleRunSimulation()}
              disabled={isRunning || !payload.trim()}
              className={`px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                executionMode === 'parameterized'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? 'Analyzing...' : 'Execute Payload'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Result Presentation */}
      {result && (
        <div
          className={`border rounded-2xl p-6 sm:p-7 shadow-xl animate-fade-in ${
            result.vulnerabilityStatus === 'EXPLOITED'
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
              : result.vulnerabilityStatus === 'ATTACK_NEUTRALIZED'
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
              : 'bg-slate-900 border-slate-800 text-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {result.vulnerabilityStatus === 'EXPLOITED' ? (
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-white">
                    {result.vulnerabilityStatus === 'EXPLOITED'
                      ? 'Security Breach: SQL Injection Successful'
                      : 'Defense Successful: Attack Neutralized'}
                  </h3>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      result.vulnerabilityStatus === 'EXPLOITED'
                        ? 'bg-rose-500 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {result.vulnerabilityStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{result.explanation}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Matched Records</span>
              <span className="text-2xl font-extrabold text-white">{result.resultsCount}</span>
            </div>
          </div>

          {/* Records Table or Empty notice */}
          {result.resultsCount > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                {result.vulnerabilityStatus === 'EXPLOITED'
                  ? 'CRITICAL LEAK: Attacker accessed unauthorized records without credentials:'
                  : 'Database returned matched record:'}
              </div>
              <table className="w-full text-left text-xs bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  {result.results.map((u, i) => (
                    <tr key={i} className="hover:bg-slate-900/50">
                      <td className="p-3 text-slate-500 truncate max-w-[120px]">{u.id}</td>
                      <td className="p-3 text-cyan-300 font-semibold">{u.email}</td>
                      <td className="p-3 text-slate-300">{u.username}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 uppercase text-[10px]">
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400">
              Zero records returned. The database driver looked for a user whose exact email literally matched{' '}
              <code className="text-emerald-300">"{result.inputPassed}"</code>. Because no such user exists, the query safely
              failed to find any record, completely neutralizing the attack attempt.
            </div>
          )}
        </div>
      )}

      {/* Educational Deep Dive */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          <span>Why Parameterized Prepared Statements Prevent 100% of SQL Injections</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <h4 className="font-semibold text-rose-400 mb-1">Vulnerable String Interpolation</h4>
            <p>
              When an app builds SQL with concatenation (<code>`WHERE email = '${'{input}'}'`</code>), user input is sent directly into the database's SQL syntax parser.
              Quotes entered by an attacker trick the parser into changing the query structure (Abstract Syntax Tree), turning user data into executable control flow logic.
            </p>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <h4 className="font-semibold text-emerald-400 mb-1">AegisLock Parameterized Queries</h4>
            <p>
              With prepared statements (<code>`WHERE email = ?`</code>, <code>[input]</code>), the SQL engine pre-compiles the query template first.
              The parameters are passed in a separate protocol packet and treated strictly as literal data values. Even if the input contains quotes, semicolons, or comments, they cannot alter the query's grammatical execution plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
