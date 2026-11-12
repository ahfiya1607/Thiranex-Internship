# AegisLock — Secure Login & Identity Protection System

[![Security: Bcrypt 12](https://img.shields.io/badge/Security-Bcrypt_12_Rounds-emerald.svg)](https://en.wikipedia.org/wiki/Bcrypt)
[![Defense: SQLi Prepared Statements](https://img.shields.io/badge/Defense-Parameterized_SQL-cyan.svg)](https://owasp.org/www-community/attacks/SQL_Injection)
[![Auth: RFC 6238 TOTP](https://img.shields.io/badge/2FA-RFC_6238_TOTP-purple.svg)](https://datatracker.ietf.org/doc/html/rfc6238)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A production-grade, hardened authentication web application designed to demonstrate and enforce modern defense-in-depth principles: salted **bcrypt password hashing (12 rounds)**, **strict parameterized query binding** to eliminate SQL injection vulnerabilities, **cryptographic session lifecycle management** with device revocation, brute force mitigation with automatic account lockout, and **Two-Factor Authentication (TOTP 2FA)** with emergency backup recovery codes.

---

## 🔒 Key Security Features

### 1. Password Hashing (bcrypt)
- Enforces adaptive key derivation using **12 work factor rounds** ($2a$12$...) and 128-bit CSPRNG salts.
- Neutralizes precomputed rainbow table attacks and withstands GPU/ASIC brute-force cracking.
- Client-side and server-side password complexity policies: minimum 8 characters, uppercase, lowercase, numbers, and special symbols with entropy scoring.

### 2. SQL Injection Neutralization
- Completely isolates SQL grammar compilation from untrusted user data via **parameterized prepared statements** (`WHERE email = ?`).
- Eliminates quote-escaping bypasses (`' OR '1'='1`, `admin'--`, `'; DROP TABLE...`).
- Includes an interactive **SQLi Defense Lab** providing side-by-side execution analysis between vulnerable string interpolation and secure parameterized binding.

### 3. Session Management & Device Control
- High-entropy 256-bit session tokens generated with `crypto.randomBytes(32)`.
- Multi-device session manager with client device fingerprinting, IP address logging, last active timestamps, and sliding 24-hour expiration.
- Granular per-device session termination and one-click "Log Out All Other Devices".

### 4. Brute Force & Credential Stuffing Guard
- Progressive delay with IP-based rate limiting.
- Automatic **15-minute account lockout** enforced after 5 consecutive incorrect password attempts.
- Generic failure messages to prevent user enumeration attacks.

### 5. Two-Factor Authentication (RFC 6238 TOTP)
- Standard Time-Based One-Time Passwords compatible with Google Authenticator, 1Password, Authy, and Apple Passwords.
- In-app QR code generator and Base32 manual entry keys with 30-second clock skew tolerance.
- 8 single-use emergency backup recovery codes (stored as SHA-256 hashes and permanently burned upon use).

### 6. Audit Trail & Telemetry
- Chronological security event log recording registration, authentication, 2FA operations, password updates, rate-limit triggers, and neutralized attack attempts.

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

---

## 🧪 Demo Test Credentials

| Account | Email | Password | Role | 2FA Status |
| :--- | :--- | :--- | :--- | :--- |
| **Alice** | `alice@example.com` | `Aegis!Pass2026` | User | Disabled (clean state for testing 2FA setup & QR code scan) |
| **Bob** | `bob@defense.gov` | `Vault#2026Secure` | Admin | Enforced (triggers mandatory 2FA challenge on login) |

---

## 📁 Project Structure

```
├── server.ts                    # Full-stack Express server with Vite middleware integration
├── server/
│   ├── auth.ts                  # Bcrypt hashing, TOTP generator, Zod schemas, brute-force limiter
│   ├── db.ts                    # Parameterized query engine, session vault, SQLi simulator
│   └── routes.ts                # RESTful API endpoints for auth, 2FA, sessions, and audit logs
├── src/
│   ├── App.tsx                  # Root React component & state orchestrator
│   ├── api.ts                   # Client HTTP fetch layer & token persistence
│   ├── types.ts                 # TypeScript data contracts & interfaces
│   └── components/
│       ├── Navbar.tsx           # Navigation header with live security status badges
│       ├── LoginForm.tsx        # Login interface with lockout notifications & demo autofill
│       ├── RegisterForm.tsx     # Sign-up interface with real-time password strength meter
│       ├── TwoFactorChallenge.tsx # 2FA challenge screen for TOTP code or backup code
│       ├── TwoFactorModal.tsx   # QR code enrollment wizard & backup code generator
│       ├── Dashboard.tsx        # Profile, session management, and posture score card
│       ├── SqlInjectionLab.tsx  # Interactive penetration testing & defense sandbox
│       ├── AuditLogViewer.tsx   # Live security event trail with threat filters
│       ├── DemoAccountsCard.tsx # Quick-access credential cards with live TOTP helper
│       └── SecurityArchitectureDoc.tsx # Technical deep dive into cryptographic standards
└── package.json
```

---

## 🛡️ License

This project is licensed under the MIT License.
