'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Episode {
  id: string;
  canto_name: string;
  episode_name: string;
  original_file_url: string;
  banner_url?: string;
}

interface Submission {
  id: string;
  file_name: string;
  file_url: string;
  status: string;
  author_name: string;
  author_id?: string;
  created_at: string;
}

export default function CantoTranslationPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedCanto, setSelectedCanto] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [originalJson, setOriginalJson] = useState<string>('');

  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [modalType, setModalType] = useState<'add_episode' | 'edit_canto' | 'edit_episode'>('add_episode');
  
  // Target Edit
  const [targetCantoName, setTargetCantoName] = useState('');
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);

  // Form Input States
  const [cantoName, setCantoName] = useState('Canto 1');
  const [episodeName, setEpisodeName] = useState('Episode 1');
  const [bannerUrl, setBannerUrl] = useState('');
  const [adminFile, setAdminFile] = useState<{ name: string; content: any } | null>(null);

  const [userFile, setUserFile] = useState<{ name: string; content: any } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEpisodes();

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      verifyAdmin(user);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      verifyAdmin(session?.user || null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const verifyAdmin = (user: any) => {
    if (!user) return setIsAdmin(false);
    const email = user.email || '';
    const username = user.user_metadata?.username || '';
    const role = user.user_metadata?.role || '';

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
  };

  const fetchEpisodes = async () => {
    const { data } = await supabase.from('episodes').select('*').order('canto_name');
    if (data && data.length > 0) {
      setEpisodes(data);
      if (!selectedCanto) {
        setSelectedCanto(data[0].canto_name);
      }
    } else {
      setEpisodes([]);
      setSelectedCanto('');
    }
  };

  const selectEpisode = async (ep: Episode) => {
    setSelectedEpisode(ep);

    if (ep.original_file_url) {
      try {
        const cacheBusterUrl = `${ep.original_file_url}?t=${Date.now()}`;
        const res = await fetch(cacheBusterUrl, { cache: 'no-store' });
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          setOriginalJson(JSON.stringify(parsed, null, 2));
        } catch {
          setOriginalJson(text);
        }
      } catch {
        setOriginalJson('// Gagal memuat file original');
      }
    } else {
      setOriginalJson('// Belum ada file mentah');
    }

    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('episode_id', ep.id)
      .order('created_at', { ascending: false });

    if (data) setSubmissions(data);
  };

  const handleUpdateSubmissionStatus = async (sub: Submission, newStatus: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: newStatus })
        .eq('id', sub.id);

      if (error) throw error;

      if (newStatus === 'approved' && sub.author_id) {
        try {
          const res = await fetch(`${sub.file_url}?t=${Date.now()}`, { cache: 'no-store' });
          const json = await res.json();
          
          let idCount = 0;
          if (Array.isArray(json.dataList)) {
            idCount = json.dataList.length;
          } else if (Array.isArray(json)) {
            idCount = json.length;
          }

          if (idCount > 0) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('contributions')
              .eq('id', sub.author_id)
              .single();

            const currentContrib = profile?.contributions || 0;
            const updatedContrib = currentContrib + idCount;

            await supabase
              .from('profiles')
              .update({ contributions: updatedContrib })
              .eq('id', sub.author_id);

            alert(`Submission disetujui! +${idCount} kontribusi berhasil ditambahkan ke ${sub.author_name}.`);
          }
        } catch (e) {
          console.error('Gagal menghitung ID file JSON:', e);
          alert('Status berhasil disetujui, namun gagal menghitung poin kontribusi.');
        }
      } else if (newStatus === 'rejected') {
        alert('Submission ditolak.');
      }

      if (selectedEpisode) await selectEpisode(selectedEpisode);

    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setModalType('add_episode');
    setCantoName(selectedCanto || 'Canto 1');
    setEpisodeName('Episode 1');
    setBannerUrl('');
    setAdminFile(null);
    setShowAdminModal(true);
  };

  const openEditCantoModal = (canto: string, currentBanner: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('edit_canto');
    setTargetCantoName(canto);
    setCantoName(canto);
    setBannerUrl(currentBanner || '');
    setShowAdminModal(true);
  };

  const openEditEpisodeModal = (ep: Episode, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('edit_episode');
    setEditingEpisode(ep);
    setEpisodeName(ep.episode_name);
    setCantoName(ep.canto_name);
    setBannerUrl(ep.banner_url || '');
    setAdminFile(null);
    setShowAdminModal(true);
  };

  const handleDeleteCanto = async (cantoToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        `PERINGATAN: Menghapus "${cantoToDelete}" akan menghapus SELURUH episode dan terjemahan di dalam Canto ini.\n\nYakin ingin melanjutkan?`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const cantoEpisodes = episodes.filter((ep) => ep.canto_name === cantoToDelete);
      const episodeIds = cantoEpisodes.map((ep) => ep.id);

      if (episodeIds.length > 0) {
        await supabase.from('submissions').delete().in('episode_id', episodeIds);
      }

      const { error } = await supabase.from('episodes').delete().eq('canto_name', cantoToDelete);
      if (error) throw error;

      if (selectedCanto === cantoToDelete) {
        setSelectedCanto('');
        setSelectedEpisode(null);
      }

      fetchEpisodes();
      alert(`Banner Canto "${cantoToDelete}" beserta seluruh episodenya berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus Canto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEpisode = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Yakin ingin menghapus episode ini beserta semua terjemahannya?')) return;

    setLoading(true);
    try {
      await supabase.from('submissions').delete().eq('episode_id', id);
      await supabase.from('episodes').delete().eq('id', id);
      fetchEpisodes();
      if (selectedEpisode?.id === id) setSelectedEpisode(null);
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalType === 'edit_canto') {
        const { error } = await supabase
          .from('episodes')
          .update({
            canto_name: cantoName,
            banner_url: bannerUrl,
          })
          .eq('canto_name', targetCantoName);

        if (error) throw error;
        if (selectedCanto === targetCantoName) setSelectedCanto(cantoName);

      } else if (modalType === 'edit_episode' && editingEpisode) {
        if (adminFile) {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'admin_original',
              episodeId: editingEpisode.id,
              cantoName: editingEpisode.canto_name,
              episodeName,
              bannerUrl: editingEpisode.banner_url,
              fileName: adminFile.name,
              jsonContent: adminFile.content,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || 'Gagal memperbarui file episode');
          }
        } else {
          const { error } = await supabase
            .from('episodes')
            .update({ episode_name: episodeName })
            .eq('id', editingEpisode.id);

          if (error) throw error;
        }

      } else if (modalType === 'add_episode') {
        if (!adminFile) return alert('Pilih file JSON mentah!');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'admin_original',
            cantoName,
            episodeName,
            bannerUrl,
            fileName: adminFile.name,
            jsonContent: adminFile.content,
          }),
        });
        if (!res.ok) throw new Error('Gagal membuat episode baru');
      }

      setShowAdminModal(false);
      await fetchEpisodes();

      if (editingEpisode && selectedEpisode?.id === editingEpisode.id) {
        const updatedEp = {
          ...editingEpisode,
          episode_name: episodeName,
        };
        await selectEpisode(updatedEp);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFile || !selectedEpisode) return alert('Pilih file JSON terjemahan!');
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_submission',
          episodeId: selectedEpisode.id,
          fileName: userFile.name,
          jsonContent: userFile.content,
          authorName: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Translator',
          authorId: user?.id,
        }),
      });

      if (!res.ok) throw new Error('Gagal submit terjemahan');
      setUserFile(null);
      selectEpisode(selectedEpisode);
      alert('Terjemahan berhasil dikirim!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cantosList = Array.from(new Set(episodes.map((ep) => ep.canto_name)));
  const currentEpisodes = episodes.filter((ep) => ep.canto_name === selectedCanto);

  return (
    <div className="flex h-screen bg-[#0d0e10] text-zinc-300 text-xs font-sans overflow-hidden">
      
      {/* SIDEBAR KIRI */}
      <aside className="w-80 border-r border-[#222327] bg-[#121316] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Link href="/limbus-id-tl" className="text-zinc-400 hover:text-white font-bold block transition">
            &larr; Layar Utama
          </Link>
          <h1 className="font-bold text-red-500 text-sm uppercase tracking-wider border-b border-[#222327] pb-2">
            CANTO STORY HUB
          </h1>

          {/* LIST BANNER CANTO */}
          <div className="space-y-3 overflow-y-auto pr-2 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider px-1">Pilih Canto</p>
            {cantosList.map((canto) => {
              const banner = episodes.find((e) => e.canto_name === canto && e.banner_url)?.banner_url;

              return (
                <div
                  key={canto}
                  onClick={() => {
                    setSelectedCanto(canto);
                    setSelectedEpisode(null);
                  }}
                  className={`group relative h-20 rounded-lg border-2 overflow-hidden cursor-pointer transition-all shadow-md ${
                    selectedCanto === canto
                      ? 'border-red-600 ring-2 ring-red-600/30'
                      : 'border-[#2a2b30] hover:border-zinc-500'
                  }`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url('${banner || 'https://gamebrott.com/wp-content/uploads/2025/08/image-86-1-1024x576.webp'}')`,
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />

                  <div className="relative z-10 h-full flex items-center justify-center p-2 text-center">
                    <span className="font-extrabold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-xs uppercase tracking-wider">
                      {canto}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="absolute top-1.5 right-1.5 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditCantoModal(canto, banner || '', e)}
                        className="bg-black/80 hover:bg-black text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteCanto(canto, e)}
                        className="bg-red-950/90 hover:bg-red-800 text-red-200 text-[10px] px-1.5 py-0.5 rounded border border-red-500/40 font-bold"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SIDEBAR */}
        <div className="pt-3 border-t border-[#222327]">
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded transition shadow text-xs"
            >
              + Admin: Tambah Episode
            </button>
          )}
        </div>
      </aside>

      {/* AREA KANAN */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {!selectedEpisode ? (
          <div className="space-y-4">
            <header className="border-b border-[#222327] pb-3">
              <span className="text-red-500 font-bold uppercase text-xs">Pilih Episode</span>
              <h2 className="text-2xl font-extrabold text-white">{selectedCanto || 'Daftar Episode'}</h2>
            </header>

            <div className="space-y-2 max-w-2xl">
              {currentEpisodes.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => selectEpisode(ep)}
                  className="group flex items-center justify-between p-3 rounded-lg bg-[#141518] border border-[#222327] hover:border-red-600/60 hover:bg-[#1a1b1f] cursor-pointer transition shadow"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 group-hover:scale-125 transition-transform" />
                    <span className="font-bold text-zinc-200 text-sm group-hover:text-amber-400 transition-colors">
                      {ep.episode_name}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditEpisodeModal(ep, e)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[10px] px-2 py-1 rounded border border-amber-500/40 font-bold"
                      >
                        Edit Episode
                      </button>
                      <button
                        onClick={(e) => handleDeleteEpisode(ep.id, e)}
                        className="bg-red-950 hover:bg-red-800 text-red-200 text-[10px] px-2 py-1 rounded border border-red-500/40 font-bold"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {currentEpisodes.length === 0 && (
                <p className="text-zinc-500 py-8">Belum ada episode di Canto ini.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <header className="border-b border-[#222327] pb-3">
              <button
                onClick={() => setSelectedEpisode(null)}
                className="text-red-400 hover:text-red-300 font-bold mb-2 block transition"
              >
                &larr; Kembali ke List Episode
              </button>
              <span className="text-red-500 font-bold uppercase">{selectedEpisode.canto_name}</span>
              <h2 className="text-2xl font-bold text-white">{selectedEpisode.episode_name}</h2>
            </header>

            {/* PREVIEW JSON */}
            <section className="bg-[#141518] border border-[#222327] rounded-lg overflow-hidden shadow-xl">
              <div className="bg-[#1a1b1f] px-4 py-2.5 border-b border-[#222327] flex justify-between items-center">
                <span className="font-bold text-amber-400">
                  File Mentah Original: <span className="text-zinc-200 font-mono text-[11px] ml-1">{selectedEpisode.original_file_url?.split('/').pop() || 'data.json'}</span>
                </span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">READ-ONLY JSON</span>
              </div>
              
              <div className="p-4 bg-[#0d0e10] font-mono text-[11px] leading-relaxed text-zinc-300 max-h-96 overflow-y-auto whitespace-pre-wrap break-words [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <pre><code>{originalJson}</code></pre>
              </div>
            </section>

            {/* FORM SUBMIT */}
            <section className="bg-[#14151a] border border-[#222327] rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-red-400">Submit Terjemahan Baru untuk {selectedEpisode.episode_name}</h3>
              <form onSubmit={handleUserSubmit} className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const r = new FileReader();
                      r.onload = (ev) => setUserFile({ name: file.name, content: JSON.parse(ev.target?.result as string) });
                      r.readAsText(file);
                    }
                  }}
                  className="text-xs text-zinc-400 file:bg-[#222327] file:text-zinc-200 file:border-0 file:px-3 file:py-1.5 file:rounded hover:file:bg-[#2e3035] cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={loading || !userFile}
                  className="bg-[#b91c1c] hover:bg-[#dc2626] disabled:bg-zinc-800 text-white font-bold px-4 py-1.5 rounded transition"
                >
                  {loading ? 'Uploading...' : 'Submit Terjemahan'}
                </button>
              </form>
            </section>

            {/* DAFTAR REVIEW SUBMISSION */}
            <section className="space-y-3">
              <h3 className="font-bold text-zinc-300">Daftar Review Terjemahan Komunitas</h3>
              
              {submissions.length === 0 && (
                <p className="text-zinc-500 text-xs italic">Belum ada submission terjemahan dari komunitas.</p>
              )}

              {submissions.map((sub) => (
                <div key={sub.id} className="bg-[#141518] border border-[#222327] p-3 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-200">{sub.author_name}</span>
                    
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          sub.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : sub.status === 'rejected'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                        }`}
                      >
                        {sub.status}
                      </span>

                      {isAdmin && (
                        <div className="flex items-center gap-1 ml-2">
                          {sub.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateSubmissionStatus(sub, 'approved')}
                              disabled={loading}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded font-bold transition disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}
                          {sub.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateSubmissionStatus(sub, 'rejected')}
                              disabled={loading}
                              className="bg-rose-900 hover:bg-rose-800 text-rose-200 text-[10px] px-2 py-0.5 rounded font-bold transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#1c1d22] p-3 rounded border border-[#26272e] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-bold text-zinc-200">{sub.file_name}</p>
                        <a
                          href={sub.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:underline text-[10px]"
                        >
                          Raw GitHub Link
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}
      </main>

      {/* MODAL ADMIN */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">
              {modalType === 'edit_canto' && `Admin: Edit Banner & Nama ${targetCantoName}`}
              {modalType === 'edit_episode' && `Admin: Edit ${editingEpisode?.episode_name}`}
              {modalType === 'add_episode' && 'Admin: Tambah Episode Baru'}
            </h3>

            <form onSubmit={handleAdminSubmit} className="space-y-3">
              {modalType === 'edit_canto' && (
                <>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Canto</label>
                    <input
                      type="text"
                      value={cantoName}
                      onChange={(e) => setCantoName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">URL Gambar Banner Canto</label>
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                      placeholder="https://example.com/banner.png"
                      required
                    />
                  </div>
                </>
              )}

              {modalType === 'edit_episode' && (
                <>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Episode</label>
                    <input
                      type="text"
                      value={episodeName}
                      onChange={(e) => setEpisodeName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Ganti File JSON Mentah (Opsional)</label>
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
                    />
                  </div>
                </>
              )}

              {modalType === 'add_episode' && (
                <>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Canto</label>
                    <input
                      type="text"
                      value={cantoName}
                      onChange={(e) => setCantoName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Episode</label>
                    <input
                      type="text"
                      value={episodeName}
                      onChange={(e) => setEpisodeName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">URL Gambar Banner Canto</label>
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                      placeholder="https://example.com/banner.png"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Upload File JSON Mentah Original</label>
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
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded"
                >
                  {loading ? 'Saving...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}