'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const SINNERS = [
  { id: 'yi_sang', name: 'Yi Sang', iconUrl: 'https://limbuscompany.wiki.gg/images/thumb/Yi_Sang_Icon.png/60px-Yi_Sang_Icon.png?1c8a59'},
  { id: 'faust', name: 'Faust', iconUrl: '/icons/sinners/faust.png'},
  { id: 'don_quixote', name: 'Don Quixote', iconUrl: '/icons/sinners/don_quixote.png'},
  { id: 'ryoshu', name: 'Ryōshū', iconUrl: '/icons/sinners/ryoshu.png'},
  { id: 'meursault', name: 'Meursault', iconUrl: '/icons/sinners/meursault.png'},
  { id: 'hong_lu', name: 'Hong Lu', iconUrl: '/icons/sinners/hong_lu.png'},
  { id: 'heathcliff', name: 'Heathcliff', iconUrl: '/icons/sinners/heathcliff.png'},
  { id: 'ishmael', name: 'Ishmael', iconUrl: '/icons/sinners/ishmael.png'},
  { id: 'rodion', name: 'Rodya', iconUrl: '/icons/sinners/rodion.png'},
  { id: 'sinclair', name: 'Sinclair', iconUrl: '/icons/sinners/sinclair.png'},
  { id: 'outis', name: 'Outis', iconUrl: '/icons/sinners/outis.png'},
  { id: 'gregor', name: 'Gregor', iconUrl: '/icons/sinners/gregor.png'},
];

interface Identity {
  id: string;
  sinner_id: string;
  sinner_name: string;
  identity_name: string;
  file_category: 'Skill' | 'Passive' | 'Story' | 'Battle Speech';
  original_file_url: string;
  banner_url?: string;
  is_completed?: boolean;
}

export default function IdentityTranslationPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(null);
  const [activeSinnerFilter, setActiveSinnerFilter] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Input Admin
  const [sinnerId, setSinnerId] = useState('yi_sang');
  const [identityName, setIdentityName] = useState('');
  const [fileCategory, setFileCategory] = useState<'Skill' | 'Passive' | 'Story' | 'Battle Speech'>('Skill');
  const [bannerUrl, setBannerUrl] = useState('');
  const [adminFile, setAdminFile] = useState<{ name: string; content: any } | null>(null);

  const sinnerSectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchIdentities();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setIsAdmin(false);
    const email = user.email || '';
    const username = user.user_metadata?.username || '';
    const role = user.user_metadata?.role || '';

    if (role === 'admin' || username.toLowerCase() === 'oresfall' || email.toLowerCase().includes('oresfall')) {
      setIsAdmin(true);
    }
  };

  const fetchIdentities = async () => {
    const { data } = await supabase.from('identities').select('*').order('created_at');
    if (data) setIdentities(data);
  };

  const scrollToSinner = (sinnerId: string) => {
    setActiveSinnerFilter(sinnerId);
    const element = sinnerSectionRefs.current[sinnerId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

    const handleAdminAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminFile) return alert('Silakan pilih file JSON original!');
        setLoading(true);

        try {
        const selectedSinnerObj = SINNERS.find((s) => s.id === sinnerId);
        const fileExt = adminFile.name.split('.').pop();
        const fileName = `${sinnerId}_${Date.now()}.${fileExt}`;
        const filePath = `identities/${fileName}`;

        // 1. Upload file JSON ke Supabase Storage (Bucket: translations / datamine)
        const blob = new Blob([JSON.stringify(adminFile.content, null, 2)], {
            type: 'application/json',
        });

        const { error: uploadError } = await supabase.storage
            .from('translations') // Sesuaikan nama bucket di Supabase milikmu
            .upload(filePath, blob, { contentType: 'application/json' });

        if (uploadError) {
            // Jika belum buat bucket storage, kita simpan URL dummy / path lokal
            console.warn('Storage upload error, falling back to local path:', uploadError.message);
        }

        // Dapatkan Public URL file (jika berhasil upload)
        const { data: publicUrlData } = supabase.storage
            .from('translations')
            .getPublicUrl(filePath);

        const fileUrl = publicUrlData?.publicUrl || filePath;

        // 2. Insert data langsung ke tabel database 'identities' Supabase
        const { error: dbError } = await supabase.from('identities').insert([
            {
            sinner_id: sinnerId,
            sinner_name: selectedSinnerObj?.name || sinnerId,
            identity_name: identityName,
            file_category: fileCategory,
            banner_url: bannerUrl || null,
            original_file_url: fileUrl,
            original_data: adminFile.content, // Menyimpan isi JSON ke kolom jsonb (opsional)
            is_completed: false,
            },
        ]);

        if (dbError) throw dbError;

        setShowAddModal(false);
        setIdentityName('');
        setBannerUrl('');
        setAdminFile(null);
        await fetchIdentities();
        alert('Identitas berhasil ditambahkan!');
        } catch (err: any) {
        console.error(err);
        alert(`Gagal menambahkan Identitas: ${err.message || err}`);
        } finally {
        setLoading(false);
        }
    };

  return (
    <div className="flex h-screen bg-[#0d0e10] text-zinc-300 text-xs font-sans overflow-hidden">
      
      {/* SIDEBAR KIRI */}
      <aside className="w-80 border-r border-[#222327] bg-[#121316] p-4 flex flex-col shrink-0 h-full justify-between">
        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          <Link href="/limbus-id-tl" className="text-zinc-400 hover:text-white font-bold block transition">
            &larr; Layar Utama
          </Link>
          
          <h1 className="font-bold text-red-500 text-sm uppercase tracking-wider border-b border-[#222327] pb-2">
            IDENTITAS HUB
          </h1>

          {/* GRID LOGO SINNER (TANPA BOX PEMBUNGKUS EXTRA & TANPA TEKS) */}
          <div className="grid grid-cols-6 gap-1 py-1">
            {SINNERS.map((sinner) => (
              <button
                key={sinner.id}
                onClick={() => scrollToSinner(sinner.id)}
                title={sinner.name}
                className={`h-9 rounded hover:bg-red-950/60 border transition flex items-center justify-center p-1 ${
                  activeSinnerFilter === sinner.id
                    ? 'border-red-500 bg-red-950/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    : 'border-zinc-800 bg-[#16171b] hover:border-zinc-600'
                }`}
              >
                <img
                  src={sinner.iconUrl}
                  alt={sinner.name}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>

          {/* DAFTAR IDENTITAS BERDASARKAN SINNER */}
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {SINNERS.map((sinner) => {
              const sinnerIdentities = identities.filter((item) => item.sinner_id === sinner.id);

              return (
                <div
                  key={sinner.id}
                  ref={(el) => {
                    sinnerSectionRefs.current[sinner.id] = el;
                  }}
                  className="space-y-1.5 pt-1"
                >
                  <div className="sticky top-0 bg-[#121316]/95 backdrop-blur-sm z-10 py-1 border-b border-red-900/60 flex items-center justify-between">
                    <span className="font-extrabold text-red-500 tracking-wider text-xs uppercase flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-red-600 rounded-sm" />
                      {sinner.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {sinnerIdentities.length} File
                    </span>
                  </div>

                  {sinnerIdentities.length === 0 ? (
                    <p className="text-[11px] text-zinc-600 italic px-1">Belum ada data identitas.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sinnerIdentities.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedIdentity(item)}
                          className={`p-2 rounded cursor-pointer border transition flex items-center justify-between ${
                            selectedIdentity?.id === item.id
                              ? 'bg-red-950/40 border-red-600 text-white'
                              : 'bg-[#18191d] border-[#26272e] text-zinc-300 hover:border-zinc-500'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs">{item.identity_name}</p>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono mt-0.5 inline-block">
                              {item.file_category}
                            </span>
                          </div>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.is_completed ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SIDEBAR (TOMBOL ADMIN ADD) */}
        {isAdmin && (
          <div className="pt-3 border-t border-[#222327]">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded transition shadow text-xs"
            >
              + Admin: Tambah Identitas
            </button>
          </div>
        )}
      </aside>

      {/* AREA KANAN */}
      <main className="flex-1 p-6 overflow-y-auto">
        {!selectedIdentity ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <p className="text-sm">Pilih salah satu Identitas di sidebar kiri.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <header className="border-b border-[#222327] pb-3">
              <span className="text-red-500 font-bold uppercase text-xs">
                {selectedIdentity.sinner_name} &bull; {selectedIdentity.file_category}
              </span>
              <h2 className="text-2xl font-extrabold text-white">{selectedIdentity.identity_name}</h2>
            </header>

            {/* PREVIEW BANNER JIKA ADA */}
            {selectedIdentity.banner_url && (
              <div className="h-40 w-full rounded-lg overflow-hidden border border-[#2a2b30] relative">
                <img src={selectedIdentity.banner_url} alt="Banner" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="bg-[#141518] border border-[#222327] p-4 rounded-lg">
              <p className="text-zinc-400 text-xs">File Original JSON: <span className="text-amber-400 font-mono">{selectedIdentity.original_file_url}</span></p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL ADMIN: TAMBAH IDENTITAS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Tambah Identitas Baru</h3>

            <form onSubmit={handleAdminAddSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Pilih Sinner</label>
                <select
                  value={sinnerId}
                  onChange={(e) => setSinnerId(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                >
                  {SINNERS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Nama Identitas</label>
                <input
                  type="text"
                  placeholder="misal: LCB Sinner Yi Sang"
                  value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Kategori File</label>
                <select
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value as any)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                >
                  <option value="Skill">Skill</option>
                  <option value="Passive">Passive</option>
                  <option value="Story">Story</option>
                  <option value="Battle Speech">Battle Speech</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">URL Banner Gambar Identitas (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.png"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Upload File JSON Original</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const r = new FileReader();
                      r.onload = (ev) => setAdminFile({ name: f.name, content: JSON.parse(ev.target?.result as string) });
                      r.readAsText(f);
                    }
                  }}
                  className="text-xs text-zinc-400"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded"
                >
                  {loading ? 'Saving...' : 'Simpan Identitas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}