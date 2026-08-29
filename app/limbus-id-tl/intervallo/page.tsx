'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Episode {
  id: string;
  intervallo_name: string;
  episode_name: string;
  original_file_url: string;
  banner_url?: string;
  is_completed?: boolean;
}

interface Submission {
  id: string;
  episode_id?: string;
  file_name: string;
  file_url: string;
  status: string;
  author_name: string;
  author_id?: string;
  created_at: string;
}

export default function IntervalloTranslationPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedIntervallo, setSelectedIntervallo] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [originalJson, setOriginalJson] = useState<string>('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Modal States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [modalType, setModalType] = useState<'add_intervallo' | 'add_episode' | 'edit_intervallo' | 'edit_episode'>('add_intervallo');
  
  // Target Edit
  const [targetIntervalloName, setTargetIntervalloName] = useState('');
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);

  // Form Input States
  const [intervalloName, setIntervalloName] = useState('');
  const [episodeName, setEpisodeName] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [adminFile, setAdminFile] = useState<{ name: string; content: any } | null>(null);

  const [userFile, setUserFile] = useState<{ name: string; content: any } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEpisodes();

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      verifyAdmin(user);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      verifyAdmin(user);
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
    const { data: epData } = await supabase
      .from('episodes')
      .select('*')
      .not('intervallo_name', 'is', null)
      .neq('intervallo_name', '')
      .order('created_at', { ascending: true });

    const { data: subData } = await supabase
      .from('submissions')
      .select('episode_id, status')
      .eq('status', 'approved');

    if (epData && epData.length > 0) {
      const approvedEpIds = new Set(subData?.map((s) => s.episode_id) || []);
      const enrichedEpisodes = epData.map((ep) => ({
        ...ep,
        is_completed: approvedEpIds.has(ep.id),
      }));

      setEpisodes(enrichedEpisodes);
      if (!selectedIntervallo) {
        setSelectedIntervallo(enrichedEpisodes[0].intervallo_name);
      }
    } else {
      setEpisodes([]);
      setSelectedIntervallo('');
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

      await fetchEpisodes();
      if (selectedEpisode) await selectEpisode(selectedEpisode);

    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddIntervalloModal = () => {
    setModalType('add_intervallo');
    setIntervalloName('');
    setBannerUrl('');
    setShowAdminModal(true);
  };

  const openAddEpisodeModal = () => {
    setModalType('add_episode');
    setIntervalloName(selectedIntervallo || '');
    setEpisodeName('');
    setAdminFile(null);
    setShowAdminModal(true);
  };

  const openEditIntervalloModal = (intervallo: string, currentBanner: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('edit_intervallo');
    setTargetIntervalloName(intervallo);
    setIntervalloName(intervallo);
    setBannerUrl(currentBanner || '');
    setShowAdminModal(true);
  };

  const openEditEpisodeModal = (ep: Episode, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('edit_episode');
    setEditingEpisode(ep);
    setEpisodeName(ep.episode_name);
    setIntervalloName(ep.intervallo_name);
    setBannerUrl(ep.banner_url || '');
    setAdminFile(null);
    setShowAdminModal(true);
  };

  const handleDeleteIntervallo = async (intervalloToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`PERINGATAN: Menghapus "${intervalloToDelete}" akan menghapus SELURUH episode Intervallo ini.\n\nYakin ingin melanjutkan?`)) return;

    setLoading(true);
    try {
      const intervalloEpisodes = episodes.filter((ep) => ep.intervallo_name === intervalloToDelete);
      const episodeIds = intervalloEpisodes.map((ep) => ep.id);

      if (episodeIds.length > 0) {
        await supabase.from('submissions').delete().in('episode_id', episodeIds);
      }

      const { error } = await supabase.from('episodes').delete().eq('intervallo_name', intervalloToDelete);
      if (error) throw error;

      if (selectedIntervallo === intervalloToDelete) {
        setSelectedIntervallo('');
        setSelectedEpisode(null);
      }

      fetchEpisodes();
      alert(`Intervallo "${intervalloToDelete}" berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus Intervallo: ' + err.message);
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
      if (modalType === 'add_intervallo') {
        if (!intervalloName) return alert('Nama Intervallo tidak boleh kosong!');
        
        const { error } = await supabase.from('episodes').insert([{
          intervallo_name: intervalloName,
          episode_name: 'Episode 1',
          banner_url: bannerUrl,
          original_file_url: ''
        }]);

        if (error) throw error;
        setSelectedIntervallo(intervalloName);

      } else if (modalType === 'edit_intervallo') {
        const { error } = await supabase
          .from('episodes')
          .update({
            intervallo_name: intervalloName,
            banner_url: bannerUrl,
          })
          .eq('intervallo_name', targetIntervalloName);

        if (error) throw error;
        if (selectedIntervallo === targetIntervalloName) setSelectedIntervallo(intervalloName);

      } else if (modalType === 'edit_episode' && editingEpisode) {
        if (adminFile) {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'admin_original',
              episodeId: editingEpisode.id,
              intervalloName: editingEpisode.intervallo_name,
              episodeName,
              bannerUrl: editingEpisode.banner_url,
              fileName: adminFile.name,
              jsonContent: adminFile.content,
            }),
          });
          if (!res.ok) throw new Error('Gagal memperbarui file episode');
        } else {
          const { error } = await supabase
            .from('episodes')
            .update({ episode_name: episodeName })
            .eq('id', editingEpisode.id);

          if (error) throw error;
        }

      } else if (modalType === 'add_episode') {
        if (!adminFile) return alert('Pilih file JSON mentah!');
        
        const currentBanner = episodes.find((ep) => ep.intervallo_name === intervalloName)?.banner_url || '';

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'admin_original',
            intervalloName: intervalloName || selectedIntervallo,
            episodeName,
            bannerUrl: currentBanner,
            fileName: adminFile.name,
            jsonContent: adminFile.content,
          }),
        });
        if (!res.ok) throw new Error('Gagal membuat episode baru');
      }

      setShowAdminModal(false);
      await fetchEpisodes();

      if (editingEpisode && selectedEpisode?.id === editingEpisode.id) {
        await selectEpisode({ ...editingEpisode, episode_name: episodeName });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // HANDLER SUBMIT USER (MENCEGAH UPLOAD JIKA BELUM LOGIN)
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      return alert('Kamu harus login terlebih dahulu untuk mengirim terjemahan!');
    }

    if (!userFile || !selectedEpisode) return alert('Pilih file JSON terjemahan!');
    setLoading(true);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_submission',
          episodeId: selectedEpisode.id,
          fileName: userFile.name,
          jsonContent: userFile.content,
          authorName: currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'Translator',
          authorId: currentUser?.id,
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

  const intervallosList = Array.from(new Set(episodes.map((ep) => ep.intervallo_name)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const currentEpisodes = episodes
    .filter((ep) => ep.intervallo_name === selectedIntervallo)
    .sort((a, b) => a.episode_name.localeCompare(b.episode_name, undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <div className="flex h-screen bg-[#0d0e10] text-zinc-300 text-xs font-sans overflow-hidden">
      
      {/* SIDEBAR KIRI */}
      <aside className="w-80 border-r border-[#222327] bg-[#121316] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Link href="/limbus-id-tl" className="text-zinc-400 hover:text-white font-bold block transition">
            &larr; Layar Utama
          </Link>
          <h1 className="font-bold text-amber-500 text-sm uppercase tracking-wider border-b border-[#222327] pb-2">
            INTERVALLO STORY HUB
          </h1>

          {/* LIST BANNER INTERVALLO */}
          <div className="space-y-3 overflow-y-auto pr-2 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex justify-between items-center px-1">
              <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Pilih Intervallo</p>
            </div>

            {intervallosList.map((intervallo) => {
              const intervalloEps = episodes.filter((e) => e.intervallo_name === intervallo);
              const totalEps = intervalloEps.length;
              const completedEps = intervalloEps.filter((e) => e.is_completed).length;
              const banner = intervalloEps.find((e) => e.banner_url)?.banner_url;

              return (
                <div
                  key={intervallo}
                  onClick={() => {
                    setSelectedIntervallo(intervallo);
                    setSelectedEpisode(null);
                  }}
                  className={`group relative h-20 rounded-lg border-2 overflow-hidden cursor-pointer transition-all shadow-md ${
                    selectedIntervallo === intervallo
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
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

                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-2 text-center">
                    <span className="font-extrabold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-xs uppercase tracking-wider">
                      {intervallo}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full mt-1 border border-zinc-700/50">
                      Progress: {completedEps}/{totalEps}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="absolute top-1.5 right-1.5 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditIntervalloModal(intervallo, banner || '', e)}
                        className="bg-black/80 hover:bg-black text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteIntervallo(intervallo, e)}
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
        {isAdmin && (
          <div className="pt-3 border-t border-[#222327] space-y-2">
            <button
              onClick={openAddIntervalloModal}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded transition shadow text-xs"
            >
              + Admin: Tambah Banner Intervallo
            </button>
            <button
              onClick={openAddEpisodeModal}
              className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded transition shadow text-xs"
            >
              + Admin: Tambah Episode Intervallo
            </button>
          </div>
        )}
      </aside>

      {/* AREA KANAN */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {!selectedEpisode ? (
          <div className="space-y-4">
            <header className="border-b border-[#222327] pb-3 flex justify-between items-end">
              <div>
                <span className="text-amber-500 font-bold uppercase text-xs">Pilih Episode Intervallo</span>
                <h2 className="text-2xl font-extrabold text-white">{selectedIntervallo || 'Daftar Episode'}</h2>
                
                <div className="flex items-center gap-4 mt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-300">Hijau = Sudah Selesai</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-zinc-300">Merah = Belum Selesai</span>
                  </div>
                </div>
              </div>
            </header>

            <div className="space-y-2 max-w-2xl">
              {currentEpisodes.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => selectEpisode(ep)}
                  className="group flex items-center justify-between p-3 rounded-lg bg-[#141518] border border-[#222327] hover:border-amber-600/60 hover:bg-[#1a1b1f] cursor-pointer transition shadow"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 ${
                        ep.is_completed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'
                      }`}
                    />
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
                <p className="text-zinc-500 py-8">Belum ada episode di Intervallo ini.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <header className="border-b border-[#222327] pb-3">
              <button
                onClick={() => setSelectedEpisode(null)}
                className="text-amber-400 hover:text-amber-300 font-bold mb-2 block transition"
              >
                &larr; Kembali ke List Episode
              </button>
              <span className="text-amber-500 font-bold uppercase">{selectedEpisode.intervallo_name}</span>
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

            {/* FORM SUBMIT / BANNER COMPLETED / WARNING LOGIN */}
            {selectedEpisode.is_completed ? (
              <section className="bg-[#101f18] border border-emerald-800/40 rounded-lg p-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                  <div>
                    <h3 className="font-bold text-emerald-400 text-sm">
                      Terjemahan Episode Ini Sudah Selesai & Disetujui
                    </h3>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Submission baru sudah ditutup untuk episode ini.
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider">
                  COMPLETED
                </span>
              </section>
            ) : !currentUser ? (
              <div className="bg-[#131418] border border-[#222327] rounded-lg p-4 text-center text-zinc-400 font-medium">
                Kamu harus <span className="text-amber-500 font-bold">login</span> terlebih dahulu untuk dapat mengirim terjemahan.
              </div>
            ) : (
              <section className="bg-[#14151a] border border-[#222327] rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-amber-400">Submit Terjemahan Baru untuk {selectedEpisode.episode_name}</h3>
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
                    className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 text-white font-bold px-4 py-1.5 rounded transition"
                  >
                    {loading ? 'Uploading...' : 'Submit Terjemahan'}
                  </button>
                </form>
              </section>
            )}

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
                          className="text-amber-400 hover:underline text-[10px]"
                        >
                          Raw Link
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
              {modalType === 'add_intervallo' && 'Admin: Tambah Banner Intervallo Baru'}
              {modalType === 'edit_intervallo' && `Admin: Edit Banner & Nama ${targetIntervalloName}`}
              {modalType === 'edit_episode' && `Admin: Edit ${editingEpisode?.episode_name}`}
              {modalType === 'add_episode' && 'Admin: Tambah Content Intervallo Baru'}
            </h3>

            <form onSubmit={handleAdminSubmit} className="space-y-3">
              {modalType === 'add_intervallo' && (
                <>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Intervallo Baru</label>
                    <input
                      type="text"
                      value={intervalloName}
                      onChange={(e) => setIntervalloName(e.target.value)}
                      placeholder="Contoh: Intervallo 1"
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">URL Gambar Banner Intervallo</label>
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

              {modalType === 'edit_intervallo' && (
                <>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Intervallo</label>
                    <input
                      type="text"
                      value={intervalloName}
                      onChange={(e) => setIntervalloName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">URL Gambar Banner Intervallo</label>
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
                    <label className="block text-zinc-400 mb-1">Pilih Target Intervallo</label>
                    <select
                      value={intervalloName}
                      onChange={(e) => setIntervalloName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    >
                      <option value="">-- Pilih Intervallo --</option>
                      {intervallosList.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Episode</label>
                    <input
                      type="text"
                      value={episodeName}
                      onChange={(e) => setEpisodeName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      placeholder="Contoh: Episode 1"
                      required
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