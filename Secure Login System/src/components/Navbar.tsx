import React from 'react';
import { Shield, Lock, Terminal, Activity, Key, LogOut, User as UserIcon, CheckCircle } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: 'auth' | 'dashboard' | 'sqli-lab' | 'audit' | 'architecture' | 'demo';
  setActiveTab: (tab: 'auth' | 'dashboard' | 'sqli-lab' | 'audit' | 'architecture' | 'demo') => void;
  onLogout: () => void;
  onOpenGitHubModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, activeTab, setActiveTab, onLogout, onOpenGitHubModal }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab(user ? 'dashboard' : 'auth')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">AegisLock</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v2.6 Secure
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Identity &amp; Access Protection Suite</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {user ? (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'auth'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Sign In / Register
              </button>
            )}

            <button
              onClick={() => setActiveTab('sqli-lab')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                activeTab === 'sqli-lab'
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>SQLi Defense Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                activeTab === 'audit'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => setActiveTab('demo')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors ${
                activeTab === 'demo'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>Demo Accounts</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'architecture'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              Architecture
            </button>
          </nav>

          {/* Right Action / User State & GitHub button */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onOpenGitHubModal}
              title="Push to GitHub instructions"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-full py-1 px-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-200 max-w-[100px] truncate">
                    {user.username}
                  </span>
                  {user.two_factor_enabled && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                      2FA
                    </span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  title="Logout current session"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                Access Portal
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-900 text-xs text-slate-400 overflow-x-auto space-x-2">
          <button
            onClick={() => setActiveTab(user ? 'dashboard' : 'auth')}
            className={`py-1 px-2.5 rounded whitespace-nowrap ${
              activeTab === 'auth' || activeTab === 'dashboard' ? 'text-emerald-400 bg-slate-900 font-semibold' : ''
            }`}
          >
            {user ? 'Dashboard' : 'Sign In'}
          </button>
          <button
            onClick={() => setActiveTab('sqli-lab')}
            className={`py-1 px-2.5 rounded whitespace-nowrap ${
              activeTab === 'sqli-lab' ? 'text-emerald-400 bg-slate-900 font-semibold' : ''
            }`}
          >
            SQLi Lab
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-1 px-2.5 rounded whitespace-nowrap ${
              activeTab === 'audit' ? 'text-emerald-400 bg-slate-900 font-semibold' : ''
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            className={`py-1 px-2.5 rounded whitespace-nowrap ${
              activeTab === 'demo' ? 'text-emerald-400 bg-slate-900 font-semibold' : ''
            }`}
          >
            Demo Accounts
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-1 px-2.5 rounded whitespace-nowrap ${
              activeTab === 'architecture' ? 'text-emerald-400 bg-slate-900 font-semibold' : ''
            }`}
          >
            Architecture
          </button>
        </div>
      </div>
    </header>
  );
};
