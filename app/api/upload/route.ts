import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      type, 
      cantoName, 
      intervalloName, 
      announcerName,
      albumName,
      songTitle,
      songId,
      mdCategory, // 'event_choice' | 'ego_gift'
      mdThemePack, // Nama Theme Pack untuk Event Choice
      mdTier, // Tier 1 - 5 untuk Ego Gift
      episodeName, 
      contentName,
      itemName, // Nama Item MD
      episodeId, 
      contentId,
      itemId, // ID record mirror_dungeon
      fileName, 
      jsonContent, 
      authorName, 
      authorId 
    } = body;

    // Normalisasi fallback agar tetap mendukung jika client mengirim nama properti snake_case
    const resolvedSongId = songId || body.song_id || contentId || episodeId;
    const resolvedSongTitle = songTitle || body.song_title || episodeName || contentName || 'Untitled Song';
    const resolvedAlbumName = albumName || body.album_name || 'General';

    const contentString = JSON.stringify(jsonContent, null, 2);
    const base64Content = Buffer.from(contentString).toString('base64');

    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;

    // Fallback Alias ID & Name untuk Kompatibilitas Lintas Fitur
    const resolvedEpisodeId = episodeId || songId || contentId;
    const resolvedEpisodeName = episodeName || songTitle || contentName || itemName || 'Untitled';

    // ----------------------------------------------------
    // A. UPLOAD / UPDATE FILE ORIGINAL (CANTO & INTERVALLO)
    // ----------------------------------------------------
    if (type === 'admin_original') {
      // Jika request berasal dari fitur Lagu/Songs
      if (albumName || songTitle || songId || body.song_id || body.song_title) {
        const targetAlbum = resolvedAlbumName;
        const targetTitle = resolvedSongTitle;
        const filePath = `originals/songs/${targetAlbum}/${targetTitle}/${fileName}`;

        let fileSha: string | undefined = undefined;
        try {
          const getFileRes = await fetch(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                'User-Agent': 'Limbus-TL-App',
              },
            }
          );
          if (getFileRes.ok) {
            const fileData = await getFileRes.json();
            fileSha = fileData.sha;
          }
        } catch (e) {}

        const ghRes = await fetch(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${githubToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Limbus-TL-App',
            },
            body: JSON.stringify({
              message: resolvedSongId 
                ? `Update Song: ${targetAlbum} - ${targetTitle}`
                : `Add Song: ${targetAlbum} - ${targetTitle}`,
              content: base64Content,
              ...(fileSha && { sha: fileSha }),
            }),
          }
        );

        const ghData = await ghRes.json();
        if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

        if (resolvedSongId) {
          const { data, error } = await supabase
            .from('songs')
            .update({
              song_title: targetTitle,
              album_name: targetAlbum,
              original_file_url: ghData.content.download_url,
            })
            .eq('id', resolvedSongId)
            .select()
            .maybeSingle();

          if (error) throw error;
          return NextResponse.json({ success: true, data });
        } else {
          const { data, error } = await supabase
            .from('songs')
            .insert({
              album_name: targetAlbum,
              song_title: targetTitle,
              banner_url: body.bannerUrl || body.banner_url || '',
              original_file_url: ghData.content.download_url,
            })
            .select()
            .maybeSingle();

          if (error) throw error;
          return NextResponse.json({ success: true, data });
        }
      }

      // Logika Asli untuk Canto & Intervallo
      const storyCategory = intervalloName ? 'intervallo' : 'canto';
      const storyName = intervalloName || cantoName || 'Unknown';
      const filePath = `originals/${storyCategory}/${storyName}/${resolvedEpisodeName}/${fileName}`;

      let fileSha: string | undefined = undefined;
      try {
        const getFileRes = await fetch(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              'User-Agent': 'Limbus-TL-App',
            },
          }
        );
        if (getFileRes.ok) {
          const fileData = await getFileRes.json();
          fileSha = fileData.sha;
        }
      } catch (e) {}

      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Limbus-TL-App',
          },
          body: JSON.stringify({
            message: resolvedEpisodeId 
              ? `Update original: ${storyName} - ${resolvedEpisodeName}`
              : `Add original: ${storyName} - ${resolvedEpisodeName}`,
            content: base64Content,
            ...(fileSha && { sha: fileSha }),
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      if (resolvedEpisodeId) {
        const updatePayload: Record<string, any> = {
          episode_name: resolvedEpisodeName,
          original_file_url: ghData.content.download_url,
        };
        if (intervalloName) updatePayload.intervallo_name = intervalloName;
        else if (cantoName) updatePayload.canto_name = cantoName;

        const { data, error } = await supabase
          .from('episodes')
          .update(updatePayload)
          .eq('id', resolvedEpisodeId)
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      } else {
        const insertPayload: Record<string, any> = {
          episode_name: resolvedEpisodeName,
          original_file_url: ghData.content.download_url,
        };
        if (intervalloName) insertPayload.intervallo_name = intervalloName;
        else insertPayload.canto_name = cantoName;

        const { data, error } = await supabase
          .from('episodes')
          .insert(insertPayload)
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }
    }

    // ----------------------------------------------------
    // B. UPLOAD SUBMISSION TERJEMAHAN (CANTO, INTERVALLO & SONGS FALLBACK)
    // ----------------------------------------------------
    if (type === 'user_submission') {
      const targetId = resolvedEpisodeId;
      const filePath = `submissions/${targetId}/${Date.now()}_${fileName}`;

      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Limbus-TL-App',
          },
          body: JSON.stringify({
            message: `Add translation for ID: ${targetId}`,
            content: base64Content,
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      const insertPayload: Record<string, any> = {
        file_name: fileName,
        file_url: ghData.content.download_url,
        author_name: authorName,
        author_id: authorId,
      };

      if (songId || body.song_id) insertPayload.song_id = songId || body.song_id;
      else insertPayload.episode_id = targetId;

      const { data, error } = await supabase
        .from('submissions')
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // ----------------------------------------------------
    // C. UPLOAD / UPDATE FILE ORIGINAL (ANNOUNCER)
    // ----------------------------------------------------
    if (type === 'admin_announcer_original') {
      const filePath = `originals/announcer/${announcerName}/${contentName}/${fileName}`;

      let fileSha: string | undefined = undefined;
      try {
        const getFileRes = await fetch(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              'User-Agent': 'Limbus-TL-App',
            },
          }
        );
        if (getFileRes.ok) {
          const fileData = await getFileRes.json();
          fileSha = fileData.sha;
        }
      } catch (e) {}

      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Limbus-TL-App',
          },
          body: JSON.stringify({
            message: contentId 
              ? `Update announcer original: ${announcerName} - ${contentName}`
              : `Add announcer original: ${announcerName} - ${contentName}`,
            content: base64Content,
            ...(fileSha && { sha: fileSha }),
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      if (contentId) {
        const { data, error } = await supabase
          .from('announcer_contents')
          .update({
            content_name: contentName,
            original_file_url: ghData.content.download_url,
          })
          .eq('id', contentId)
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      } else {
        const { data, error } = await supabase
          .from('announcer_contents')
          .insert({
            announcer_name: announcerName,
            content_name: contentName,
            original_file_url: ghData.content.download_url,
          })
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }
    }

    // ----------------------------------------------------
    // D. UPLOAD SUBMISSION TERJEMAHAN (ANNOUNCER)
    // ----------------------------------------------------
    if (type === 'user_announcer_submission') {
      const filePath = `submissions/announcer/${contentId}/${Date.now()}_${fileName}`;

      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Limbus-TL-App',
          },
          body: JSON.stringify({
            message: `Add announcer translation for content ID: ${contentId}`,
            content: base64Content,
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      const { data, error } = await supabase
        .from('announcer_submissions')
        .insert({
          content_id: contentId,
          file_name: fileName,
          file_url: ghData.content.download_url,
          author_name: authorName,
          author_id: authorId,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // ----------------------------------------------------
    // E. UPLOAD / UPDATE FILE ORIGINAL (MIRROR DUNGEON)
    // ----------------------------------------------------
    if (type === 'admin_md_original') {
      const categoryPath = mdCategory === 'ego_gift' ? `ego_gifts/tier_${mdTier}` : `events/${mdThemePack}`;
      const filePath = `originals/mirror_dungeon/${categoryPath}/${itemName}/${fileName}`;

      let fileSha: string | undefined = undefined;
      try {
        const getFileRes = await fetch(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              'User-Agent': 'Limbus-TL-App',
            },
          }
        );
        if (getFileRes.ok) {
          const fileData = await getFileRes.json();
          fileSha = fileData.sha;
        }
      } catch (e) {}

      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Limbus-TL-App',
          },
          body: JSON.stringify({
            message: itemId 
              ? `Update MD Item: ${itemName}`
              : `Add MD Item: ${itemName}`,
            content: base64Content,
            ...(fileSha && { sha: fileSha }),
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      const payload: Record<string, any> = {
        item_name: itemName,
        category: mdCategory,
        theme_pack: mdCategory === 'event_choice' ? mdThemePack : null,
        tier: mdCategory === 'ego_gift' ? Number(mdTier) : null,
        original_file_url: ghData.content.download_url,
      };

      if (body.imageUrl || body.image_url) payload.image_url = body.imageUrl || body.image_url;

      if (itemId) {
        const { data, error } = await supabase
          .from('mirror_dungeon_contents')
          .update(payload)
          .eq('id', itemId)
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      } else {
        const { data, error } = await supabase
          .from('mirror_dungeon_contents')
          .insert(payload)
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }
    }

    // ----------------------------------------------------
    // F. UPLOAD SUBMISSION TERJEMAHAN (MIRROR DUNGEON)
    // ----------------------------------------------------
    if (type === 'user_md_submission') {
      const filePath = `submissions/mirror_dungeon/${itemId}/${Date.now()}_${fileName}`;

      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Limbus-TL-App',
          },
          body: JSON.stringify({
            message: `Add MD translation for item ID: ${itemId}`,
            content: base64Content,
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      const { data, error } = await supabase
        .from('mirror_dungeon_submissions')
        .insert({
          content_id: itemId,
          file_name: fileName,
          file_url: ghData.content.download_url,
          author_name: authorName,
          author_id: authorId,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // ----------------------------------------------------
    // G. UPLOAD / UPDATE FILE ORIGINAL (SONGS / LYRICS)
    // ----------------------------------------------------
    if (type === 'admin_song_original') {
      const targetAlbum = resolvedAlbumName;
      const targetTitle = resolvedSongTitle;
      const filePath = `originals/songs/${targetAlbum}/${targetTitle}/${fileName}`;

      let fileSha: string | undefined = undefined;
      try {
        const getFileRes = await fetch(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              'User-Agent': 'Limbus-TL-App',
            },
          }
        );
        if (getFileRes.ok) {
          const fileData = await getFileRes.json();
          fileSha = fileData.sha;
        }
      } catch (e) {}

      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Limbus-TL-App',
          },
          body: JSON.stringify({
            message: resolvedSongId 
              ? `Update Song: ${targetAlbum} - ${targetTitle}`
              : `Add Song: ${targetAlbum} - ${targetTitle}`,
            content: base64Content,
            ...(fileSha && { sha: fileSha }),
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      if (resolvedSongId) {
        const { data, error } = await supabase
          .from('songs')
          .update({
            song_title: targetTitle,
            album_name: targetAlbum,
            original_file_url: ghData.content.download_url,
          })
          .eq('id', resolvedSongId)
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      } else {
        const { data, error } = await supabase
          .from('songs')
          .insert({
            album_name: targetAlbum,
            song_title: targetTitle,
            banner_url: body.bannerUrl || body.banner_url || '',
            original_file_url: ghData.content.download_url,
          })
          .select()
          .maybeSingle();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }
    }

    // ----------------------------------------------------
    // H. UPLOAD SUBMISSION TERJEMAHAN (SONGS / LYRICS)
    // ----------------------------------------------------
    if (type === 'user_song_submission') {
      const targetId = resolvedSongId;
      const filePath = `submissions/songs/${targetId}/${Date.now()}_${fileName}`;

      const ghRes = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Limbus-TL-App',
          },
          body: JSON.stringify({
            message: `Add song translation for song ID: ${targetId}`,
            content: base64Content,
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          song_id: targetId,
          file_name: fileName,
          file_url: ghData.content.download_url,
          author_name: authorName,
          author_id: authorId,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Tipe request tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}