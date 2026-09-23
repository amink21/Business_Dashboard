import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, keepSignedIn }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not sign in.');

      // Only ever follow a same-site path, so a crafted ?next= cannot bounce
      // someone off to another origin after they authenticate.
      const next = typeof router.query.next === 'string' ? router.query.next : '/';
      const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      window.location.assign(safe);
    } catch (err) {
      setError(err.message);
      setPassword('');
      setBusy(false);
      input.current?.focus();
    }
  }

  return (
    <main className="screen">
      <Head>
        <title>Hustle Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="header">
        <div className="mark" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="3" width="12" height="7" rx="1" />
            <rect x="4" y="10" width="16" height="8" rx="1.5" />
            <rect x="8" y="14" width="8" height="6" />
          </svg>
        </div>
        <h1>Hustle Desk</h1>
        <p className="sub">Enter the password to see the numbers</p>
      </div>

      <form className="form" onSubmit={submit}>
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <div className="field">
          <input
            ref={input}
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            autoComplete="current-password"
            disabled={busy}
          />
          <button
            type="button"
            className="eye"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <label className="remember">
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(e) => setKeepSignedIn(e.target.checked)}
          />
          <span className="box" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          Keep me signed in on this iPhone
        </label>

        <button type="submit" className="unlock" disabled={busy || !password}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>

      <p className="footer">Tesla chargers · 3D prints</p>

      <style jsx>{`
        .screen {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 24px;
          background: var(--plane);
        }
        .header {
          margin-top: 13vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }
        .mark {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: var(--surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        h1 {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 4px 0 0;
        }
        .sub {
          font-size: 15px;
          color: var(--ink-2);
          margin: 0;
          line-height: 1.5;
        }
        .form {
          width: 100%;
          max-width: 360px;
          margin-top: auto;
          padding-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .field-label {
          font-size: 14px;
          color: var(--ink-2);
        }
        .field {
          position: relative;
          margin-top: -4px;
        }
        input[type='password'],
        input[type='text'] {
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--ink);
          font-size: 16px;
          padding: 15px 46px 15px 16px;
          width: 100%;
        }
        input:focus {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        .eye {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--ink-2);
          padding: 0;
        }
        .remember {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14.5px;
          color: var(--ink-2);
          cursor: pointer;
          user-select: none;
          margin-top: 2px;
        }
        .remember input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }
        .box {
          flex: 0 0 auto;
          width: 21px;
          height: 21px;
          border-radius: 6px;
          border: 1.5px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
        }
        .box svg {
          opacity: 0;
        }
        .remember input:checked + .box {
          background: var(--ink);
          border-color: var(--ink);
        }
        .remember input:checked + .box svg {
          opacity: 1;
        }
        .remember input:focus-visible + .box {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .unlock {
          margin-top: 8px;
          background: var(--ink);
          color: #0a0a0b;
          border: none;
          border-radius: 14px;
          padding: 16px 14px;
          font-size: 16px;
          font-weight: 650;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .unlock:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .error {
          margin: 0;
          font-size: 13px;
          color: var(--critical);
          background: rgba(208, 59, 59, 0.12);
          border: 1px solid rgba(208, 59, 59, 0.3);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .footer {
          margin-top: 28px;
          margin-bottom: max(28px, env(safe-area-inset-bottom));
          font-size: 13px;
          color: var(--muted);
        }
      `}</style>
    </main>
  );
}
