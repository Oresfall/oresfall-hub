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
  content_id: string;
  json_snippet: string;
  file_name?: string;
  file_url?: string;
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
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<IdentityContent | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [originalJson, setOriginalJson] = useState<string>('');
  const [activeSinnerFilter, setActiveSinnerFilter] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  // Modals
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [showEditBannerModal, setShowEditBannerModal] = useState(false);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showEditOriginalModal, setShowEditOriginalModal] = useState(false);
  const [showEditSubModal, setShowEditSubModal] = useState(false);

  // Form States
  const [bannerFormSinner, setBannerFormSinner] = useState(SINNERS[0]);
  const [bannerFormName, setBannerFormName] = useState('');
  const [bannerFormUrl, setBannerFormUrl] = useState('');
  const [editingBannerTarget, setEditingBannerTarget] = useState<string | null>(null);

  const [contentFormIdentity, setContentFormIdentity] = useState('');
  const [contentFormName, setContentFormName] = useState('');
  const [adminJsonText, setAdminJsonText] = useState('');

  const [editingContent, setEditingContent] = useState<IdentityContent | null>(null);
  const [editContentName, setEditContentName] = useState('');

  const [editOriginalText, setEditOriginalText] = useState('');

  const [editingSub, setEditingSub] = useState<Submission | null>(null);
  const [editSubText, setEditSubText] = useState('');

  const [userJsonText, setUserJsonText] = useState('');
  const [loading, setLoading] = useState(false);

  // Cropper States
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState('');
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
    } else {
      setContents([]);
    }
  };

  const selectContent = async (item: IdentityContent) => {
    setSelectedContent(item);
    setUserJsonText('');

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
          let idCount = 1;
          if (sub.json_snippet) {
            const parsed = JSON.parse(sub.json_snippet);
            if (Array.isArray(parsed)) idCount = parsed.length;
            else if (typeof parsed === 'object' && parsed !== null) {
              idCount = Array.isArray(parsed.dataList) ? parsed.dataList.length : 1;
            }
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('contributions')
            .eq('id', sub.author_id)
            .single();

          const currentContrib = profile?.contributions || 0;

          await supabase
            .from('profiles')
            .update({ contributions: currentContrib + idCount })
            .eq('id', sub.author_id);
        } catch (e) {
          console.error(e);
        }
      }

      await fetchContents();
      if (selectedContent) await selectContent(selectedContent);
    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // EDIT JSON ORIGINAL HANDLERS (PERBAIKAN SUPABASE UPDATE)
  const openEditOriginalModal = () => {
    setEditOriginalText(originalJson);
    setShowEditOriginalModal(true);
  };

  const handleUpdateOriginalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent || !editOriginalText.trim()) return;

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(editOriginalText);
    } catch {
      return alert('Format JSON tidak valid!');
    }

    setLoading(true);
    try {
      const fileNamePayload = selectedContent.original_file_url?.split('/').pop() || `${selectedContent.content_name.toLowerCase().replace(/\s+/g, '_')}.json`;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_identity_original',
          contentId: selectedContent.id,
          sinnerName: selectedContent.sinner_name,
          identityName: selectedContent.identity_name,
          contentName: selectedContent.content_name,
          fileName: fileNamePayload,
          jsonContent: parsedPayload,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Gagal meng-update file JSON original di GitHub');

      const newUrl = resData.url || resData.downloadUrl;
      if (newUrl) {
        const { error: dbErr } = await supabase
          .from('identity_contents')
          .update({ original_file_url: newUrl })
          .eq('id', selectedContent.id);

        if (dbErr) throw dbErr;
      }

      const formattedJson = JSON.stringify(parsedPayload, null, 2);
      setOriginalJson(formattedJson);
      setShowEditOriginalModal(false);

      alert('JSON Original berhasil diperbarui!');
      await fetchContents();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // EDIT & DELETE SUBMISSION HANDLERS
  const openEditSubModal = (sub: Submission) => {
    setEditingSub(sub);
    setEditSubText(sub.json_snippet || '');
    setShowEditSubModal(true);
  };

  const handleUpdateSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editSubText.trim()) return;

    try {
      JSON.parse(editSubText);
    } catch {
      return alert('Format JSON tidak valid!');
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('identity_submissions')
        .update({ json_snippet: editSubText })
        .eq('id', editingSub.id);

      if (error) throw error;

      setShowEditSubModal(false);
      setEditingSub(null);
      if (selectedContent) await selectContent(selectedContent);
    } catch (err: any) {
      alert('Gagal memperbarui submission: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmission = async (subId: string) => {
    if (!confirm('Hapus submission terjemahan ini?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('identity_submissions')
        .delete()
        .eq('id', subId);

      if (error) throw error;

      if (selectedContent) await selectContent(selectedContent);
    } catch (err: any) {
      alert('Gagal menghapus submission: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // BANNER HANDLERS
  const openEditBannerModal = (idName: string, currentBanner: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBannerTarget(idName);
    setBannerFormName(idName);
    setBannerFormUrl(currentBanner || '');
    setShowEditBannerModal(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerFormName.trim()) return;

    setLoading(true);
    try {
      if (editingBannerTarget) {
        const { error } = await supabase
          .from('identity_contents')
          .update({
            identity_name: bannerFormName.trim(),
            banner_url: bannerFormUrl.trim() || null,
          })
          .eq('identity_name', editingBannerTarget);

        if (error) throw error;
        if (selectedIdentity === editingBannerTarget) setSelectedIdentity(bannerFormName.trim());
      } else {
        const { error } = await supabase.from('identity_contents').insert([{
          sinner_name: bannerFormSinner,
          identity_name: bannerFormName.trim(),
          content_name: 'Main Data',
          banner_url: bannerFormUrl.trim() || null,
          original_file_url: ''
        }]);

        if (error) throw error;
        setSelectedIdentity(bannerFormName.trim());
      }

      await fetchContents();
      setShowAddBannerModal(false);
      setShowEditBannerModal(false);
      setEditingBannerTarget(null);
    } catch (err: any) {
      alert('Gagal menyimpan banner: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (idNameToDelete: string, e: React.MouseEvent) => {
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
        setSelectedIdentity(null);
        setSelectedContent(null);
      }

      await fetchContents();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ITEM CONTENT HANDLERS
  const openEditContentModal = (item: IdentityContent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContent(item);
    setEditContentName(item.content_name);
    setShowEditItemModal(true);
  };

  const handleUpdateContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent || !editContentName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('identity_contents')
        .update({ content_name: editContentName.trim() })
        .eq('id', editingContent.id);

      if (error) throw error;

      setShowEditItemModal(false);
      setEditingContent(null);
      await fetchContents();
    } catch (err: any) {
      alert('Gagal memperbarui content: ' + err.message);
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
      await fetchContents();
      if (selectedContent?.id === id) setSelectedContent(null);
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD CONTENT HANDLER (PERBAIKAN SUPABASE INSERT)
  const handleAddContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminJsonText.trim()) return alert('Tempelkan teks JSON mentah!');

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(adminJsonText);
    } catch {
      return alert('Format JSON tidak valid!');
    }

    setLoading(true);
    try {
      const targetIdentity = contentFormIdentity || selectedIdentity;
      const targetObj = contents.find((c) => c.identity_name === targetIdentity);
      const targetSinner = targetObj?.sinner_name || bannerFormSinner;
      const targetBanner = targetObj?.banner_url || '';

      // 1. Upload file ke GitHub via API Route
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_identity_original',
          sinnerName: targetSinner,
          identityName: targetIdentity,
          contentName: contentFormName,
          bannerUrl: targetBanner,
          fileName: `${contentFormName.toLowerCase().replace(/\s+/g, '_')}.json`,
          jsonContent: parsedJson,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Gagal membuat content baru di GitHub');

      const downloadUrl = resData.url || resData.downloadUrl || '';

      setShowAddContentModal(false);
      setContentFormName('');
      setAdminJsonText('');
      await fetchContents();
      alert('Content File berhasil ditambahkan!');
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userJsonText.trim() || !selectedContent) return;

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(userJsonText);
    } catch {
      return alert('Format JSON tidak valid!');
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_identity_submission',
          contentId: selectedContent.id,
          fileName: `${selectedContent.content_name.toLowerCase().replace(/\s+/g, '_')}_translated.json`,
          jsonContent: parsedJson,
          jsonSnippet: userJsonText,
          authorName: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Translator',
          authorId: user?.id,
        }),
      });

      if (!res.ok) throw new Error('Gagal submit terjemahan');

      setUserJsonText('');
      selectContent(selectedContent);
      alert('Terjemahan berhasil dikirim!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // CROPPER HANDLERS
  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleStartCrop = () => {
    if (!bannerFormUrl) return alert('Masukkan URL Gambar terlebih dahulu!');
    const proxiedUrl = bannerFormUrl.startsWith('data:')
      ? bannerFormUrl
      : `/api/proxy-image?url=${encodeURIComponent(bannerFormUrl)}`;

    setRawImageSrc(proxiedUrl);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setShowCropper(true);
  };

  const handleSaveCroppedImage = async () => {
    try {
      const croppedImageBase64 = await getCroppedImg(rawImageSrc, croppedAreaPixels);
      setBannerFormUrl(croppedImageBase64);
      setShowCropper(false);
    } catch {
      alert('Gagal memotong gambar. Pastikan URL gambar dapat diakses.');
    }
  };

  const uniqueIdentitiesList = Array.from(new Set(contents.map((c) => c.identity_name))).filter(Boolean);
  const currentSubContents = selectedIdentity ? contents.filter((c) => c.identity_name === selectedIdentity) : [];

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
                  onClick={() => {
                    setActiveSinnerFilter(isSelected ? null : sinner);
                    setSelectedIdentity(null);
                    setSelectedContent(null);
                  }}
                  title={sinner}
                  className={`relative flex items-center justify-center p-1 transition-all rounded ${
                    isSelected
                      ? 'opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <img src={logoUrl} alt={sinner} className="w-8 h-8 object-contain" />
                </button>
              );
            })}
          </div>

          {/* DAFTAR BANNER IDENTITAS */}
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
                                onClick={(e) => openEditBannerModal(idName, banner || '', e)}
                                className="bg-black/80 hover:bg-black text-amber-400 text-[9px] px-1.5 py-0.5 rounded border border-amber-500/40 font-bold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => handleDeleteBanner(idName, e)}
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
              onClick={() => {
                setBannerFormSinner(SINNERS[0]);
                setBannerFormName('');
                setBannerFormUrl('');
                setEditingBannerTarget(null);
                setShowAddBannerModal(true);
              }}
              className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded transition shadow text-xs cursor-pointer"
            >
              + Admin: Tambah Banner Identitas
            </button>
            <button
              onClick={() => {
                setContentFormIdentity(selectedIdentity || uniqueIdentitiesList[0] || '');
                setContentFormName('');
                setAdminJsonText('');
                setShowAddContentModal(true);
              }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-1.5 px-3 rounded transition shadow text-xs border border-zinc-700 cursor-pointer"
            >
              + Admin: Tambah Content File
            </button>
          </div>
        )}
      </aside>

      {/* AREA KANAN */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#0a0b0d]">
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
                className="text-red-400 hover:text-red-300 font-bold mb-2 block transition cursor-pointer"
              >
                &larr; Kembali ke Daftar Content
              </button>
              <span className="text-red-500 font-bold uppercase">{selectedContent.identity_name} ({selectedContent.sinner_name})</span>
              <h2 className="text-2xl font-bold text-white">{selectedContent.content_name}</h2>
            </header>

            {/* PREVIEW JSON ORIGINAL */}
            <section className="bg-[#141518] border border-[#222327] rounded-lg overflow-hidden shadow-xl">
              <div className="bg-[#1a1b1f] px-4 py-2.5 border-b border-[#222327] flex justify-between items-center">
                <span className="font-bold text-amber-400">
                  File Mentah Original: <span className="text-zinc-200 font-mono text-[11px] ml-1">{selectedContent.original_file_url?.split('/').pop() || 'data.json'}</span>
                </span>
                
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={openEditOriginalModal}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded transition shadow flex items-center gap-1 cursor-pointer"
                    >
                      ✎ Edit JSON Original
                    </button>
                  )}
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">READ-ONLY JSON</span>
                </div>
              </div>

              <div className="p-4 bg-[#0d0e10] font-mono text-[11px] leading-relaxed text-zinc-300 max-h-96 overflow-y-auto whitespace-pre-wrap break-words [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <pre><code>{originalJson}</code></pre>
              </div>
            </section>

            {/* FORM SUBMIT USER */}
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
                <form onSubmit={handleUserSubmit} className="space-y-3">
                  <div>
                    <textarea
                      rows={6}
                      value={userJsonText}
                      onChange={(e) => setUserJsonText(e.target.value)}
                      placeholder='{ "dataList": [ { "id": 101, "title": "Hasil Terjemahan..." } ] }'
                      className="w-full bg-[#0d0e10] border border-[#2a2b30] p-2.5 rounded font-mono text-xs text-amber-300 focus:outline-none focus:border-red-500 resize-y"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !userJsonText.trim()}
                      className="bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 text-white font-bold px-4 py-2 rounded transition cursor-pointer text-xs"
                    >
                      {loading ? 'Mengirim...' : 'Submit Terjemahan'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* DAFTAR SUBMISSION KOMUNITAS */}
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
                          <button
                            onClick={() => openEditSubModal(sub)}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer"
                          >
                            Edit JSON
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(sub.id)}
                            className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer"
                          >
                            Hapus
                          </button>
                          {sub.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateSubmissionStatus(sub, 'approved')}
                              disabled={loading}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {sub.json_snippet && (
                    <div className="bg-[#0d0e10] p-3 rounded border border-[#26272e] font-mono text-[11px] text-amber-300/90 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                      <code>{sub.json_snippet}</code>
                    </div>
                  )}
                </div>
              ))}
            </section>
          </div>
        )}
      </main>

      {/* MODAL ADMIN: EDIT JSON ORIGINAL */}
      {showEditOriginalModal && selectedContent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2d2e38] pb-3">
              <h3 className="text-amber-400 font-bold text-sm">
                Edit JSON Original ({selectedContent.content_name})
              </h3>
              <span className="text-zinc-500 text-[10px] font-mono">Admin Only</span>
            </div>

            <form onSubmit={handleUpdateOriginalSubmit} className="space-y-3">
              <textarea
                rows={14}
                value={editOriginalText}
                onChange={(e) => setEditOriginalText(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] p-3 rounded text-amber-300 text-xs font-mono focus:outline-none focus:border-amber-500"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditOriginalModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 rounded text-xs text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white hover:bg-amber-500 transition cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan JSON Original'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: EDIT SUBMISSION JSON */}
      {showEditSubModal && editingSub && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-lg space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Edit Terjemahan JSON</h3>
            <form onSubmit={handleUpdateSubmissionSubmit} className="space-y-3">
              <textarea
                rows={8}
                value={editSubText}
                onChange={(e) => setEditSubText(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] p-3 rounded text-amber-300 text-xs font-mono focus:outline-none focus:border-amber-500"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditSubModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 rounded text-xs text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: TAMBAH BANNER */}
      {showAddBannerModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-red-400 font-bold text-sm">Admin: Tambah Banner Identitas Baru</h3>
            <form onSubmit={handleSaveBanner} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Pilih Sinner Owner</label>
                <select
                  value={bannerFormSinner}
                  onChange={(e) => setBannerFormSinner(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                >
                  {SINNERS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Nama Banner Identitas</label>
                <input
                  type="text"
                  placeholder="Contoh: LCB Sinner Yi Sang"
                  value={bannerFormName}
                  onChange={(e) => setBannerFormName(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">URL Banner / Artwork Identitas</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/banner.png"
                    value={bannerFormUrl}
                    onChange={(e) => setBannerFormUrl(e.target.value)}
                    className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleStartCrop}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1 rounded text-xs shrink-0 cursor-pointer"
                  >
                    Crop
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddBannerModal(false)} className="px-3 py-1.5 bg-zinc-800 rounded text-xs cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-red-700 font-bold rounded text-xs text-white cursor-pointer">Simpan Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: EDIT BANNER */}
      {showEditBannerModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Edit Banner {editingBannerTarget}</h3>
            <form onSubmit={handleSaveBanner} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Nama Identitas</label>
                <input
                  type="text"
                  value={bannerFormName}
                  onChange={(e) => setBannerFormName(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">URL Banner / Artwork Identitas</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bannerFormUrl}
                    onChange={(e) => setBannerFormUrl(e.target.value)}
                    className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleStartCrop}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1 rounded text-xs shrink-0 cursor-pointer"
                  >
                    Crop
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditBannerModal(false)} className="px-3 py-1.5 bg-zinc-800 rounded text-xs cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white cursor-pointer">Update Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: EDIT ITEM CONTENT */}
      {showEditItemModal && editingContent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-sm space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Edit Content File</h3>
            <form onSubmit={handleUpdateContentSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nama Content File"
                value={editContentName}
                onChange={(e) => setEditContentName(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditItemModal(false)} className="px-3 py-1.5 bg-zinc-800 rounded text-xs cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white cursor-pointer">Update Content</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: TAMBAH CONTENT */}
      {showAddContentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-red-400 font-bold text-sm">Admin: Tambah Content File Baru</h3>
            <form onSubmit={handleAddContentSubmit} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Pilih Target Identitas</label>
                <select
                  value={contentFormIdentity}
                  onChange={(e) => setContentFormIdentity(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
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
                  placeholder="Contoh: Skill / Passive / Dialogue"
                  value={contentFormName}
                  onChange={(e) => setContentFormName(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Tempelkan Teks JSON Mentah Original</label>
                <textarea
                  rows={6}
                  value={adminJsonText}
                  onChange={(e) => setAdminJsonText(e.target.value)}
                  placeholder='{ "dataList": [ ... ] }'
                  className="w-full bg-[#101113] border border-[#3f3f46] p-2 rounded text-white font-mono text-xs resize-y"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddContentModal(false)} className="px-3 py-1.5 bg-zinc-800 rounded text-xs cursor-pointer">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-red-700 font-bold rounded text-xs text-white cursor-pointer">Simpan Content</button>
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
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCroppedImage}
                className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded font-bold text-xs cursor-pointer"
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