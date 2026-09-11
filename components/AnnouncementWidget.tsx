'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Announcement {
  title: string;
  content: string;
  image_url: string | null;
}

export default function AnnouncementWidget({ currentUser }: { currentUser: User | null }) {
  const [announcement, setAnnouncement] = useState<Announcement>({
    title: 'Tim Penerjemah Indonesia',
    content: 'Pilih kategori terjemahan di tengah halaman untuk mulai berkontribusi!',
    image_url: null,
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  useEffect(() => {
    fetchAnnouncement();
    if (currentUser) {
      checkAdminStatus(currentUser.id);
    } else {
      setIsAdmin(false);
    }
  }, [currentUser]);

  const fetchAnnouncement = async () => {
    const { data } = await supabase.from('announcements').select('*').eq('id', 1).single();
    if (data) {
      setAnnouncement(data);
      setFormTitle(data.title);
      setFormContent(data.content);
      setFormImageUrl(data.image_url || '');
    }
  };

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
    if (data?.is_admin) {
      setIsAdmin(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      title: formTitle,
      content: formContent,
      image_url: formImageUrl.trim() === '' ? null : formImageUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('announcements').update(payload).eq('id', 1);

    if (!error) {
      setAnnouncement(payload);
      setIsEditing(false);
    } else {
      alert('Gagal memperbarui pengumuman');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      {/* Header Bar */}
      <div className="border-b border-[#7f1d1d] pb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-red-400 uppercase tracking-wider">
            Pengumuman
          </span>
          {isAdmin && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-[10px] text-zinc-400 hover:text-amber-400 underline transition cursor-pointer"
            >
              [{isEditing ? 'Batal' : 'Edit'}]
            </button>
          )}
        </div>
        <span className="text-[10px] bg-red-950 text-red-300 px-1 rounded font-bold">
          INFO
        </span>
      </div>

      {/* Mode Edit Form (Khusus Admin) */}
      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-2 py-2 text-xs">
          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Judul Pengumuman</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full bg-[#0e0f12] border border-[#27272a] p-1.5 rounded text-zinc-200 focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">Deskripsi Teks</label>
            <textarea
              rows={3}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="w-full bg-[#0e0f12] border border-[#27272a] p-1.5 rounded text-zinc-200 focus:outline-none focus:border-red-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 mb-1">URL Gambar Banner (Opsional)</label>
            <input
              type="url"
              placeholder="https://i.imgur.com/..."
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              className="w-full bg-[#0e0f12] border border-[#27272a] p-1.5 rounded text-zinc-200 focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#b91c1c] hover:bg-[#dc2626] text-white font-bold py-1 rounded transition cursor-pointer"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      ) : (
        /* Tampilan Biasa */
        <div className="py-1 text-xs space-y-2 text-[#a1a1aa]">
          <p className="font-semibold text-slate-200">{announcement.title}</p>
          <p className="leading-relaxed">{announcement.content}</p>

          {announcement.image_url && (
            <div className="pt-2">
              <div 
                className="overflow-hidden"
                style={{
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                }}
              >
                <img
                  src={announcement.image_url}
                  alt="Gambar Pengumuman"
                  className="w-full h-auto object-cover max-h-56 block"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}