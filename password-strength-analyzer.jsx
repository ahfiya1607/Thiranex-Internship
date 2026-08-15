import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Check, X, Copy, Shuffle, ShieldCheck, Trash2, Clock, KeyRound } from 'lucide-react';

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const COMMON_PASSWORDS = new Set([
  '123456','123456789','qwerty','password','12345','12345678','111111','1234567',
  '1234567890','123123','abc123','1234','password1','iloveyou','1q2w3e4r','000000',
  'qwerty123','zaq12wsx','dragon','sunshine','princess','letmein','654321','monkey',
  '1qaz2wsx','121212','qazwsx','football','master','666666','fuckyou','123321',
  'access','flower','555555','232323','charlie','aa123456','donald','password123',
  'qwertyuiop','solo','starwars','freedom','whatever','trustno1','hello','shadow',
  'ashley','michael','jennifer','hunter','jordan','superman','harley','ranger',
  'daniel','hannah','summer','george','joshua','maggie','matrix','cheese','amanda',
  'nicole','chelsea','biteme','matthew','robert','danielle','forever','family',
  'jasmine','ginger','hammer','silver','222222','asdfgh','987654321','zxcvbnm',
  'asdf','admin','welcome','login','1111','p@ssw0rd','p@ssword','iloveyou1',
  'monkey123','football1','baseball','dragon123','master123','qwerty1','123qwe',
  'q1w2e3r4','1qaz2wsx3edc','changeme','default','guest','test123','welcome1',
  'letme1n','passw0rd',
]);

const WORD_LIST = [
  'granite','harbor','lantern','copper','willow','ember','quartz','meadow','falcon',
  'cinder','maple','tundra','beacon','clover','marble','ridge','cobalt','thistle',
  'anchor','summit','violet','orbit','canyon','ripple','frost','onyx','sable',
  'birch','plateau','juniper',
];

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
const SEQ_ALPHABETS = ['abcdefghijklmnopqrstuvwxyz', '0123456789'];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function secureRandomInt(max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hasKeyboardWalk(lower) {
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i <= row.length - 4; i++) {
      const fwd = row.slice(i, i + 4);
      const rev = fwd.split('').reverse().join('');
      if (lower.includes(fwd) || lower.includes(rev)) return true;
    }
  }
  return false;
}

function hasSequentialRun(lower) {
  for (const s of SEQ_ALPHABETS) {
    for (let i = 0; i <= s.length - 4; i++) {
      const fwd = s.slice(i, i + 4);
      const rev = fwd.split('').reverse().join('');
      if (lower.includes(fwd) || lower.includes(rev)) return true;
    }
  }
  return false;
}

function humanizeSeconds(s) {
  if (s < 1) return 'instantly';
  const units = [
    ['century', 3153600000],
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [name, secs] of units) {
    if (s >= secs) {
      const val = Math.round(s / secs);
      if (name === 'century' && val > 1000) return 'billions of years';
      return `${val.toLocaleString()} ${name}${val !== 1 ? 's' : ''}`;
    }
  }
  return 'instantly';
}

function estimateCrackTime(entropyBits) {
  const guessesPerSecond = 1e10; // rough offline-attack benchmark
  const combinations = Math.pow(2, entropyBits);
  const seconds = combinations / guessesPerSecond / 2;
  return humanizeSeconds(seconds);
}

function analyzePassword(password, isReused) {
  if (!password) return null;

  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const lower = password.toLowerCase();

  let charsetSize = 0;
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSymbol) charsetSize += 32;
  const entropy = charsetSize > 0 ? +(length * Math.log2(charsetSize)).toFixed(1) : 0;

  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  const isCommon = COMMON_PASSWORDS.has(lower);
  const sequential = hasSequentialRun(lower);
  const keyboardWalk = hasKeyboardWalk(lower);
  const repeated = /(.)\1{2,}/.test(password);

  let score;
  if (entropy >= 80) score = 92;
  else if (entropy >= 60) score = 78;
  else if (entropy >= 45) score = 62;
  else if (entropy >= 28) score = 42;
  else score = 18;

  if (length < 8) score = Math.min(score, 22);
  if (length >= 16) score += 6;
  if (varietyCount <= 1) score = Math.min(score, 15);
  if (isCommon) score = Math.min(score, 4);
  if (sequential) score -= 14;
  if (keyboardWalk) score -= 14;
  if (repeated) score -= 10;
  if (isReused) score = Math.min(score, 20);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier;
  if (score < 20) tier = { label: 'Very weak', text: 'text-red-400', bar: 'bg-red-500' };
  else if (score < 40) tier = { label: 'Weak', text: 'text-orange-400', bar: 'bg-orange-500' };
  else if (score < 60) tier = { label: 'Fair', text: 'text-amber-400', bar: 'bg-amber-500' };
  else if (score < 80) tier = { label: 'Good', text: 'text-lime-400', bar: 'bg-lime-500' };
  else tier = { label: 'Strong', text: 'text-emerald-400', bar: 'bg-emerald-500' };

  const checks = [
    { label: 'At least 12 characters', pass: length >= 12 },
    { label: 'Contains lowercase letters', pass: hasLower },
    { label: 'Contains uppercase letters', pass: hasUpper },
    { label: 'Contains a number', pass: hasDigit },
    { label: 'Contains a symbol', pass: hasSymbol },
    { label: 'Not a commonly used password', pass: !isCommon },
    { label: 'No sequential runs (abcd, 1234)', pass: !sequential },
    { label: 'No keyboard-walk patterns (qwerty)', pass: !keyboardWalk },
    { label: 'No repeated characters (aaa)', pass: !repeated },
    { label: 'Not reused (device history)', pass: !isReused },
  ];

  const suggestions = [];
  if (isCommon) suggestions.push('This is one of the most-leaked passwords on the internet — pick something no one has used before.');
  if (isReused) suggestions.push("You've saved this exact password before — choose a new one instead of reusing it.");
  if (length < 12) suggestions.push(`Add ${12 - length} more character${12 - length === 1 ? '' : 's'} — length matters more than complexity.`);
  if (!hasUpper) suggestions.push('Mix in an uppercase letter.');
  if (!hasSymbol) suggestions.push('Add a symbol like ! # $ or %.');
  if (!hasDigit) suggestions.push('Add a number somewhere other than the end.');
  if (sequential) suggestions.push('Avoid predictable runs like "abcd" or "1234".');
  if (keyboardWalk) suggestions.push('Avoid keyboard walks like "qwerty" or "asdf".');
  if (repeated) suggestions.push('Avoid repeating the same character three or more times.');
  if (suggestions.length === 0) suggestions.push('Solid password. Consider a password manager so you never have to reuse or remember it.');

  return { score, tier, entropy, checks, suggestions, crackTime: estimateCrackTime(entropy) };
}

function randomStrongPassword(length = 16) {
  const sets = ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', '!@#$%^&*()-_=+?'];
  let chars = sets.map((set) => set[secureRandomInt(set.length)]);
  const all = sets.join('');
  while (chars.length < length) chars.push(all[secureRandomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function strengthenPassword(original) {
  if (!original) return randomStrongPassword(16);
  const subs = { a: '@', A: '@', o: '0', O: '0', i: '1', I: '1', e: '3', E: '3', s: '$', S: '$' };
  let chars = original.split('');
  let substituted = false;
  for (let i = 0; i < chars.length && !substituted; i++) {
    if (subs[chars[i]]) {
      chars[i] = subs[chars[i]];
      substituted = true;
    }
  }
  let s = chars.join('');
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[0-9]/.test(s)) s += secureRandomInt(10);
  if (!/[^a-zA-Z0-9]/.test(s)) s += '!@#$%^&*'[secureRandomInt(8)];
  const filler = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  while (s.length < 14) s += filler[secureRandomInt(filler.length)];
  return s;
}

function generatePassphrase() {
  const chosen = Array.from({ length: 4 }, () => WORD_LIST[secureRandomInt(WORD_LIST.length)]);
  const capped = chosen.map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const num = secureRandomInt(90) + 10;
  const symbols = '!@#$%&*';
  return `${capped.join('-')}-${num}${symbols[secureRandomInt(symbols.length)]}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PasswordStrengthAnalyzer() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [liveHash, setLiveHash] = useState('');
  const [history, setHistory] = useState([]);
  const [isReused, setIsReused] = useState(false);
  const [toast, setToast] = useState('');
  const [altResult, setAltResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const toastTimer = useRef(null);
  const hashTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get('password-history-hashes', false);
        if (!cancelled && res?.value) setHistory(JSON.parse(res.value));
      } catch (e) {
        // nothing saved yet
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hashTimer.current) clearTimeout(hashTimer.current);
    if (!password) {
      setLiveHash('');
      setIsReused(false);
      return;
    }
    hashTimer.current = setTimeout(async () => {
      try {
        const hash = await sha256Hex(password);
        setLiveHash(hash);
        setIsReused(history.some((h) => h.hash === hash));
      } catch (e) {
        setLiveHash('');
      }
    }, 250);
    return () => clearTimeout(hashTimer.current);
  }, [password, history]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  const handleSave = async () => {
    if (!password || !liveHash) return;
    const entry = { hash: liveHash, savedAt: new Date().toISOString() };
    const next = [entry, ...history.filter((h) => h.hash !== liveHash)].slice(0, 5);
    try {
      await window.storage.set('password-history-hashes', JSON.stringify(next), false);
      setHistory(next);
      showToast("Saved to this device's history.");
    } catch (e) {
      showToast('Could not save — storage unavailable.');
    }
  };

  const handleClearHistory = async () => {
    try {
      await window.storage.delete('password-history-hashes', false);
    } catch (e) {
      // ignore
    }
    setHistory([]);
    showToast('History cleared.');
  };

  const handleGenerate = (type) => {
    let value;
    if (type === 'random') value = randomStrongPassword(16);
    else if (type === 'strengthen') value = strengthenPassword(password);
    else value = generatePassphrase();
    setAltResult({ type, value });
  };

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      showToast('Copy failed — select and copy manually.');
    }
  };

  const analysis = analyzePassword(password, isReused);
  const focusRing = 'focus:outline-none focus:ring-2 focus:ring-cyan-500';

  return (
    <div className="min-h-full w-full bg-slate-950 text-slate-200 font-sans p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Local Security Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50 tracking-tight">Password Strength Audit</h1>
          <p className="text-sm text-slate-400 mt-1">Runs entirely in your browser. Nothing you type here is sent anywhere.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2 font-mono">Enter a password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                placeholder="Type to analyze..."
                className={`w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2.5 pr-10 font-mono text-slate-100 placeholder-slate-600 ${focusRing} focus:border-cyan-500`}
              />
              <button
                onClick={() => setShowPassword((s) => !s)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 ${focusRing} rounded`}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && <p className="mt-2 text-xs font-mono text-slate-600 truncate">sha256: {liveHash || 'computing…'}</p>}
          </div>

          {analysis && (
            <div className="p-5 border-b border-slate-800">
              <div className="flex items-baseline justify-between mb-2">
                <span className={`text-sm font-semibold ${analysis.tier.text}`}>{analysis.tier.label}</span>
                <span className="text-xs font-mono text-slate-500">{analysis.score}/100</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${analysis.tier.bar} transition-all duration-300`} style={{ width: `${analysis.score}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                <span>{analysis.entropy} bits entropy</span>
                <span>~{analysis.crackTime} to crack offline</span>
              </div>
            </div>
          )}

          {analysis && (
            <div className="p-5 border-b border-slate-800 grid sm:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-mono">Checks</h2>
                <ul className="space-y-1.5">
                  {analysis.checks.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      {c.pass ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      <span className={c.pass ? 'text-slate-400' : 'text-slate-300'}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-mono">Suggestions</h2>
                <ul className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-slate-400 leading-snug">
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="p-5 border-b border-slate-800">
            <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-mono">Stronger alternatives</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => handleGenerate('strengthen')}
                className={`inline-flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md border border-slate-700 ${focusRing}`}
              >
                <Shuffle className="w-3.5 h-3.5" /> Strengthen mine
              </button>
              <button
                onClick={() => handleGenerate('random')}
                className={`inline-flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md border border-slate-700 ${focusRing}`}
              >
                <KeyRound className="w-3.5 h-3.5" /> Random password
              </button>
              <button
                onClick={() => handleGenerate('passphrase')}
                className={`inline-flex items-center gap-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md border border-slate-700 ${focusRing}`}
              >
                <KeyRound className="w-3.5 h-3.5" /> Passphrase
              </button>
            </div>
            {altResult && (
              <div className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-700 rounded-md px-3 py-2.5">
                <span className="font-mono text-sm text-cyan-300 break-all">{altResult.value}</span>
                <button onClick={() => handleCopy(altResult.value)} className={`shrink-0 text-slate-400 hover:text-slate-200 ${focusRing} rounded`} aria-label="Copy">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs uppercase tracking-widest text-slate-500 font-mono">Reuse history (this device)</h2>
              {history.length > 0 && (
                <button onClick={handleClearHistory} className={`text-xs text-slate-500 hover:text-red-400 inline-flex items-center gap-1 ${focusRing} rounded`}>
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {isReused && (
              <div className="mb-3 text-sm text-red-400 bg-red-950 border border-red-900 rounded-md px-3 py-2">
                This exact password matches one already saved to your history. Choose a different one.
              </div>
            )}

            {history.length === 0 ? (
              <p className="text-sm text-slate-600">No passwords saved yet. Save one below to test reuse detection.</p>
            ) : (
              <ul className="space-y-1.5 mb-3">
                {history.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{h.hash.slice(0, 16)}…</span>
                    <span className="text-slate-700">·</span>
                    <span>{new Date(h.savedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={handleSave}
              disabled={!password}
              className={`text-sm bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-3 py-1.5 rounded-md ${focusRing}`}
            >
              Save current password to history
            </button>
            <p className="text-xs text-slate-600 mt-2">
              Only the SHA-256 hash is stored, never the password itself. In a real system this check — and the password
              — never touches the browser this way; see the backend reference file for how it's actually done.
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-slate-200 text-sm px-4 py-2 rounded-md shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
