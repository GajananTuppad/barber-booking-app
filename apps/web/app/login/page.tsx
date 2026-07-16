'use client';

import '../globals.css';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'not_admin') {
      setError('That account does not have admin access.');
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-card border border-border bg-card p-8">
        <h1 className="mb-1 text-2xl font-bold text-white">Shravkash Admin</h1>
        <p className="mb-6 text-sm text-muted">Sign in with your admin account</p>

        <label className="mb-1 block text-sm text-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-card border border-border bg-input px-3 py-2 text-white outline-none focus:border-gold"
        />

        <label className="mb-1 block text-sm text-muted" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-card border border-border bg-input px-3 py-2 text-white outline-none focus:border-gold"
        />

        {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-card bg-gold py-2 font-semibold text-black disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Log In'}
        </button>
      </form>
    </main>
  );
}
