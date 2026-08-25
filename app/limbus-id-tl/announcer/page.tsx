'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface AnnouncerContent {
  id: string;
  announcer_name: string;
  content_name: string;
  original_file_url: string;
  banner_url?: string;
  is_completed?: boolean;
}

interface AnnouncerSubmission {
  id: string;
  content_id?: string;
  file_name: string;
  file_url: string;
  status: string;
  author_name: string;
  author_id?: string;
  created_at: string;
}

export default function AnnouncerTranslationPage() {
  const [contents, setContents] = useState<AnnouncerContent[]>([]);
  const [selectedAnnouncer, setSelectedAnnouncer] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<AnnouncerContent | null>(null);
  const [submissions, setSubmissions] = useState<AnnouncerSubmission[]>([]);
  const [originalJson, setOriginalJson] = useState<string>('');

  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal States
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [showEditAnnouncerModal, setShowEditAnnouncerModal] = useState(false);
  const [showEditContentModal, setShowEditContentModal] = useState(false);
  
  // Edit & Input States
  const [targetAnnouncerName, setTargetAnnouncerName] = useState('');
  const [editingContent, setEditingContent] = useState<AnnouncerContent | null>(null);

  const [announcerName, setAnnouncerName] = useState('');
  const [contentName, setContentName] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [targetAnnouncerSelect, setTargetAnnouncerSelect] = useState('');
  
  const [adminFile, setAdminFile] = useState<{ name: string; content: any } | null>(null);
  const [userFile, setUserFile] = useState<{ name: string; content: any } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchContents();

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

  const fetchContents = async () => {
    const { data: contentData } = await supabase.from('announcer_contents').select('*').order('announcer_name');
    const { data: subData } = await supabase.from('announcer_submissions').select('content_id, status').eq('status', 'approved');

    if (contentData && contentData.length > 0) {
      const approvedIds = new Set(subData?.map((s) => s.content_id) || []);
      const enrichedContents = contentData.map((item) => ({
        ...item,
        is_completed: approvedIds.has(item.id),
      }));

      setContents(enrichedContents);
      if (!selectedAnnouncer) {
        setSelectedAnnouncer(enrichedContents[0].announcer_name);
      }
    } else {
      setContents([]);
      setSelectedAnnouncer('');
    }
  };

  const selectContent = async (item: AnnouncerContent) => {
    setSelectedContent(item);

    if (item.original_file_url) {
      try {
        const cacheBusterUrl = `${item.original_file_url}?t=${Date.now()}`;
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
      .from('announcer_submissions')
      .select('*')
      .eq('content_id', item.id)
      .order('created_at', { ascending: false });

    if (data) setSubmissions(data);
  };

  const handleUpdateSubmissionStatus = async (sub: AnnouncerSubmission, newStatus: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('announcer_submissions')
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

      await fetchContents();
      if (selectedContent) await selectContent(selectedContent);

    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // HANDLER ACTION FORM
  const handleAddBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('announcer_contents').insert([
        {
          announcer_name: announcerName,
          content_name: 'Content 1',
          banner_url: bannerUrl,
          original_file_url: '',
        },
      ]);
      if (error) throw error;

      setShowAddBannerModal(false);
      setAnnouncerName('');
      setBannerUrl('');
      await fetchContents();
      alert('Banner Announcer berhasil ditambahkan!');
    } catch (err: any) {
      alert('Gagal membuat Banner: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFile) return alert('Pilih file JSON mentah!');
    if (!targetAnnouncerSelect) return alert('Pilih Announcer!');
    setLoading(true);

    try {
      const currentBanner = contents.find((item) => item.announcer_name === targetAnnouncerSelect)?.banner_url || '';

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_announcer_original',
          announcerName: targetAnnouncerSelect,
          contentName,
          bannerUrl: currentBanner,
          fileName: adminFile.name,
          jsonContent: adminFile.content,
        }),
      });

      if (!res.ok) throw new Error('Gagal membuat Content baru');

      setShowAddContentModal(false);
      setContentName('');
      setAdminFile(null);
      await fetchContents();
      alert('Content Announcer berhasil ditambahkan!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAnnouncerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('announcer_contents')
        .update({ announcer_name: announcerName, banner_url: bannerUrl })
        .eq('announcer_name', targetAnnouncerName);

      if (error) throw error;
      if (selectedAnnouncer === targetAnnouncerName) setSelectedAnnouncer(announcerName);

      setShowEditAnnouncerModal(false);
      await fetchContents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent) return;
    setLoading(true);
    try {
      if (adminFile) {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'admin_announcer_original',
            contentId: editingContent.id,
            announcerName: editingContent.announcer_name,
            contentName,
            bannerUrl: editingContent.banner_url,
            fileName: adminFile.name,
            jsonContent: adminFile.content,
          }),
        });
        if (!res.ok) throw new Error('Gagal memperbarui file content');
      } else {
        const { error } = await supabase
          .from('announcer_contents')
          .update({ content_name: contentName })
          .eq('id', editingContent.id);

        if (error) throw error;
      }

      setShowEditContentModal(false);
      await fetchContents();

      if (selectedContent?.id === editingContent.id) {
        await selectContent({ ...editingContent, content_name: contentName });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncer = async (announcerToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`PERINGATAN: Menghapus "${announcerToDelete}" akan menghapus SELURUH content dan terjemahan di dalamnya.\n\nYakin ingin melanjutkan?`)) return;

    setLoading(true);
    try {
      const announcerItems = contents.filter((item) => item.announcer_name === announcerToDelete);
      const contentIds = announcerItems.map((item) => item.id);

      if (contentIds.length > 0) {
        await supabase.from('announcer_submissions').delete().in('content_id', contentIds);
      }

      const { error } = await supabase.from('announcer_contents').delete().eq('announcer_name', announcerToDelete);
      if (error) throw error;

      if (selectedAnnouncer === announcerToDelete) {
        setSelectedAnnouncer('');
        setSelectedContent(null);
      }

      fetchContents();
      alert(`Banner Announcer "${announcerToDelete}" berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus Announcer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Yakin ingin menghapus content ini beserta semua terjemahannya?')) return;

    setLoading(true);
    try {
      await supabase.from('announcer_submissions').delete().eq('content_id', id);
      await supabase.from('announcer_contents').delete().eq('id', id);
      fetchContents();
      if (selectedContent?.id === id) setSelectedContent(null);
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFile || !selectedContent) return alert('Pilih file JSON terjemahan!');
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_announcer_submission',
          contentId: selectedContent.id,
          fileName: userFile.name,
          jsonContent: userFile.content,
          authorName: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Translator',
          authorId: user?.id,
        }),
      });

      if (!res.ok) throw new Error('Gagal submit terjemahan');
      setUserFile(null);
      selectContent(selectedContent);
      alert('Terjemahan berhasil dikirim!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const announcersList = Array.from(new Set(contents.map((item) => item.announcer_name)));
  const currentContents = contents.filter((item) => item.announcer_name === selectedAnnouncer);

  return (
    <div className="flex h-screen bg-[#0d0e10] text-zinc-300 text-xs font-sans overflow-hidden">
      
      {/* SIDEBAR KIRI */}
      <aside className="w-80 border-r border-[#222327] bg-[#121316] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Link href="/limbus-id-tl" className="text-zinc-400 hover:text-white font-bold block transition">
            &larr; Layar Utama
          </Link>
          <h1 className="font-bold text-red-500 text-sm uppercase tracking-wider border-b border-[#222327] pb-2">
            ANNOUNCER HUB
          </h1>

          {/* LIST BANNER ANNOUNCER */}
          <div className="space-y-3 overflow-y-auto pr-2 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider px-1">Pilih Announcer</p>
            {announcersList.map((announcer) => {
              const announcerItems = contents.filter((e) => e.announcer_name === announcer);
              const totalItems = announcerItems.length;
              const completedItems = announcerItems.filter((e) => e.is_completed).length;
              const banner = announcerItems.find((e) => e.banner_url)?.banner_url;

              return (
                <div
                  key={announcer}
                  onClick={() => {
                    setSelectedAnnouncer(announcer);
                    setSelectedContent(null);
                  }}
                  className={`group relative h-20 rounded-lg border-2 overflow-hidden cursor-pointer transition-all shadow-md ${
                    selectedAnnouncer === announcer
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

                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-2 text-center">
                    <span className="font-extrabold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-xs uppercase tracking-wider">
                      {announcer}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full mt-1 border border-zinc-700/50">
                      Progress: {completedItems}/{totalItems}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="absolute top-1.5 right-1.5 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetAnnouncerName(announcer);
                          setAnnouncerName(announcer);
                          setBannerUrl(banner || '');
                          setShowEditAnnouncerModal(true);
                        }}
                        className="bg-black/80 hover:bg-black text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteAnnouncer(announcer, e)}
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

        {/* BOTTOM SIDEBAR (DUA TOMBOL TERPISAH) */}
        {isAdmin && (
          <div className="pt-3 border-t border-[#222327] space-y-2">
            <button
              onClick={() => {
                setAnnouncerName('');
                setBannerUrl('');
                setShowAddBannerModal(true);
              }}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded transition shadow text-xs"
            >
              + Admin: Tambah Banner
            </button>
            <button
              onClick={() => {
                setTargetAnnouncerSelect(selectedAnnouncer || announcersList[0] || '');
                setContentName('');
                setAdminFile(null);
                setShowAddContentModal(true);
              }}
              className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded transition shadow text-xs"
            >
              + Admin: Tambah Content
            </button>
          </div>
        )}
      </aside>

      {/* AREA KANAN */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {!selectedContent ? (
          <div className="space-y-4">
            <header className="border-b border-[#222327] pb-3">
              <span className="text-red-500 font-bold uppercase text-xs">Pilih Content</span>
              <h2 className="text-2xl font-extrabold text-white">{selectedAnnouncer || 'Daftar Content'}</h2>
              
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
            </header>

            <div className="space-y-2 max-w-2xl">
              {currentContents.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectContent(item)}
                  className="group flex items-center justify-between p-3 rounded-lg bg-[#141518] border border-[#222327] hover:border-red-600/60 hover:bg-[#1a1b1f] cursor-pointer transition shadow"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125 ${
                        item.is_completed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'
                      }`}
                    />
                    <span className="font-bold text-zinc-200 text-sm group-hover:text-amber-400 transition-colors">
                      {item.content_name}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingContent(item);
                          setContentName(item.content_name);
                          setShowEditContentModal(true);
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[10px] px-2 py-1 rounded border border-amber-500/40 font-bold"
                      >
                        Edit Content
                      </button>
                      <button
                        onClick={(e) => handleDeleteContent(item.id, e)}
                        className="bg-red-950 hover:bg-red-800 text-red-200 text-[10px] px-2 py-1 rounded border border-red-500/40 font-bold"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {currentContents.length === 0 && (
                <p className="text-zinc-500 py-8">Belum ada content di Announcer ini.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <header className="border-b border-[#222327] pb-3">
              <button
                onClick={() => setSelectedContent(null)}
                className="text-red-400 hover:text-red-300 font-bold mb-2 block transition"
              >
                &larr; Kembali ke List Content
              </button>
              <span className="text-red-500 font-bold uppercase">{selectedContent.announcer_name}</span>
              <h2 className="text-2xl font-bold text-white">{selectedContent.content_name}</h2>
            </header>

            {/* PREVIEW JSON */}
            <section className="bg-[#141518] border border-[#222327] rounded-lg overflow-hidden shadow-xl">
              <div className="bg-[#1a1b1f] px-4 py-2.5 border-b border-[#222327] flex justify-between items-center">
                <span className="font-bold text-amber-400">
                  File Mentah Original: <span className="text-zinc-200 font-mono text-[11px] ml-1">{selectedContent.original_file_url?.split('/').pop() || 'data.json'}</span>
                </span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">READ-ONLY JSON</span>
              </div>
              
              <div className="p-4 bg-[#0d0e10] font-mono text-[11px] leading-relaxed text-zinc-300 max-h-96 overflow-y-auto whitespace-pre-wrap break-words [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <pre><code>{originalJson}</code></pre>
              </div>
            </section>

            {/* FORM SUBMIT TRANSLATION / STATUS COMPLETED */}
            {selectedContent.is_completed ? (
              <section className="bg-[#101f18] border border-emerald-800/40 rounded-lg p-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                  <div>
                    <h3 className="font-bold text-emerald-400 text-sm">
                      Terjemahan Content Ini Sudah Selesai & Disetujui
                    </h3>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Submission baru sudah ditutup untuk content ini.
                    </p>
                  </div>
                </div>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider">
                  COMPLETED
                </span>
              </section>
            ) : (
              <section className="bg-[#14151a] border border-[#222327] rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-red-400">Submit Terjemahan Baru untuk {selectedContent.content_name}</h3>
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
            )}

            {/* REVIEW SUBMISSIONS */}
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
                          Link Github
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

      {/* MODAL 1: TAMBAH BANNER ANNOUNCER */}
      {showAddBannerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Tambah Banner Announcer</h3>

            <form onSubmit={handleAddBannerSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Nama Announcer</label>
                <input
                  type="text"
                  placeholder="misal: Malkuth"
                  value={announcerName}
                  onChange={(e) => setAnnouncerName(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">URL Gambar Banner Announcer</label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.png"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBannerModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded"
                >
                  {loading ? 'Simpan...' : 'Simpan Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH CONTENT */}
      {showAddContentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-red-400 font-bold text-sm">Admin: Tambah Content Baru</h3>

            <form onSubmit={handleAddContentSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Pilih Announcer Target</label>
                <select
                  value={targetAnnouncerSelect}
                  onChange={(e) => setTargetAnnouncerSelect(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                  required
                >
                  <option value="">-- Pilih Announcer --</option>
                  {announcersList.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Nama Content</label>
                <input
                  type="text"
                  placeholder="misal: Voice Pack 1"
                  value={contentName}
                  onChange={(e) => setContentName(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContentModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded"
                >
                  {loading ? 'Uploading...' : 'Simpan Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT ANNOUNCER */}
      {showEditAnnouncerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Edit Banner & Nama {targetAnnouncerName}</h3>

            <form onSubmit={handleEditAnnouncerSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Nama Announcer</label>
                <input
                  type="text"
                  value={announcerName}
                  onChange={(e) => setAnnouncerName(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">URL Gambar Banner Announcer</label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditAnnouncerModal(false)}
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

      {/* MODAL EDIT CONTENT */}
      {showEditContentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Edit {editingContent?.content_name}</h3>

            <form onSubmit={handleEditContentSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Nama Content</label>
                <input
                  type="text"
                  value={contentName}
                  onChange={(e) => setContentName(e.target.value)}
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditContentModal(false)}
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