import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState('');
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
        body: JSON.stringify({ password }),
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
    <main className="frame">
      <Head>
        <title>Sign in — Hustle Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <form className="card" onSubmit={submit}>
        <span className="mark" aria-hidden="true">
          🖨️
        </span>
        <h1>Hustle Desk</h1>
        <p className="sub">Enter the password to see the numbers.</p>

        <input
          ref={input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          autoComplete="current-password"
          disabled={busy}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy || !password}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>

      <style jsx>{`
        .frame {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(120% 80% at 50% 0%, rgba(5, 175, 128, 0.14), transparent 60%),
            var(--plane);
        }
        .card {
          width: 100%;
          max-width: 340px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 26px 22px 22px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
        }
        .mark {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: var(--surface-3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        h1 {
          font-size: 18px;
          font-weight: 650;
          margin: 4px 0 0;
        }
        .sub {
          font-size: 12.5px;
          color: var(--muted);
          margin: 0 0 4px;
          line-height: 1.5;
        }
        input {
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 9px;
          color: var(--ink);
          font-size: 15px;
          padding: 11px 12px;
          width: 100%;
        }
        input::placeholder {
          color: var(--muted);
        }
        input:focus {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
        button {
          background: var(--accent);
          color: #04140f;
          border: none;
          border-radius: 9px;
          padding: 11px 14px;
          font-size: 14px;
          font-weight: 650;
        }
        button:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .error {
          margin: 0;
          font-size: 12.5px;
          color: var(--critical);
          background: rgba(208, 59, 59, 0.12);
          border: 1px solid rgba(208, 59, 59, 0.3);
          border-radius: 8px;
          padding: 8px 10px;
        }
      `}</style>
    </main>
  );
}
