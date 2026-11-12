import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { TwoFactorChallenge } from './components/TwoFactorChallenge';
import { Dashboard } from './components/Dashboard';
import { SqlInjectionLab } from './components/SqlInjectionLab';
import { AuditLogViewer } from './components/AuditLogViewer';
import { DemoAccountsCard } from './components/DemoAccountsCard';
import { SecurityArchitectureDoc } from './components/SecurityArchitectureDoc';
import { GitHubModal } from './components/GitHubModal';
import { api, getStoredToken } from './api';
import { User, SessionInfo, DemoAccount } from './types';
import { Shield, Lock, Terminal, Activity, Key, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'auth' | 'dashboard' | 'sqli-lab' | 'audit' | 'architecture' | 'demo'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'register' | '2fa-challenge'>('login');

  // 2FA Challenge state
  const [pending2FA, setPending2FA] = useState<{
    challengeToken: string;
    email: string;
    maskedEmail: string;
  } | null>(null);

  // Check initial authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.getMe();
        setUser(data.user);
        setSession(data.session);
        setActiveTab('dashboard');
      } catch {
        // Not authenticated
        setUser(null);
        setSession(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (authenticatedUser: User, activeSession: SessionInfo) => {
    setUser(authenticatedUser);
    setSession(activeSession);
    setPending2FA(null);
    setAuthMode('login');
    setActiveTab('dashboard');
  };

  const handleRequire2FA = (challengeToken: string, email: string, maskedEmail: string) => {
    setPending2FA({ challengeToken, email, maskedEmail });
    setAuthMode('2fa-challenge');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setPending2FA(null);
      setAuthMode('login');
      setActiveTab('auth');
    }
  };

  const handleAutoLoginDemo = async (account: DemoAccount) => {
    setActiveTab('auth');
    setAuthMode('login');
    setIsLoadingAuth(true);

    try {
      const res = await api.login({
        emailOrUsername: account.email,
        password: account.password,
      });

      if (res.requires2FA && res.challengeToken && res.email) {
        handleRequire2FA(res.challengeToken, res.email, res.maskedEmail || res.email);
      } else if (res.user && res.session) {
        handleLoginSuccess(res.user, res.session);
      }
    } catch (err) {
      console.error('Auto login failed:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 animate-pulse">
          <Shield className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono text-slate-400">Verifying Cryptographic Session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[300px] bg-cyan-500/5 blur-[140px] rounded-full"></div>
      </div>

      {/* Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'dashboard' && !user) {
            setActiveTab('auth');
            return;
          }
          if (tab === 'auth' && user) {
            setActiveTab('dashboard');
            return;
          }
          setActiveTab(tab);
        }}
        onLogout={handleLogout}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 relative z-10 py-6 sm:py-8">
        {activeTab === 'auth' && (
          <div className="px-4 py-4 sm:py-8">
            {authMode === 'login' && (
              <LoginForm
                onSuccess={handleLoginSuccess}
                onRequire2FA={handleRequire2FA}
                onSwitchToRegister={() => setAuthMode('register')}
              />
            )}
            {authMode === 'register' && (
              <RegisterForm
                onSuccess={handleLoginSuccess}
                onSwitchToLogin={() => setAuthMode('login')}
              />
            )}
            {authMode === '2fa-challenge' && pending2FA && (
              <TwoFactorChallenge
                challengeToken={pending2FA.challengeToken}
                email={pending2FA.email}
                maskedEmail={pending2FA.maskedEmail}
                onSuccess={handleLoginSuccess}
                onCancel={() => {
                  setPending2FA(null);
                  setAuthMode('login');
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'dashboard' && user && session && (
          <Dashboard
            user={user}
            session={session}
            onUserUpdated={(updated) => setUser(updated)}
            onLogout={handleLogout}
            onNavigateToSqli={() => setActiveTab('sqli-lab')}
          />
        )}

        {activeTab === 'sqli-lab' && <SqlInjectionLab />}

        {activeTab === 'audit' && <AuditLogViewer />}

        {activeTab === 'demo' && <DemoAccountsCard onAutoLogin={handleAutoLoginDemo} />}

        {activeTab === 'architecture' && <SecurityArchitectureDoc />}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-400">AegisLock Defense Engine</span>
            <span>•</span>
            <span>Bcrypt 12 Rounds</span>
            <span>•</span>
            <span>Parameterized Prepared Statements</span>
            <span>•</span>
            <span>RFC 6238 TOTP</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('sqli-lab')}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Test SQLi Lab
            </button>
            <button
              onClick={() => setActiveTab('demo')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Demo Logins
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Architecture
            </button>
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer font-medium"
            >
              Push to GitHub
            </button>
          </div>
        </div>
      </footer>

      {/* GitHub Guide Modal */}
      <GitHubModal isOpen={isGitHubModalOpen} onClose={() => setIsGitHubModalOpen(false)} />
    </div>
  );
}
