'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AnnouncementWidgetProps {
  currentUser: User | null;
}

interface AnnouncementData {
  id: number | string;
  title: string;
  content: string;
  image_url?: string | null;
}

export default function AnnouncementWidget({ currentUser }: AnnouncementWidgetProps) {
  const [announcement, setAnnouncement] = useState<AnnouncementData>({
    id: 1,
    title: 'Tim Penerjemah Indonesia',
    content: 'Pilih kategori terjemahan di tengah halaman untuk mulai berkontribusi!',
    image_url: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // State untuk mencegah Hydration Mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Verifikasi apakah user saat ini adalah Admin
  useEffect(() => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }
    const email = currentUser.email || '';
    const username = currentUser.user_metadata?.username || '';
    const role = currentUser.user_metadata?.role || '';

    if (
      role === 'admin' ||
      username.toLowerCase() === 'oresfall' ||
      email.toLowerCase().includes('oresfall') ||
      email === 'putraadhitama@gmail.com'
    ) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [currentUser]);

  // Ambil data pengumuman terbaru dari Supabase
  const fetchAnnouncement = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAnnouncement(data);
      }
    } catch (err: any) {
      console.error('Gagal mengambil pengumuman:', err.message);
    }
  };

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const handleOpenEdit = () => {
    setTitleInput(announcement.title);
    setContentInput(announcement.content);
    setImageUrlInput(announcement.image_url || '');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (announcement.id) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: titleInput,
            content: contentInput,
            image_url: imageUrlInput ? imageUrlInput.trim() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', announcement.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert([
            {
              title: titleInput,
              content: contentInput,
              image_url: imageUrlInput ? imageUrlInput.trim() : null,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (data) setAnnouncement(data);
      }

      await fetchAnnouncement();
      setIsEditing(false);
      alert('Pengumuman berhasil diperbarui secara global!');
    } catch (err: any) {
      alert('Gagal memperbarui pengumuman: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="border-b border-[#27272a] pb-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-[#ef4444] uppercase tracking-wider">
            PENGUMUMAN
          </span>
          {isAdmin && !isEditing && (
            <button
              onClick={handleOpenEdit}
              className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              [Edit]
            </button>
          )}
        </div>
      </div>

      {!isEditing ? (
        <div className="space-y-2 pt-1">
          <h3 className="font-bold text-xs text-zinc-200">{announcement.title}</h3>
          
          <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line prose prose-invert max-w-none">
            {mounted ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {announcement.content}
              </ReactMarkdown>
            ) : (
              <span>{announcement.content}</span>
            )}
          </div>

          {announcement.image_url && (
            <div className="mt-2 w-full rounded overflow-hidden border border-[#27272a]">
              <img
                src={announcement.image_url}
                alt="Banner Pengumuman"
                className="w-full h-auto block"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-[#14151a] border border-[#27272a] p-3 rounded space-y-3">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">Judul Pengumuman</label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full bg-[#0d0e10] border border-[#3f3f46] px-2.5 py-1 rounded text-xs text-white focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              Isi Pengumuman (Mendukung Enter & **Bold**, *Italic*, <u>Underline</u>)
            </label>
            <textarea
              rows={4}
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              className="w-full bg-[#0d0e10] border border-[#3f3f46] p-2 rounded text-xs text-white font-mono focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">
              URL Link Gambar (Opsional)
            </label>
            <input
              type="url"
              placeholder="https://i.imgur.com/example.png"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              className="w-full bg-[#0d0e10] border border-[#3f3f46] px-2.5 py-1 rounded text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white font-bold rounded text-[11px] cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Simpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}