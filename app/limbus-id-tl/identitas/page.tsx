'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Cropper from 'react-easy-crop';
import { supabase } from '@/lib/supabase';
import { getCroppedImg } from '@/lib/cropImage';

interface IdentityContent {
  id: string;
  sinner_name: string;
  identity_name: string;
  content_name: string;
  original_file_url: string;
  banner_url?: string;
  is_completed?: boolean;
}

interface Submission {
  id: string;
  content_id?: string;
  file_name: string;
  file_url: string;
  status: string;
  author_name: string;
  author_id?: string;
  created_at: string;
}

const SINNERS = [
  'Yi Sang', 'Faust', 'Don Quixote', 'Ryōshū', 'Meursault',
  'Hong Lu', 'Heathcliff', 'Ishmael', 'Rodya', 'Sinclair', 'Outis', 'Gregor'
];

const SINNER_LOGOS: Record<string, string> = {
  'Yi Sang': 'https://limbuscompany.wiki.gg/images/thumb/Yi_Sang_Icon.png/85px-Yi_Sang_Icon.png?1c8a59',
  'Faust': 'https://limbuscompany.wiki.gg/images/thumb/Faust_Icon.png/84px-Faust_Icon.png?e73afa',
  'Don Quixote': 'https://limbuscompany.wiki.gg/images/thumb/Don_Quixote_Icon.png/85px-Don_Quixote_Icon.png?98e4f5',
  'Ryōshū': 'https://limbuscompany.wiki.gg/images/thumb/Ryoshu_Icon.png/84px-Ryoshu_Icon.png?72b81e',
  'Meursault': 'https://limbuscompany.wiki.gg/images/thumb/Meursault_Icon.png/85px-Meursault_Icon.png?922414',
  'Hong Lu': 'https://limbuscompany.wiki.gg/images/thumb/Hong_Lu_Icon.png/86px-Hong_Lu_Icon.png?b8df15',
  'Heathcliff': 'https://limbuscompany.wiki.gg/images/thumb/Heathcliff_Icon.png/104px-Heathcliff_Icon.png?49a19b',
  'Ishmael': 'https://limbuscompany.wiki.gg/images/thumb/Ishmael_Icon.png/96px-Ishmael_Icon.png?a065b7',
  'Rodya': 'https://limbuscompany.wiki.gg/images/thumb/Rodion_Icon.png/86px-Rodion_Icon.png?7509f1',
  'Sinclair': 'https://limbuscompany.wiki.gg/images/thumb/Sinclair_Icon.png/83px-Sinclair_Icon.png?4de74b',
  'Outis': 'https://limbuscompany.wiki.gg/images/thumb/Outis_Icon.png/79px-Outis_Icon.png?2b8431',
  'Gregor': 'https://limbuscompany.wiki.gg/images/thumb/Gregor_Icon.png/84px-Gregor_Icon.png?fd02d8',
};

export default function IdentityTranslationPage() {
  const [contents, setContents] = useState<IdentityContent[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<IdentityContent | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [originalJson, setOriginalJson] = useState<string>('');
  const [activeSinnerFilter, setActiveSinnerFilter] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  
  // Modal States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [modalType, setModalType] = useState<'add_identity_banner' | 'add_identity_content' | 'edit_identity_banner' | 'edit_identity_content'>('add_identity_banner');
  
  // Target Edit / Form Inputs
  const [targetIdentityName, setTargetIdentityName] = useState('');
  const [editingContent, setEditingContent] = useState<IdentityContent | null>(null);

  const [sinnerName, setSinnerName] = useState(SINNERS[0]);
  const [identityName, setIdentityName] = useState('');
  const [contentName, setContentName] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [adminFile, setAdminFile] = useState<{ name: string; content: any } | null>(null);

  const [userFile, setUserFile] = useState<{ name: string; content: any } | null>(null);
  const [loading, setLoading] = useState(false);

  // --- CROPPER STATES ---
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

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
    const { data: itemData } = await supabase
      .from('identity_contents')
      .select('*')
      .order('created_at', { ascending: true });

    const { data: subData } = await supabase
      .from('identity_submissions')
      .select('content_id, status')
      .eq('status', 'approved');

    if (itemData && itemData.length > 0) {
      const approvedIds = new Set(subData?.map((s) => s.content_id) || []);
      const enriched = itemData.map((item) => ({
        ...item,
        is_completed: approvedIds.has(item.id),
      }));

      setContents(enriched);
      if (!selectedIdentity) {
        setSelectedIdentity(enriched[0].identity_name);
      }
    } else {
      setContents([]);
      setSelectedIdentity('');
    }
  };

  const selectContent = async (item: IdentityContent) => {
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
      .from('identity_submissions')
      .select('*')
      .eq('content_id', item.id)
      .order('created_at', { ascending: false });

    if (data) setSubmissions(data);
  };

  const handleUpdateSubmissionStatus = async (sub: Submission, newStatus: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('identity_submissions')
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

            alert(`Submission disetujui! +${idCount} kontribusi berhasil ditambahkan.`);
          }
        } catch (e) {
          alert('Status disetujui, namun gagal menghitung poin kontribusi.');
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

  // Open Modals
  const openAddIdentityBannerModal = () => {
    setModalType('add_identity_banner');
    setSinnerName(SINNERS[0]);
    setIdentityName('');
    setBannerUrl('');
    setShowAdminModal(true);
  };

  const openAddIdentityContentModal = () => {
    setModalType('add_identity_content');
    setIdentityName(selectedIdentity || '');
    setContentName('');
    setAdminFile(null);
    setShowAdminModal(true);
  };

  const openEditIdentityBannerModal = (idName: string, currentBanner: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('edit_identity_banner');
    setTargetIdentityName(idName);
    setIdentityName(idName);
    setBannerUrl(currentBanner || '');
    setShowAdminModal(true);
  };

  const openEditContentModal = (item: IdentityContent, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalType('edit_identity_content');
    setEditingContent(item);
    setContentName(item.content_name);
    setIdentityName(item.identity_name);
    setAdminFile(null);
    setShowAdminModal(true);
  };

  const handleDeleteIdentityBanner = async (idNameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`PERINGATAN: Menghapus "${idNameToDelete}" akan menghapus SELURUH content identitas ini.\n\nYakin ingin melanjutkan?`)) return;

    setLoading(true);
    try {
      const itemsToDelete = contents.filter((c) => c.identity_name === idNameToDelete);
      const ids = itemsToDelete.map((c) => c.id);

      if (ids.length > 0) {
        await supabase.from('identity_submissions').delete().in('content_id', ids);
      }

      const { error } = await supabase.from('identity_contents').delete().eq('identity_name', idNameToDelete);
      if (error) throw error;

      if (selectedIdentity === idNameToDelete) {
        setSelectedIdentity('');
        setSelectedContent(null);
      }

      fetchContents();
      alert(`Identitas "${idNameToDelete}" berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Yakin ingin menghapus content ini beserta submission-nya?')) return;

    setLoading(true);
    try {
      await supabase.from('identity_submissions').delete().eq('content_id', id);
      await supabase.from('identity_contents').delete().eq('id', id);
      fetchContents();
      if (selectedContent?.id === id) setSelectedContent(null);
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // CROPPER HANDLERS
  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleStartCrop = () => {
    if (!bannerUrl) return alert('Masukkan URL Gambar terlebih dahulu!');
    
    // Melewatkan URL external ke Proxy API agar tidak kena CORS di canvas
    const proxiedUrl = bannerUrl.startsWith('data:')
      ? bannerUrl
      : `/api/proxy-image?url=${encodeURIComponent(bannerUrl)}`;

    setRawImageSrc(proxiedUrl);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setShowCropper(true);
  };

  const handleSaveCroppedImage = async () => {
    try {
      const croppedImageBase64 = await getCroppedImg(rawImageSrc, croppedAreaPixels);
      setBannerUrl(croppedImageBase64);
      setShowCropper(false);
    } catch (e) {
      alert('Gagal memotong gambar. Pastikan URL gambar dapat diakses.');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalType === 'add_identity_banner') {
        if (!identityName) return alert('Nama Identitas tidak boleh kosong!');
        
        const { error } = await supabase.from('identity_contents').insert([{
          sinner_name: sinnerName,
          identity_name: identityName,
          content_name: 'Main Data',
          banner_url: bannerUrl,
          original_file_url: ''
        }]);

        if (error) throw error;
        setSelectedIdentity(identityName);

      } else if (modalType === 'edit_identity_banner') {
        const { error } = await supabase
          .from('identity_contents')
          .update({
            identity_name: identityName,
            banner_url: bannerUrl,
          })
          .eq('identity_name', targetIdentityName);

        if (error) throw error;
        if (selectedIdentity === targetIdentityName) setSelectedIdentity(identityName);

      } else if (modalType === 'edit_identity_content' && editingContent) {
        if (adminFile) {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'admin_identity_original',
              contentId: editingContent.id,
              sinnerName: editingContent.sinner_name,
              identityName: editingContent.identity_name,
              contentName,
              fileName: adminFile.name,
              jsonContent: adminFile.content,
            }),
          });
          if (!res.ok) throw new Error('Gagal memperbarui file content');
        } else {
          const { error } = await supabase
            .from('identity_contents')
            .update({ content_name: contentName })
            .eq('id', editingContent.id);

          if (error) throw error;
        }

      } else if (modalType === 'add_identity_content') {
        if (!adminFile) return alert('Pilih file JSON mentah!');
        
        const targetObj = contents.find((c) => c.identity_name === identityName);
        const targetSinner = targetObj?.sinner_name || sinnerName;
        const targetBanner = targetObj?.banner_url || '';

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'admin_identity_original',
            sinnerName: targetSinner,
            identityName: identityName || selectedIdentity,
            contentName,
            bannerUrl: targetBanner,
            fileName: adminFile.name,
            jsonContent: adminFile.content,
          }),
        });
        if (!res.ok) throw new Error('Gagal membuat content baru');
      }

      setShowAdminModal(false);
      await fetchContents();

      if (editingContent && selectedContent?.id === editingContent.id) {
        await selectContent({ ...editingContent, content_name: contentName });
      }
    } catch (err: any) {
      alert(err.message);
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
          type: 'user_identity_submission',
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

  const uniqueIdentitiesList = Array.from(new Set(contents.map((c) => c.identity_name))).filter(Boolean);
  const currentSubContents = contents.filter((c) => c.identity_name === selectedIdentity);

  return (
    <div className="flex h-screen bg-[#0d0e10] text-zinc-300 text-xs font-sans overflow-hidden">
      
      {/* SIDEBAR KIRI */}
      <aside className="w-80 border-r border-[#222327] bg-[#121316] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Link href="/limbus-id-tl" className="text-zinc-400 hover:text-white font-bold block transition">
            &larr; Layar Utama
          </Link>
          <h1 className="font-bold text-red-500 text-sm uppercase tracking-wider border-b border-[#222327] pb-2">
            IDENTITAS HUB
          </h1>

          {/* GRID ICON SINNER */}
          <div className="grid grid-cols-6 gap-2 py-1 border-b border-[#222327]">
            {SINNERS.map((sinner) => {
              const isSelected = activeSinnerFilter === sinner;
              const logoUrl = SINNER_LOGOS[sinner] || '';

              return (
                <button
                  key={sinner}
                  onClick={() => setActiveSinnerFilter(isSelected ? null : sinner)}
                  title={sinner}
                  className={`relative flex items-center justify-center p-1 transition-all rounded ${
                    isSelected
                      ? 'opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <img
                    src={logoUrl}
                    alt={sinner}
                    className="w-8 h-8 object-contain"
                  />
                </button>
              );
            })}
          </div>

          {/* DAFTAR BANNER IDENTITAS PER SINNER */}
          <div className="space-y-4 overflow-y-auto pr-2 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {SINNERS.filter(s => !activeSinnerFilter || s === activeSinnerFilter).map((sinner) => {
              const sinnerIdentities = uniqueIdentitiesList.filter(idName => {
                const sample = contents.find(c => c.identity_name === idName);
                return sample?.sinner_name === sinner;
              });

              return (
                <div key={sinner} className="space-y-2">
                  <div className="flex justify-between items-center px-1 border-b border-[#1c1d22] pb-1">
                    <span className="font-extrabold text-red-500 text-xs uppercase tracking-wider">
                      {sinner}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {sinnerIdentities.length} Identitas
                    </span>
                  </div>

                  {sinnerIdentities.length === 0 ? (
                    <p className="text-zinc-600 text-[10px] italic px-1">Belum ada data identitas.</p>
                  ) : (
                    sinnerIdentities.map((idName) => {
                      const groupItems = contents.filter(c => c.identity_name === idName);
                      const sampleObj = groupItems.find(c => c.banner_url) || groupItems[0];
                      const banner = sampleObj?.banner_url;
                      const totalSub = groupItems.length;
                      const completedSub = groupItems.filter(c => c.is_completed).length;

                      return (
                        <div
                          key={idName}
                          onClick={() => {
                            setSelectedIdentity(idName);
                            setSelectedContent(null);
                          }}
                          className={`group relative h-16 rounded-lg border-2 overflow-hidden cursor-pointer transition-all shadow-md bg-cover bg-center ${
                            selectedIdentity === idName
                              ? 'border-red-500 ring-2 ring-red-500/30'
                              : 'border-[#2a2b30] hover:border-zinc-500'
                          }`}
                          style={{
                            backgroundImage: `url('${banner || 'https://gamebrott.com/wp-content/uploads/2025/08/image-86-1-1024x576.webp'}')`,
                          }}
                        >
                          <div className="absolute inset-0 bg-black/65 group-hover:bg-black/40 transition-colors" />

                          <div className="relative z-10 h-full flex flex-col items-start justify-center p-2.5">
                            <span className="font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-xs tracking-wide">
                              {idName}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-300 bg-black/70 px-2 py-0.5 rounded-full mt-1 border border-zinc-700/50">
                              Files: {completedSub}/{totalSub}
                            </span>
                          </div>

                          {isAdmin && (
                            <div className="absolute top-1.5 right-1.5 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => openEditIdentityBannerModal(idName, banner || '', e)}
                                className="bg-black/80 hover:bg-black text-amber-400 text-[9px] px-1.5 py-0.5 rounded border border-amber-500/40 font-bold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => handleDeleteIdentityBanner(idName, e)}
                                className="bg-red-950/90 hover:bg-red-800 text-red-200 text-[9px] px-1.5 py-0.5 rounded border border-red-500/40 font-bold"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SIDEBAR */}
        {isAdmin && (
          <div className="pt-3 border-t border-[#222327] space-y-2 shrink-0">
            <button
              onClick={openAddIdentityBannerModal}
              className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded transition shadow text-xs"
            >
              + Admin: Tambah Banner Identitas
            </button>
            <button
              onClick={openAddIdentityContentModal}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-1.5 px-3 rounded transition shadow text-xs border border-zinc-700"
            >
              + Admin: Tambah Content File
            </button>
          </div>
        )}
      </aside>

      {/* AREA KANAN */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {!selectedContent ? (
          <div className="space-y-4">
            <header className="border-b border-[#222327] pb-3 flex justify-between items-end">
              <div>
                <span className="text-red-500 font-bold uppercase text-xs">Pilih File/Sub-Content Identitas</span>
                <h2 className="text-2xl font-extrabold text-white">{selectedIdentity || 'Daftar Identitas'}</h2>
                
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
              {currentSubContents.map((item) => (
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
                    <span className="font-bold text-zinc-200 text-sm group-hover:text-red-400 transition-colors">
                      {item.content_name}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditContentModal(item, e)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[10px] px-2 py-1 rounded border border-amber-500/40 font-bold"
                      >
                        Edit
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

              {currentSubContents.length === 0 && (
                <p className="text-zinc-500 py-8">Pilih salah satu Identitas di sidebar kiri.</p>
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
                &larr; Kembali ke Daftar Content
              </button>
              <span className="text-red-500 font-bold uppercase">{selectedContent.identity_name} ({selectedContent.sinner_name})</span>
              <h2 className="text-2xl font-bold text-white">{selectedContent.content_name}</h2>
            </header>

            {/* PREVIEW JSON */}
            <section className="bg-[#141518] border border-[#222327] rounded-lg overflow-hidden shadow-xl">
              <div className="bg-[#1a1b1f] px-4 py-2.5 border-b border-[#222327] flex justify-between items-center">
                <span className="font-bold text-red-400">
                  File Mentah Original: <span className="text-zinc-200 font-mono text-[11px] ml-1">{selectedContent.original_file_url?.split('/').pop() || 'data.json'}</span>
                </span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">READ-ONLY JSON</span>
              </div>
              
              <div className="p-4 bg-[#0d0e10] font-mono text-[11px] leading-relaxed text-zinc-300 max-h-96 overflow-y-auto whitespace-pre-wrap break-words [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <pre><code>{originalJson}</code></pre>
              </div>
            </section>

            {/* FORM SUBMIT / BANNER COMPLETED */}
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
                    className="bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 text-white font-bold px-4 py-1.5 rounded transition"
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
                    <div>
                      <p className="font-bold text-zinc-200">{sub.file_name}</p>
                      <a
                        href={sub.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:underline text-[10px]"
                      >
                        Raw Link
                      </a>
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
            <h3 className="text-red-400 font-bold text-sm">
              {modalType === 'add_identity_banner' && 'Admin: Tambah Banner Identitas Baru'}
              {modalType === 'edit_identity_banner' && `Admin: Edit Banner ${targetIdentityName}`}
              {modalType === 'edit_identity_content' && `Admin: Edit ${editingContent?.content_name}`}
              {modalType === 'add_identity_content' && 'Admin: Tambah Content File Baru'}
            </h3>

            <form onSubmit={handleAdminSubmit} className="space-y-3">
              {(modalType === 'add_identity_banner' || modalType === 'edit_identity_banner') && (
                <>
                  {modalType === 'add_identity_banner' && (
                    <div>
                      <label className="block text-zinc-400 mb-1">Pilih Sinner Owner</label>
                      <select
                        value={sinnerName}
                        onChange={(e) => setSinnerName(e.target.value)}
                        className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                        required
                      >
                        {SINNERS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Banner Identitas</label>
                    <input
                      type="text"
                      value={identityName}
                      onChange={(e) => setIdentityName(e.target.value)}
                      placeholder="Contoh: LCB Sinner Yi Sang"
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">URL Banner / Artwork Identitas</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                        placeholder="https://example.com/banner.png"
                      />
                      <button
                        type="button"
                        onClick={handleStartCrop}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1 rounded text-xs shrink-0"
                      >
                        Crop Gambar
                      </button>
                    </div>
                  </div>

                  {bannerUrl && (
                    <div className="pt-2">
                      <label className="block text-zinc-400 mb-1">Hasil Banner:</label>
                      <div
                        className="h-16 rounded-lg border border-red-500 overflow-hidden relative bg-cover bg-center"
                        style={{ backgroundImage: `url('${bannerUrl}')` }}
                      >
                        <div className="absolute inset-0 bg-black/50 p-2 flex items-center">
                          <span className="text-white font-bold text-xs">{identityName || 'Nama Identitas'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {modalType === 'edit_identity_content' && (
                <>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Content File</label>
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
                </>
              )}

              {modalType === 'add_identity_content' && (
                <>
                  <div>
                    <label className="block text-zinc-400 mb-1">Pilih Target Identitas</label>
                    <select
                      value={identityName}
                      onChange={(e) => setIdentityName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      required
                    >
                      <option value="">-- Pilih Identitas --</option>
                      {uniqueIdentitiesList.map((idName) => (
                        <option key={idName} value={idName}>{idName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Content File</label>
                    <input
                      type="text"
                      value={contentName}
                      onChange={(e) => setContentName(e.target.value)}
                      className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white"
                      placeholder="Contoh: Skill / Passive / Dialogue"
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
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded"
                >
                  {loading ? 'Saving...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CROPPER OVERLAY MODAL */}
      {showCropper && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-xl h-80 bg-black/50 border border-zinc-700 rounded-lg overflow-hidden">
            <Cropper
              image={rawImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={320 / 64}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          <div className="w-full max-w-xl mt-4 flex items-center justify-between gap-4 bg-[#1a1b1f] p-3 rounded-lg border border-[#2a2b30]">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-zinc-400 text-xs">Zoom:</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCropper(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCroppedImage}
                className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded font-bold text-xs"
              >
                Potong & Gunakan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}