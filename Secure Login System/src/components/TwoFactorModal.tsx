import React, { useState, useEffect } from 'react';
import { X, QrCode, Copy, Check, ShieldCheck, Download, AlertTriangle, Key } from 'lucide-react';
import { api } from '../api';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  on2FAEnabled: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ isOpen, onClose, on2FAEnabled }) => {
  const [step, setStep] = useState<'scan' | 'backup-codes'>('scan');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSetupData();
    } else {
      // reset
      setStep('scan');
      setVerifyCode('');
      setErrorMessage(null);
      setBackupCodes([]);
    }
  }, [isOpen]);

  const loadSetupData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.setup2FA();
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeDataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize 2FA configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    const text = `AEGISLOCK 2FA EMERGENCY BACKUP RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\nKeep these codes safe and offline. Each code can be used once.\n\n${backupCodes.join('\n')}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aegislock-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.enable2FA({ secret, code: verifyCode.trim() });
      setBackupCodes(res.backupCodes);
      setStep('backup-codes');
      on2FAEnabled();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to verify code. Please make sure the code is current.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'scan' ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Enable Two-Factor Authentication</h3>
                <p className="text-xs text-slate-400">TOTP (RFC 6238) standard security layer</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {isLoading && !qrCodeUrl ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400">Generating cryptographic keypair...</span>
              </div>
            ) : (
              <div>
                <ol className="space-y-4 text-xs text-slate-300 mb-6">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>
                      Scan this QR code with <strong>Google Authenticator</strong>, <strong>1Password</strong>, or any TOTP app:
                    </span>
                  </li>

                  {/* QR Code Canvas/Image */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    {qrCodeUrl && (
                      <div className="p-2 bg-white rounded-xl shadow-lg">
                        <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
                      </div>
                    )}
                    <div className="text-left space-y-2 flex-1">
                      <span className="text-[11px] text-slate-400 block font-medium">Or enter key manually:</span>
                      <div className="p-2 bg-slate-900 border border-slate-700/80 rounded-lg flex items-center justify-between font-mono text-[11px] text-cyan-300 break-all">
                        <span>{secret}</span>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="ml-2 p-1 text-slate-400 hover:text-white shrink-0"
                          title="Copy Secret"
                        >
                          {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Type: TOTP • Algorithm: SHA-1 • Digits: 6 • Period: 30s
                      </span>
                    </div>
                  </div>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span>Confirm by typing the current 6-digit code from your app:</span>
                  </li>
                </ol>

                <form onSubmit={handleConfirmEnable} className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      inputMode="numeric"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="flex-1 py-2.5 px-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-center text-lg tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || verifyCode.length < 6}
                      className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify &amp; Activate</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Backup Codes */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">2FA Activated Successfully!</h3>
                <p className="text-xs text-slate-400">Save your Emergency Backup Recovery Codes</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5 mb-5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <p>
                If you ever lose access to your authenticator device, each of these 8 codes can be used exactly once to log in. Store them in a secure password manager or offline file.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 mb-5">
              {backupCodes.map((code, index) => (
                <div key={index} className="p-2 bg-slate-900/80 rounded-lg text-center tracking-wider border border-slate-800/80">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2.5 justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyBackupCodes}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCodes ? 'Copied!' : 'Copy All'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCodes}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-emerald-500/20"
              >
                I Have Saved My Codes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
