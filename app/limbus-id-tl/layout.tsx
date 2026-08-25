'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';

interface LeaderboardUser {
  id: string;
  username: string;
  contributions: number;
}

export default function LimbusWikiLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [contributions, setContributions] = useState<number>(0);
  const [username, setUsername] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    const getUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser.id, currentUser);
      }
      fetchLeaderboard(currentUser);
    };

    getUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserProfile(currentUser.id, currentUser);
      } else {
        setContributions(0);
        setUsername('');
      }
      fetchLeaderboard(currentUser);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, currentUser: User) => {
    // Ambil username dari metadata Supabase Auth atau Email
    const resolvedName = currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'User';
    setUsername(resolvedName);

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, contributions')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      setContributions(profile.contributions ?? 0);
      
      // Otomatis sinkronkan username ke database jika di tabel profiles masih 'User' / kosong
      if (!profile.username || profile.username === 'User') {
        await supabase
          .from('profiles')
          .update({ username: resolvedName })
          .eq('id', userId);
      }
    } else {
      setContributions(0);
    }
  };

  const fetchLeaderboard = async (currentUser: User | null) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, contributions')
      .order('contributions', { ascending: false })
      .limit(10);

    if (!error && data) {
      const formattedData = data.map((item) => {
        let displayName = item.username;
        
        // Fallback langsung via kode jika user yang login adalah pemilik ID tersebut
        if ((!displayName || displayName === 'User') && currentUser && currentUser.id === item.id) {
          displayName = currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'User';
        }

        return {
          ...item,
          username: displayName && displayName !== 'User' ? displayName : 'User',
        };
      });

      setLeaderboard(formattedData);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/limbus-id-tl');
    router.refresh();
  };

  return (
    <div 
      className="min-h-screen text-[#d4d4d8] font-sans bg-cover bg-center bg-fixed relative"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 12, 0.88), rgba(10, 10, 12, 0.95)), url('https://raw.githubusercontent.com/Crescent-Moon-Studio/Limbus-Company-Assets/main/Backgrounds/main_bg.png')`
      }}
    >
      {/* 1. Bar Navigasi Atas */}
      <header className="bg-[#111217]/95 backdrop-blur border-b border-[#27272a] text-xs h-10 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/limbus-id-tl" className="font-extrabold text-[#ef4444] tracking-widest uppercase flex items-center gap-1.5">
            <span className="bg-[#b91c1c] text-white px-1.5 py-0.5 rounded text-[10px]">ID</span>
            Limbus Company Wiki TL
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-slate-300 font-semibold">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-[#ef4444] font-bold">
                  {username}
                </span>
                <span>/</span>
                <button 
                  onClick={handleLogout}
                  className="hover:text-red-400 transition cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/limbus-id-tl/login" className="hover:text-white transition">Masuk</Link>
                <span>/</span>
                <Link href="/limbus-id-tl/register" className="hover:text-white transition">Buat Akun</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Grid Utama 3 Kolom */}
      <div className="max-w-[1600px] mx-auto p-4 grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* KOLOM KIRI: Direktori & Navigasi */}
        <aside className="md:col-span-2 space-y-4">
          <div className="bg-[#14151a]/90 border border-[#7f1d1d] rounded p-3 text-center shadow-lg backdrop-blur">
            <img 
              src="https://i.imgur.com/rphZwYy.png" 
              alt="Indonesia Limbus Translation Logo" 
              className="w-20 h-20 mx-auto mb-2 object-contain"
            />
            <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider leading-tight">
              Indonesia Limbus Translation
            </p>
          </div>

          <nav className="bg-[#14151a]/90 border border-[#27272a] rounded p-3 text-xs space-y-4 backdrop-blur">
            <div>
              <div className="font-bold text-[#ef4444] uppercase tracking-wider border-b border-[#27272a] pb-1 mb-2">Navigasi</div>
              <ul className="space-y-1.5 text-[#a1a1aa]">
                <li>
                  <a 
                    href="https://drive.google.com/drive/folders/1mm45P52j7-CGTaCf_hjzMVFNyAWQ3WK9" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-red-400 font-bold hover:text-red-300 transition block mb-1"
                  >
                    Download Terjemahan Indonesia
                  </a>
                </li>
                <li><Link href="/limbus-id-tl" className="hover:text-white transition">Halaman Utama</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-[#ef4444] uppercase tracking-wider border-b border-[#27272a] pb-1 mb-2">Terjemahan</p>
              <ul className="space-y-1.5 text-[#a1a1aa]">
                <li><Link href="/limbus-id-tl/canto" className="hover:text-white transition">Canto</Link></li>
                <li><Link href="/limbus-id-tl/intervallo" className="hover:text-white transition">Intervallo</Link></li>
                <li><Link href="/limbus-id-tl/identitas" className="hover:text-white transition">Identitas</Link></li>
                <li><Link href="/limbus-id-tl/announcer" className="hover:text-white transition">Announcer</Link></li>
                <li><Link href="/limbus-id-tl/mirror-dungeon" className="hover:text-white transition">Mirror Dungeon</Link></li>
                <li><Link href="/limbus-id-tl/lirik-lagu" className="hover:text-white transition">Lirik Lagu</Link></li>
              </ul>
            </div>
          </nav>

          {/* WIDGET PROFIL */}
          <div className="bg-[#14151a]/90 border border-[#27272a] rounded p-3 text-xs backdrop-blur space-y-1">
            <p className="font-bold text-[#ef4444] uppercase tracking-wider border-b border-[#27272a] pb-1 mb-2">
              Profil Akun
            </p>
            {user ? (
              <div className="space-y-1">
                <p className="font-bold text-zinc-200 truncate">{username}</p>
                <p className="text-[11px] text-amber-400 font-semibold">
                  Kontribusi: <span className="text-zinc-300 font-mono">{contributions}</span>
                </p>
              </div>
            ) : (
              <p className="text-zinc-500 text-[11px] italic">Belum Login</p>
            )}
          </div>
        </aside>

        {/* KOLOM TENGAH Konten Utama */}
        <main className="md:col-span-7 bg-[#14151a]/90 border border-[#27272a] rounded p-5 shadow-2xl backdrop-blur">
          {children}
        </main>

        {/* KOLOM KANAN: Pengumuman & Leaderboard */}
        <aside className="md:col-span-3 space-y-4">
          <div className="bg-[#14151a]/90 border border-[#7f1d1d] rounded overflow-hidden backdrop-blur">
            <div className="bg-[#7f1d1d]/40 border-b border-[#7f1d1d] px-3 py-1.5 font-bold text-xs text-red-400 uppercase tracking-wider flex items-center justify-between">
              <span>Pengumuman</span>
              <span className="text-[10px] bg-red-950 text-red-300 px-1 rounded">INFO</span>
            </div>
            <div className="p-3 text-xs space-y-2 text-[#a1a1aa]">
              <p className="font-semibold text-slate-200">Tim Penerjemah Indonesia</p>
              <p>Pilih kategori terjemahan di tengah halaman untuk mulai berkontribusi!</p>
            </div>
          </div>

          {/* WIDGET LEADERBOARD */}
          <div className="bg-[#14151a]/90 border border-[#27272a] rounded overflow-hidden backdrop-blur shadow-lg">
            <div className="bg-[#18181b] border-b border-[#27272a] px-3 py-2 flex justify-between items-center">
              <span className="font-bold text-xs text-amber-400 uppercase tracking-wider">
                Leaderboard Agustus
              </span>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/50">
                Top 10
              </span>
            </div>

            <div className="p-3 text-xs space-y-2">
              {leaderboard.length > 0 ? (
                leaderboard.map((item, index) => (
                  <div 
                    key={item.id || index}
                    className="flex justify-between items-center border-b border-[#222327] pb-1.5 last:border-none last:pb-0"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span 
                        className={`font-mono font-bold w-5 text-center text-[11px] ${
                          index === 0 ? 'text-amber-400' :
                          index === 1 ? 'text-zinc-300' :
                          index === 2 ? 'text-amber-700' : 'text-zinc-500'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <span className="font-medium text-zinc-200 truncate max-w-[120px]">
                        {item.username}
                      </span>
                    </div>
                    <span className="font-mono text-amber-400 font-semibold text-[11px]">
                      {item.contributions || 0} pts
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-[11px] italic text-center py-2">
                  Belum ada data kontribusi.
                </p>
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}