import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, CheckCircle2, FolderPlus, GitBranch, Terminal, Send, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../api';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'automated' | 'manual-subfolder' | 'manual-root'>('automated');

  // Automated Push State
  const [repoUrl, setRepoUrl] = useState('');
  const [personalAccessToken, setPersonalAccessToken] = useState('');
  const [targetFolder, setTargetFolder] = useState('secure-login-system');
  const [branch, setBranch] = useState('main');
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual Customization State
  const [folderName, setFolderName] = useState('secure-login-system');
  const [existingRepoPath, setExistingRepoPath] = useState('my-existing-repo');
  const [username, setUsername] = useState('your-github-username');
  const [standaloneRepoName, setStandaloneRepoName] = useState('secure-login-system');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleAutomatedPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || !personalAccessToken.trim()) {
      setPushStatus({ type: 'error', message: 'Please provide both your GitHub Repository URL and Personal Access Token.' });
      return;
    }

    setIsPushing(true);
    setPushStatus(null);

    try {
      const res = await api.pushToGitHub({
        repoUrl: repoUrl.trim(),
        personalAccessToken: personalAccessToken.trim(),
        targetFolder: targetFolder.trim(),
        branch: branch.trim() || 'main',
        commitMessage: `feat: add AegisLock secure login system into ${targetFolder.trim() || 'root'}`,
      });

      setPushStatus({ type: 'success', message: res.message });
    } catch (err: any) {
      setPushStatus({
        type: 'error',
        message: err.message || 'Push failed. Please verify your token has "repo" permissions and the URL is correct.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const subfolderManualCommand = `# 1. Go into your existing repository on your machine:\ncd ${existingRepoPath}\n\n# 2. Create the target subfolder:\nmkdir -p ${folderName}\n\n# 3. Copy the project files into the folder (excluding .git folder)\n\n# 4. Stage and commit the new subfolder:\ngit add ${folderName}/\ngit commit -m "feat: add secure login system into ${folderName}/"\n\n# 5. Push to your existing GitHub repo:\ngit push origin main`;

  const rootManualCommand = `git remote add origin https://github.com/${username}/${standaloneRepoName}.git\ngit branch -M main\ngit push -u origin main`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shrink-0">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Add to GitHub</h2>
            <p className="text-xs text-slate-400">
              Automatic 1-click push to any GitHub repo subfolder, or manual CLI instructions
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('automated')}
            className={`py-2 px-3.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'automated'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Auto-Push (Enter Repo &amp; Token)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual-subfolder')}
            className={`py-2 px-3.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'manual-subfolder'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Manual Subfolder Commands</span>
          </button>
          <button
            onClick={() => setActiveTab('manual-root')}
            className={`py-2 px-3.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'manual-root'
                ? 'border-purple-400 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Manual Standalone Repo</span>
          </button>
        </div>

        {/* TAB 1: AUTOMATED PUSH VIA API */}
        {activeTab === 'automated' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-300">
              <span className="font-semibold block mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Automated 1-Click Push into Any Folder
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Provide your GitHub repository URL and a temporary Personal Access Token. The server will clone your repo, create your target subfolder, commit the files, and push directly to GitHub for you!
              </p>
            </div>

            {pushStatus && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                  pushStatus.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {pushStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{pushStatus.message}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleAutomatedPush} className="space-y-3.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  GitHub Repository URL
                </label>
                <input
                  type="text"
                  required
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/your-username/your-existing-repo"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    Target Folder Inside Repo
                  </label>
                  <input
                    type="text"
                    value={targetFolder}
                    onChange={(e) => setTargetFolder(e.target.value)}
                    placeholder="secure-login-system"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    e.g. <code>secure-login-system</code> or leave blank for root
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    Target Branch
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=AegisLock+Push+Token"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>Generate token on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={personalAccessToken}
                  onChange={(e) => setPersonalAccessToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Requires <code>repo</code> scope to commit &amp; push. Token is never logged or saved permanently.
                </span>
              </div>

              <button
                type="submit"
                disabled={isPushing || !repoUrl || !personalAccessToken}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPushing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>Pushing to GitHub ({targetFolder || 'root'})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Push to My GitHub Repo Now</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: MANUAL SUBFOLDER CLI */}
        {activeTab === 'manual-subfolder' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <span className="font-semibold text-slate-200 block text-xs">
                Customize your folder and repo names:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Existing Repo Local Directory</label>
                  <input
                    type="text"
                    value={existingRepoPath}
                    onChange={(e) => setExistingRepoPath(e.target.value.trim())}
                    placeholder="my-existing-repo"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Subfolder Destination Name</label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value.trim())}
                    placeholder="secure-login-system"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-200 text-sm">
                  Run these commands in your local terminal:
                </span>
                <button
                  onClick={() => copyToClipboard(subfolderManualCommand, 1)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 1 ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 space-y-1">
                <pre className="whitespace-pre-wrap">{subfolderManualCommand}</pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANUAL STANDALONE ROOT REPO */}
        {activeTab === 'manual-root' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">GitHub Username / Org</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    placeholder="your-username"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Repository Name</label>
                  <input
                    type="text"
                    value={standaloneRepoName}
                    onChange={(e) => setStandaloneRepoName(e.target.value.trim())}
                    placeholder="secure-login-system"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-200 text-sm">
                  Run in terminal:
                </span>
                <button
                  onClick={() => copyToClipboard(rootManualCommand, 2)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 2 ? 'Copied!' : 'Copy Command'}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-purple-300 space-y-2">
                <pre className="whitespace-pre-wrap">{rootManualCommand}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
