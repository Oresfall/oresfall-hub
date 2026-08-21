'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validasi Username
    if (username.length < 3 || username.length > 16) {
      setErrorMsg('Nama pengguna harus 3-16 karakter.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrorMsg('Nama pengguna hanya boleh berisi huruf, angka, dan underscore (_).');
      return;
    }

    // Validasi Password
    if (password.length < 6 || password.length > 16) {
      setErrorMsg('Kata sandi harus 6-16 karakter.');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(password)) {
      setErrorMsg('Kata sandi hanya boleh berisi huruf dan angka.');
      return;
    }

    setLoading(true);

    // Registrasi ke Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      alert('Pendaftaran berhasil! Silakan masuk dengan akun kamu.');
      router.push('/limbus-id-tl/login');
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-[#0f1015] border border-[#7f1d1d] rounded p-6 shadow-2xl space-y-6">
      <div className="text-center space-y-1 border-b border-[#27272a] pb-4">
        <h1 className="text-xl font-black uppercase tracking-wider text-red-500">
          Registrasi Penerjemah
        </h1>
        <p className="text-xs text-slate-400">
          Bergabunglah dengan tim lokalisasi Indonesia Limbus Company.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-600 text-red-200 text-xs p-3 rounded font-medium flex items-start gap-2">
          <span className="font-bold text-red-400">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wide">
            Nama Pengguna <span className="text-slate-500 font-normal">(Maks 16 karakter, tanpa simbol)</span>
          </label>
          <input
            type="text"
            required
            maxLength={16}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Contoh: Dante_12"
            className="w-full bg-[#18181b] border border-[#3f3f46] text-white px-3 py-2 rounded focus:outline-none focus:border-red-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wide">
            Alamat Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="manager@limbuscompany.com"
            className="w-full bg-[#18181b] border border-[#3f3f46] text-white px-3 py-2 rounded focus:outline-none focus:border-red-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wide">
            Kata Sandi <span className="text-slate-500 font-normal">(6-16 karakter, huruf & angka)</span>
          </label>
          <input
            type="password"
            required
            maxLength={16}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#18181b] border border-[#3f3f46] text-white px-3 py-2 rounded focus:outline-none focus:border-red-500 font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#b91c1c] hover:bg-red-600 text-white font-extrabold uppercase py-2.5 rounded transition tracking-wider shadow-lg mt-2 disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Buat Akun'}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400 border-t border-[#27272a] pt-4">
        Sudah memiliki akun?{' '}
        <Link href="/limbus-id-tl/login" className="text-red-400 font-bold hover:underline">
          Masuk di sini
        </Link>
      </div>
    </div>
  );
}