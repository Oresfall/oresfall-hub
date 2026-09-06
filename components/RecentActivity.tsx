'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivityItem {
  id: string;
  file_name: string;
  author_name: string;
  created_at: string;
  status: string;
  episode_id?: string | null;
  song_id?: string | null;
  identity_content_id?: string | null;
  announcer_content_id?: string | null;
  md_content_id?: string | null;
  episodes: {
    episode_name: string;
    intervallo_name?: string | null;
    canto_name?: string | null;
  } | null;
  songs: {
    song_title: string;
    album_name?: string | null;
  } | null;
  identity_contents: {
    identity_name: string;
    sinner_name?: string | null;
    content_name?: string | null;
  } | null;
  announcer_contents: {
    announcer_name: string;
    content_name?: string | null;
  } | null;
  mirror_dungeon_contents: {
    item_name: string;
    category?: string | null;
  } | null;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    setLoading(true);
    try {
      // 1. Ambil ID episode yang sudah COMPLETED (mempunyai submission approved)
      const { data: approvedSubs } = await supabase
        .from('submissions')
        .select('episode_id')
        .eq('status', 'approved');

      const completedEpisodeIds = new Set(
        approvedSubs?.map((s) => s.episode_id).filter(Boolean)
      );

      // 2. Ambil submission pending & join dengan semua kategori
      // Menggunakan !fk_submissions_songs untuk menghindari ambiguitas constraint duplikat
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          file_name,
          author_name,
          created_at,
          status,
          episode_id,
          song_id,
          identity_content_id,
          announcer_content_id,
          md_content_id,
          episodes (
            episode_name,
            intervallo_name,
            canto_name
          ),
          songs!fk_submissions_songs (
            song_title,
            album_name
          ),
          identity_contents (
            identity_name,
            sinner_name,
            content_name
          ),
          announcer_contents (
            announcer_name,
            content_name
          ),
          mirror_dungeon_contents (
            item_name,
            category
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }); // Terlama ke Terbaru

      if (error) {
        console.error('Detail Error Supabase:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (data) {
        // Filter out submission dari episode yang sudah COMPLETED
        const filtered = data
          .filter((sub) => !sub.episode_id || !completedEpisodeIds.has(sub.episode_id))
          .slice(0, 10);

        // Cast & format type data
        const formatted: ActivityItem[] = filtered.map((item: any) => ({
          ...item,
          episodes: Array.isArray(item.episodes) ? item.episodes[0] : item.episodes,
          songs: Array.isArray(item.songs) ? item.songs[0] : item.songs,
          identity_contents: Array.isArray(item.identity_contents)
            ? item.identity_contents[0]
            : item.identity_contents,
          announcer_contents: Array.isArray(item.announcer_contents)
            ? item.announcer_contents[0]
            : item.announcer_contents,
          mirror_dungeon_contents: Array.isArray(item.mirror_dungeon_contents)
            ? item.mirror_dungeon_contents[0]
            : item.mirror_dungeon_contents,
        }));

        setActivities(formatted);
      }
    } catch (err) {
      console.error('Gagal memuat aktivitas terbaru:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : activities.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < activities.length - 1 ? prev + 1 : 0));
  };

  // Helper untuk menentukan Kategori Parent & Judul Utama
  const getActivityDetails = (item: ActivityItem) => {
    // 1. Jika Submission Announcer
    if (item.announcer_contents || item.announcer_content_id) {
      const announcer = item.announcer_contents?.announcer_name;
      return {
        parentName: announcer ? `ANNOUNCER (${announcer})` : 'ANNOUNCER',
        title: item.announcer_contents?.content_name || item.file_name || 'Announcer Audio/Voice',
      };
    }

    // 2. Jika Submission Mirror Dungeon
    if (item.mirror_dungeon_contents || item.md_content_id) {
      const cat = item.mirror_dungeon_contents?.category;
      return {
        parentName: cat ? `MIRROR DUNGEON (${cat.toUpperCase()})` : 'MIRROR DUNGEON',
        title: item.mirror_dungeon_contents?.item_name || item.file_name || 'MD Content',
      };
    }

    // 3. Jika Submission Identitas
    if (item.identity_contents || item.identity_content_id) {
      const sinner = item.identity_contents?.sinner_name;
      return {
        parentName: sinner ? `IDENTITAS (${sinner})` : 'IDENTITAS',
        title: item.identity_contents?.identity_name 
          ? `${item.identity_contents.identity_name} - ${item.identity_contents.content_name || ''}`
          : item.file_name || 'Content Identitas',
      };
    }

    // 4. Jika Submission Lagu
    if (item.songs || item.song_id) {
      return {
        parentName: item.songs?.album_name ? `LAGU (${item.songs.album_name})` : 'LAGU',
        title: item.songs?.song_title || item.file_name || 'Lagu Tanpa Judul',
      };
    }

    // 5. Jika Submission Intervallo
    if (item.episodes?.intervallo_name) {
      return {
        parentName: item.episodes.intervallo_name,
        title: item.episodes.episode_name || item.file_name || 'Episode',
      };
    }

    // 6. Jika Submission Canto
    if (item.episodes?.canto_name) {
      return {
        parentName: item.episodes.canto_name,
        title: item.episodes.episode_name || item.file_name || 'Episode',
      };
    }

    // Fallback Default
    return {
      parentName: item.episodes?.intervallo_name || 'STORY',
      title: item.episodes?.episode_name || item.file_name || 'Episode',
    };
  };

  if (loading) {
    return (
      <div className="bg-[#141518] border border-[#222327] rounded-lg p-4 text-center text-zinc-500 text-xs">
        Memuat aktivitas terbaru...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-[#141518] border border-[#222327] rounded-lg p-4 text-center text-zinc-500 text-xs">
        <h3 className="font-bold text-amber-500 uppercase tracking-wider mb-1 text-[11px]">
          Aktivitas Terakhir
        </h3>
        <p className="text-[#808080]">Tidak ada entry review terjemahan.</p>
      </div>
    );
  }

  const currentItem = activities[currentIndex];
  const { parentName, title } = getActivityDetails(currentItem);

  return (
    <div className="bg-[#141518] border border-[#222327] rounded-lg p-3.5 space-y-3 shadow-md">
      {/* HEADER & NAVIGASI */}
      <div className="flex items-center justify-between border-b border-[#222327] pb-2">
        <h3 className="font-bold text-amber-500 text-[11px] uppercase tracking-wider">
          Aktivitas Terakhir
        </h3>
        
        {/* INDIKATOR & TOMBOL NAVIGASI */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400 bg-[#1c1d22] px-2 py-0.5 rounded border border-[#2b2c32]">
            {currentIndex + 1} / {activities.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={handlePrev}
              className="bg-[#1e1f24] hover:bg-[#2a2b32] text-zinc-300 w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition border border-[#2e2f36]"
              title="Terlama"
            >
              &lt;
            </button>
            <button
              onClick={handleNext}
              className="bg-[#1e1f24] hover:bg-[#2a2b32] text-zinc-300 w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition border border-[#2e2f36]"
              title="Terbaru"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* KARTU AKTIVITAS */}
      <div className="bg-[#1a1b1f] border border-[#26272e] rounded-md p-3 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div>
            <span className="text-[9px] font-bold text-amber-400/90 uppercase tracking-wide block">
              {parentName}
            </span>
            <p className="font-bold text-zinc-200 text-xs truncate max-w-[180px]" title={title}>
              {title}
            </p>
          </div>
          <span className="bg-amber-950/80 text-amber-400 border border-amber-800/40 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0">
            Pending
          </span>
        </div>

        <div className="pt-1 border-t border-[#222327]/60 flex justify-between items-end text-[10px]">
          <div>
            <span className="text-zinc-500 block text-[9px]">Translator</span>
            <span className="font-semibold text-zinc-300">{currentItem.author_name || 'Anonim'}</span>
          </div>
          <span className="text-zinc-500 font-mono text-[9px]">
            {new Date(currentItem.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}