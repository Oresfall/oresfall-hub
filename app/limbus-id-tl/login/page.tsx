'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg('Email atau kata sandi salah.');
    } else {
      router.push('/limbus-id-tl');
      router.refresh();
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-[#0f1015] border border-[#7f1d1d] rounded p-6 shadow-2xl space-y-6">
      <div className="text-center space-y-1 border-b border-[#27272a] pb-4">
        <h1 className="text-xl font-black uppercase tracking-wider text-red-500">
          Otorisasi Manajer
        </h1>
        <p className="text-xs text-slate-400">
          Masuk ke akun untuk mulai mengunggah terjemahan.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-600 text-red-200 text-xs p-3 rounded font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wide">
            Alamat Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dante@limbuscompany.com"
            className="w-full bg-[#18181b] border border-[#3f3f46] text-white px-3 py-2 rounded focus:outline-none focus:border-red-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wide">
            Kata Sandi
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#18181b] border border-[#3f3f46] text-white px-3 py-2 rounded focus:outline-none focus:border-red-500 font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#b91c1c] hover:bg-red-600 text-white font-extrabold uppercase py-2.5 rounded transition tracking-wider shadow-lg disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400 border-t border-[#27272a] pt-4">
        Belum memiliki akun Manajer?{' '}
        <Link href="/limbus-id-tl/register" className="text-red-400 font-bold hover:underline">
          Daftar Sekarang
        </Link>
      </div>
    </div>
  );
}