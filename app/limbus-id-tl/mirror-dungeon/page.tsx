'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface MDItem {
  id: string;
  category: 'event_choice' | 'ego_gift';
  theme_pack?: string;
  tier?: number;
  item_name: string;
  image_url?: string;
  original_file_url: string;
  is_completed?: boolean;
}

interface MDSubmission {
  id: string;
  content_id: string;
  json_snippet: string;
  status: string;
  author_name: string;
  author_id?: string;
  created_at: string;
}

interface BannerData {
  id?: string;
  name: string;
  imageUrl?: string;
}

export default function MirrorDungeonPage() {
  const [activeCategory, setActiveCategory] = useState<'event_choice' | 'ego_gift'>('event_choice');
  const [items, setItems] = useState<MDItem[]>([]);
  
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MDItem | null>(null);
  
  const [submissions, setSubmissions] = useState<MDSubmission[]>([]);
  const [originalJson, setOriginalJson] = useState<string>('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [banners, setBanners] = useState<BannerData[]>([]);

  // Modals
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [showEditBannerModal, setShowEditBannerModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [showEditSubModal, setShowEditSubModal] = useState(false);
  const [showEditOriginalModal, setShowEditOriginalModal] = useState(false);

  // Form States
  const [bannerFormName, setBannerFormName] = useState('');
  const [bannerFormImage, setBannerFormImage] = useState('');
  const [editingBannerTarget, setEditingBannerTarget] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<MDItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemImage, setEditItemImage] = useState('');

  const [editingSub, setEditingSub] = useState<MDSubmission | null>(null);
  const [editSubText, setEditSubText] = useState('');
  
  const [editOriginalText, setEditOriginalText] = useState('');

  const [itemName, setItemName] = useState('');
  const [themePack, setThemePack] = useState('');
  const [tier, setTier] = useState<number>(5);
  const [imageUrl, setImageUrl] = useState('');
  const [adminJsonText, setAdminJsonText] = useState<string>('');
  const [userJsonText, setUserJsonText] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMDItems();

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

  const fetchMDItems = async () => {
    const { data: mdData } = await supabase.from('mirror_dungeon_contents').select('*').order('item_name');
    const { data: subData } = await supabase.from('mirror_dungeon_submissions').select('content_id, status').eq('status', 'approved');
    const { data: bannerData } = await supabase.from('mirror_dungeon_theme_packs').select('*');

    if (bannerData) {
      setBanners(bannerData.map(b => ({ id: b.id, name: b.name, imageUrl: b.image_url })));
    }

    if (mdData && mdData.length > 0) {
      const approvedIds = new Set(subData?.map((s) => s.content_id) || []);
      const enriched = mdData.map((item) => ({
        ...item,
        is_completed: approvedIds.has(item.id),
      }));

      setItems(enriched);
    } else {
      setItems([]);
    }
  };

  const selectItem = async (item: MDItem) => {
    setSelectedItem(item);
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
      .from('mirror_dungeon_submissions')
      .select('*')
      .eq('content_id', item.id)
      .order('created_at', { ascending: false });

    if (data) setSubmissions(data);
  };

  const handleUpdateSubmissionStatus = async (sub: MDSubmission, newStatus: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('mirror_dungeon_submissions')
        .update({ status: newStatus })
        .eq('id', sub.id);

      if (error) throw error;

      if (newStatus === 'approved' && sub.author_id) {
        try {
          let parsed = JSON.parse(sub.json_snippet);
          let idCount = 1;

          if (Array.isArray(parsed)) idCount = parsed.length;
          else if (typeof parsed === 'object' && parsed !== null) {
            idCount = Array.isArray(parsed.dataList) ? parsed.dataList.length : 1;
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

      await fetchMDItems();
      if (selectedItem) await selectItem(selectedItem);
    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // EDIT JSON ORIGINAL HANDLERS (DIPERBAIKI UNTUK REVISI INSTAN & BEBAS DUPLIKAT)
  const openEditOriginalModal = () => {
    setEditOriginalText(originalJson);
    setShowEditOriginalModal(true);
  };

  const handleUpdateOriginalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !editOriginalText.trim()) return;

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(editOriginalText);
    } catch {
      return alert('Format JSON tidak valid!');
    }

    setLoading(true);
    try {
      const fileNamePayload = selectedItem.original_file_url?.split('/').pop() || `${selectedItem.item_name.toLowerCase().replace(/\s+/g, '_')}_original.json`;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_md_original',
          itemId: selectedItem.id, // Mencegah pembuatan row ganda pada database
          mdCategory: selectedItem.category,
          mdThemePack: selectedItem.theme_pack,
          mdTier: selectedItem.tier,
          itemName: selectedItem.item_name,
          imageUrl: selectedItem.image_url,
          fileName: fileNamePayload,
          jsonContent: parsedPayload,
        }),
      });

      if (!res.ok) throw new Error('Gagal meng-update file JSON original');

      // Update tampilan teks secara instan
      const formattedJson = JSON.stringify(parsedPayload, null, 2);
      setOriginalJson(formattedJson);
      setShowEditOriginalModal(false);

      alert('JSON Original berhasil diperbarui!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // EDIT & DELETE SUBMISSION HANDLERS
  const openEditSubModal = (sub: MDSubmission) => {
    setEditingSub(sub);
    setEditSubText(sub.json_snippet);
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
        .from('mirror_dungeon_submissions')
        .update({ json_snippet: editSubText })
        .eq('id', editingSub.id);

      if (error) throw error;

      setShowEditSubModal(false);
      setEditingSub(null);
      if (selectedItem) await selectItem(selectedItem);
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
        .from('mirror_dungeon_submissions')
        .delete()
        .eq('id', subId);

      if (error) throw error;

      if (selectedItem) await selectItem(selectedItem);
    } catch (err: any) {
      alert('Gagal menghapus submission: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // BANNER HANDLERS
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = bannerFormName.trim();
    const imgUrl = bannerFormImage.trim() || null;
    if (!newName) return;

    setLoading(true);
    try {
      if (editingBannerTarget) {
        await supabase
          .from('mirror_dungeon_contents')
          .update({ theme_pack: newName })
          .eq('theme_pack', editingBannerTarget);

        await supabase
          .from('mirror_dungeon_theme_packs')
          .upsert({ name: newName, image_url: imgUrl }, { onConflict: 'name' });

        if (selectedGroup === editingBannerTarget) setSelectedGroup(newName);
      } else {
        await supabase
          .from('mirror_dungeon_theme_packs')
          .upsert({ name: newName, image_url: imgUrl }, { onConflict: 'name' });
      }

      await fetchMDItems();
      setBannerFormName('');
      setBannerFormImage('');
      setEditingBannerTarget(null);
      setShowAddBannerModal(false);
      setShowEditBannerModal(false);
    } catch (err: any) {
      alert('Gagal mengupdate Theme Pack: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditBannerModal = (groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const existing = banners.find((b) => b.name === groupName);
    setEditingBannerTarget(groupName);
    setBannerFormName(groupName);
    setBannerFormImage(existing?.imageUrl || '');
    setShowEditBannerModal(true);
  };

  const handleDeleteBanner = async (groupName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Hapus Theme Pack "${groupName}" dan seluruh item di dalamnya?`)) return;

    setLoading(true);
    try {
      const itemsToDelete = items.filter((i) => (i.theme_pack || 'Umum / General') === groupName);
      const ids = itemsToDelete.map((i) => i.id);

      if (ids.length > 0) {
        await supabase.from('mirror_dungeon_submissions').delete().in('content_id', ids);
        await supabase.from('mirror_dungeon_contents').delete().in('id', ids);
      }

      await supabase.from('mirror_dungeon_theme_packs').delete().eq('name', groupName);

      if (selectedGroup === groupName) setSelectedGroup(null);
      await fetchMDItems();
    } catch (err: any) {
      alert('Gagal menghapus Theme Pack: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ITEM EDIT & DELETE HANDLERS
  const openEditItemModal = (item: MDItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditItemName(item.item_name);
    setEditItemImage(item.image_url || '');
    setShowEditItemModal(true);
  };

  const handleUpdateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mirror_dungeon_contents')
        .update({
          item_name: editItemName.trim(),
          image_url: editItemImage.trim() || null,
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setShowEditItemModal(false);
      setEditingItem(null);
      await fetchMDItems();
    } catch (err: any) {
      alert('Gagal mengupdate item: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus item ini beserta seluruh data submission di dalamnya?')) return;

    setLoading(true);
    try {
      const { error: subErr } = await supabase
        .from('mirror_dungeon_submissions')
        .delete()
        .eq('content_id', id);

      if (subErr) throw subErr;

      const { error: itemErr } = await supabase
        .from('mirror_dungeon_contents')
        .delete()
        .eq('id', id);

      if (itemErr) throw itemErr;

      await fetchMDItems();
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err: any) {
      alert('Gagal menghapus item: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminJsonText.trim()) return alert('Masukkan teks JSON mentah!');

    let jsonPayload: any = null;
    try {
      jsonPayload = JSON.parse(adminJsonText);
    } catch (err) {
      return alert('Format JSON tidak valid!');
    }

    const fileNamePayload = `${itemName.toLowerCase().replace(/\s+/g, '_')}_original.json`;
    setLoading(true);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_md_original',
          mdCategory: activeCategory,
          mdThemePack: activeCategory === 'event_choice' ? themePack : undefined,
          mdTier: activeCategory === 'ego_gift' ? tier : undefined,
          itemName,
          imageUrl: imageUrl.trim() || undefined,
          fileName: fileNamePayload,
          jsonContent: jsonPayload,
        }),
      });

      if (!res.ok) throw new Error('Gagal menambah content');

      setShowAddContentModal(false);
      setItemName('');
      setImageUrl('');
      setAdminJsonText('');
      await fetchMDItems();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userJsonText.trim() || !selectedItem) return;

    try {
      JSON.parse(userJsonText);
    } catch (err) {
      return alert('Format JSON tidak valid!');
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const { error } = await supabase.from('mirror_dungeon_submissions').insert([
        {
          content_id: selectedItem.id,
          json_snippet: userJsonText,
          author_name: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Translator',
          author_id: user?.id,
          status: 'pending',
        },
      ]);

      if (error) throw error;
      setUserJsonText('');
      selectItem(selectedItem);
      alert('Terjemahan berhasil dikirim!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => item.category === activeCategory);

  const dbThemePacks = filteredItems.map((i) => i.theme_pack || 'Umum / General');
  const bannerNames = banners.map((b) => b.name);
  const themePackGroups = Array.from(new Set([...dbThemePacks, ...bannerNames])).sort();
  const tiers = ['Tier 5', 'Tier 4', 'Tier 3', 'Tier 2', 'Tier 1'];

  const getItemsForGroup = (group: string) => {
    if (activeCategory === 'event_choice') {
      return filteredItems.filter((i) => (i.theme_pack || 'Umum / General') === group);
    } else {
      const tierNum = parseInt(group.replace('Tier ', ''));
      return filteredItems.filter((i) => i.tier === tierNum);
    }
  };

  const activeGroupItems = selectedGroup ? getItemsForGroup(selectedGroup) : [];

  return (
    <div className="flex h-screen bg-[#0d0e10] text-zinc-300 text-xs font-sans overflow-hidden">
      
      {/* SIDEBAR KIRI */}
      <aside className="w-80 border-r border-[#222327] bg-[#121316] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Link href="/limbus-id-tl" className="text-zinc-400 hover:text-white font-bold block transition text-xs">
            &larr; Layar Utama
          </Link>

          <div>
            <h1 className="font-bold text-red-500 text-sm uppercase tracking-wider">
              MIRROR DUNGEON HUB
            </h1>
          </div>

          {/* TOGGLE CATEGORY */}
          <div className="grid grid-cols-2 gap-1 bg-[#1a1b1f] p-1 rounded-lg border border-[#26272e]">
            <button
              onClick={() => {
                setActiveCategory('event_choice');
                setSelectedGroup(null);
                setSelectedItem(null);
              }}
              className={`py-1.5 px-2 rounded font-bold transition text-center text-[11px] ${
                activeCategory === 'event_choice'
                  ? 'bg-red-700 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Event Choices
            </button>
            <button
              onClick={() => {
                setActiveCategory('ego_gift');
                setSelectedGroup(null);
                setSelectedItem(null);
              }}
              className={`py-1.5 px-2 rounded font-bold transition text-center text-[11px] ${
                activeCategory === 'ego_gift'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              E.G.O Gifts
            </button>
          </div>

          {/* DAFTAR THEME PACK / TIER */}
          <div className="space-y-3 overflow-y-auto p-2 pb-3 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">
              Pilih {activeCategory === 'event_choice' ? 'Theme Pack' : 'Tier'}
            </p>

            {activeCategory === 'event_choice' ? (
              themePackGroups.map((group) => {
                const groupItems = getItemsForGroup(group);
                const total = groupItems.length;
                const completed = groupItems.filter((i) => i.is_completed).length;
                const bannerObj = banners.find((b) => b.name.toLowerCase() === group.toLowerCase());
                const isSelected = selectedGroup === group;

                return (
                  <div
                    key={group}
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedItem(null);
                    }}
                    className={`group relative h-20 rounded-lg border-2 overflow-hidden cursor-pointer transition-all shadow-md ${
                      isSelected
                        ? 'border-red-600 ring-1 ring-red-600/50'
                        : 'border-red-900/60 hover:border-red-600'
                    }`}
                  >
                    {bannerObj?.imageUrl ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${bannerObj.imageUrl}')` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900" />
                    )}

                    <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors z-10" />

                    {isAdmin && (
                      <div className="absolute top-2 right-2 z-30 flex gap-1 opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => openEditBannerModal(group, e)}
                          className="bg-[#121008] hover:bg-amber-950/80 text-amber-400 border border-amber-500/80 font-extrabold text-[10px] px-2 py-0.5 rounded transition shadow"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteBanner(group, e)}
                          className="bg-[#1c0808] hover:bg-red-950/80 text-red-100 border border-red-600/90 font-extrabold text-[10px] px-2 py-0.5 rounded transition shadow"
                        >
                          Hapus
                        </button>
                      </div>
                    )}

                    <div className="relative z-20 h-full flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                      <span className="font-extrabold text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-xs uppercase tracking-wider">
                        {group}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-300 bg-black/60 px-2 py-0.5 rounded-full mt-1 border border-zinc-700/50">
                        Progress: {completed}/{total}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              tiers.map((tierName) => {
                const tierItems = getItemsForGroup(tierName);
                const total = tierItems.length;
                const completed = tierItems.filter((i) => i.is_completed).length;

                return (
                  <div key={tierName} className="space-y-2">
                    <div className="flex items-center gap-2 pt-2 pb-1 border-b border-[#2d2e38]">
                      <span className="font-extrabold text-amber-400 text-xs uppercase tracking-wider">
                        {tierName}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 ml-auto">
                        {completed}/{total}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 pb-2">
                      {tierItems.map((item) => {
                        const isItemSelected = selectedItem?.id === item.id;
                        const isCompleted = item.is_completed;

                        return (
                          <div
                            key={item.id}
                            onClick={() => selectItem(item)}
                            title={item.item_name}
                            className={`group relative w-12 h-12 rounded-lg border-2 bg-[#101114] cursor-pointer transition-all duration-150 flex items-center justify-center shadow-md overflow-hidden ${
                              isCompleted
                                ? 'border-emerald-500 hover:border-emerald-400'
                                : 'border-red-600 hover:border-red-500'
                            } ${
                              isItemSelected
                                ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#121316] scale-105'
                                : 'hover:scale-105'
                            }`}
                          >
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.item_name}
                                className="w-full h-full object-contain p-1 rounded-md"
                              />
                            ) : (
                              <span className="text-[9px] font-bold text-zinc-300 text-center leading-tight truncate px-0.5">
                                {item.item_name}
                              </span>
                            )}

                            {isAdmin && (
                              <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 z-30">
                                <button
                                  onClick={(e) => openEditItemModal(item, e)}
                                  className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[8px] w-3.5 h-3.5 rounded flex items-center justify-center shadow"
                                  title="Edit Item"
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={(e) => handleDeleteItem(item.id, e)}
                                  className="bg-red-700 hover:bg-red-600 text-white font-extrabold text-[8px] w-3.5 h-3.5 rounded flex items-center justify-center shadow"
                                  title="Hapus Item"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {tierItems.length === 0 && (
                        <div className="text-zinc-600 text-[10px] italic py-1">
                          Belum ada item di {tierName}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* BOTTOM SIDEBAR */}
        {isAdmin && (
          <div className="pt-3 border-t border-[#222327] space-y-2">
            {activeCategory === 'event_choice' && (
              <button
                onClick={() => {
                  setBannerFormName('');
                  setBannerFormImage('');
                  setEditingBannerTarget(null);
                  setShowAddBannerModal(true);
                }}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded transition shadow text-xs"
              >
                + Admin: Tambah Banner MD
              </button>
            )}
            <button
              onClick={() => {
                setItemName('');
                setThemePack(selectedGroup || themePackGroups[0] || '');
                setTier(5);
                setImageUrl('');
                setAdminJsonText('');
                setShowAddContentModal(true);
              }}
              className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded transition shadow text-xs"
            >
              + Admin: Tambah Content MD
            </button>
          </div>
        )}
      </aside>

      {/* PANEL KANAN */}
      <main className="flex-1 p-6 overflow-y-auto space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#0a0b0d]">
        {selectedItem ? (
          <div className="space-y-6">
            <header className="border-b border-[#222327] pb-4 space-y-1">
              <button
                onClick={() => setSelectedItem(null)}
                className="text-red-500 font-bold hover:underline block text-xs mb-1"
              >
                &larr; Tutup Detail Item
              </button>
              <span className="text-red-600 font-extrabold tracking-wider uppercase text-[11px] block">
                {activeCategory === 'event_choice' ? selectedGroup : `TIER ${selectedItem.tier}`}
              </span>
              <h2 className="text-3xl font-extrabold text-white">
                {selectedItem.item_name}
              </h2>
            </header>

            <div className="space-y-6">
              {/* CONTAINER JSON ORIGINAL */}
              <section className="bg-[#121316] border border-[#222327] rounded-lg overflow-hidden shadow-xl">
                <div className="bg-[#18191d] px-4 py-2.5 border-b border-[#222327] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 text-xs">
                      File Mentah Original: <span className="text-zinc-200 font-mono ml-1">{selectedItem.original_file_url?.split('/').pop() || 'data.json'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={openEditOriginalModal}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded transition shadow flex items-center gap-1"
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

              {selectedItem.is_completed ? (
                <div className="bg-[#0b1c14] border border-[#14532d] rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-400 text-sm">Terjemahan Item Ini Sudah Selesai & Disetujui</h4>
                      <p className="text-zinc-400 text-xs">Submission baru sudah ditutup untuk item ini.</p>
                    </div>
                  </div>
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-bold px-3 py-1 rounded text-xs tracking-wider">
                    COMPLETED
                  </span>
                </div>
              ) : (
                <section className="bg-[#121316] border border-[#222327] rounded-lg p-4 space-y-3">
                  <h4 className="font-bold text-red-400 text-xs">Submit Terjemahan JSON untuk {selectedItem.item_name}</h4>
                  <form onSubmit={handleUserTextSubmit} className="space-y-3">
                    <textarea
                      rows={6}
                      value={userJsonText}
                      onChange={(e) => setUserJsonText(e.target.value)}
                      placeholder="Paste JSON terjemahan di sini..."
                      className="w-full bg-[#0d0e10] border border-[#2e3038] focus:border-red-600 rounded p-3 font-mono text-xs text-amber-300 focus:outline-none"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading || !userJsonText.trim()}
                        className="bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 text-white font-bold px-4 py-2 rounded transition text-xs shadow"
                      >
                        {loading ? 'Mengirim...' : 'Submit Terjemahan'}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              <section className="space-y-3">
                <h4 className="font-bold text-zinc-300 text-xs">Daftar Review Terjemahan Komunitas</h4>
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-[#121316] border border-[#222327] p-3 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-200">{sub.author_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-950 text-amber-400 border border-amber-800/40">
                          {sub.status}
                        </span>

                        {isAdmin && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => openEditSubModal(sub)}
                              className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded font-bold transition shadow"
                            >
                              Edit JSON
                            </button>
                            <button
                              onClick={() => handleDeleteSubmission(sub.id)}
                              className="bg-red-700 hover:bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold transition shadow"
                            >
                              Hapus
                            </button>
                          </div>
                        )}

                        {isAdmin && sub.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateSubmissionStatus(sub, 'approved')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded font-bold transition shadow"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="bg-[#0d0e10] p-3 rounded border border-[#26272e] font-mono text-[11px] text-amber-300/90 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                      <code>{sub.json_snippet}</code>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </div>
        ) : activeCategory === 'event_choice' && selectedGroup ? (
          <div className="space-y-6">
            <header className="border-b border-[#222327] pb-4 space-y-1">
              <span className="text-red-600 font-extrabold tracking-wider uppercase text-[11px] block">
                PILIH ITEM / EVENT
              </span>
              <h2 className="text-3xl font-extrabold text-white">
                {selectedGroup}
              </h2>
              <div className="flex items-center gap-4 text-[11px] font-semibold text-zinc-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Hijau = Sudah Selesai</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Merah = Belum Selesai</span>
                </div>
              </div>
            </header>

            <div className="space-y-3">
              {activeGroupItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className="group p-4 rounded-lg border border-red-950/40 bg-[#121316] hover:border-red-600/80 cursor-pointer transition-all duration-200 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        item.is_completed ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-7 h-7 object-contain rounded bg-black/40 border border-zinc-800 p-0.5"
                      />
                    )}
                    <span className="font-extrabold text-white text-sm">
                      {item.item_name}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => openEditItemModal(item, e)}
                        className="bg-[#121008] hover:bg-amber-950/80 text-amber-400 border border-amber-500/80 font-extrabold text-[11px] px-3 py-1 rounded-md transition shadow"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="bg-[#1c0808] hover:bg-red-950/80 text-red-100 border border-red-600/90 font-extrabold text-[11px] px-3 py-1 rounded-md transition shadow"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {activeGroupItems.length === 0 && (
                <div className="py-12 text-center text-zinc-500 bg-[#121316] rounded-lg border border-[#222327]">
                  Belum ada content di {selectedGroup}.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-24 text-center text-zinc-500">
            <h3 className="text-xl font-bold text-zinc-400 mb-2">
              {activeCategory === 'event_choice' ? 'Pilih Theme Pack' : 'Pilih E.G.O Gift'}
            </h3>
            <p className="text-xs">
              {activeCategory === 'event_choice'
                ? 'Klik salah satu banner di panel sebelah kiri untuk melihat daftar item.'
                : 'Klik salah satu ikon E.G.O Gift di bawah daftar Tier di panel kiri.'}
            </p>
          </div>
        )}
      </main>

      {/* MODAL ADMIN: EDIT JSON ORIGINAL */}
      {showEditOriginalModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2d2e38] pb-3">
              <h3 className="text-amber-400 font-bold text-sm">
                Edit JSON Original ({selectedItem.item_name})
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
                  className="px-3 py-1.5 bg-zinc-800 rounded text-xs text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white hover:bg-amber-500 transition"
                >
                  {loading ? 'Menyimpan...' : 'Simpan JSON Original'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT SUBMISSION JSON KOMUNITAS */}
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
                  className="px-3 py-1.5 bg-zinc-800 rounded text-xs text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: EDIT ITEM */}
      {showEditItemModal && editingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-sm space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Edit Content Item</h3>
            <form onSubmit={handleUpdateItemSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nama Item"
                value={editItemName}
                onChange={(e) => setEditItemName(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                required
              />
              <input
                type="url"
                placeholder="URL Gambar Icon (Opsional)"
                value={editItemImage}
                onChange={(e) => setEditItemImage(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditItemModal(false)} className="px-3 py-1.5 bg-zinc-800 rounded text-xs">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white">Update Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: TAMBAH BANNER */}
      {showAddBannerModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-sm space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Tambah Banner MD</h3>
            <form onSubmit={handleSaveBanner} className="space-y-3">
              <input
                type="text"
                placeholder="Nama Theme Pack / Banner"
                value={bannerFormName}
                onChange={(e) => setBannerFormName(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                required
              />
              <input
                type="url"
                placeholder="URL Gambar Banner (Opsional)"
                value={bannerFormImage}
                onChange={(e) => setBannerFormImage(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddBannerModal(false)} className="px-3 py-1.5 bg-zinc-800 rounded text-xs">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: EDIT BANNER */}
      {showEditBannerModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-sm space-y-4">
            <h3 className="text-amber-400 font-bold text-sm">Admin: Edit Banner MD</h3>
            <form onSubmit={handleSaveBanner} className="space-y-3">
              <input
                type="text"
                placeholder="Nama Theme Pack / Banner"
                value={bannerFormName}
                onChange={(e) => setBannerFormName(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                required
              />
              <input
                type="url"
                placeholder="URL Gambar Banner"
                value={bannerFormImage}
                onChange={(e) => setBannerFormImage(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditBannerModal(false)} className="px-3 py-1.5 bg-zinc-800 rounded text-xs">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-amber-600 font-bold rounded text-xs text-white">Update Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN: TAMBAH CONTENT */}
      {showAddContentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b1f] border border-[#2a2b30] p-5 rounded-lg w-full max-w-md space-y-4">
            <h3 className="text-red-400 font-bold text-sm">Admin: Tambah Content MD</h3>
            <form onSubmit={handleAddContentSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nama Item / Event"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                required
              />
              {activeCategory === 'event_choice' ? (
                <select
                  value={themePack}
                  onChange={(e) => setThemePack(e.target.value)}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                >
                  {themePackGroups.map((tp) => (
                    <option key={tp} value={tp}>{tp}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={tier}
                  onChange={(e) => setTier(Number(e.target.value))}
                  className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
                >
                  {[5, 4, 3, 2, 1].map((t) => (
                    <option key={t} value={t}>Tier {t}</option>
                  ))}
                </select>
              )}
              <input
                type="url"
                placeholder="URL Gambar Icon (Opsional)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-[#101113] border border-[#3f3f46] px-3 py-1.5 rounded text-white text-xs"
              />
              <textarea
                rows={4}
                value={adminJsonText}
                onChange={(e) => setAdminJsonText(e.target.value)}
                placeholder="Paste JSON original..."
                className="w-full bg-[#101113] border border-[#3f3f46] p-2 rounded text-amber-300 text-xs font-mono"
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddContentModal(false)} className="px-3 py-1.5 bg-zinc-800 rounded text-xs">Batal</button>
                <button type="submit" disabled={loading} className="px-4 py-1.5 bg-red-700 font-bold rounded text-xs text-white">Simpan Content</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}