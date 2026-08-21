import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      type, 
      cantoName, 
      intervalloName, 
      episodeName, 
      episodeId, 
      fileName, 
      jsonContent, 
      authorName, 
      authorId 
    } = body;

    const contentString = JSON.stringify(jsonContent, null, 2);
    const base64Content = Buffer.from(contentString).toString('base64');

    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    const githubToken = process.env.GITHUB_TOKEN;

    // Menentukan kategori folder & nama utama (Canto atau Intervallo)
    const storyCategory = intervalloName ? 'intervallo' : 'canto';
    const storyName = intervalloName || cantoName || 'Unknown';

    // ----------------------------------------------------
    // A. UPLOAD / UPDATE FILE ORIGINAL MENTAH (KHUSUS ADMIN)
    // ----------------------------------------------------
    if (type === 'admin_original') {
      const filePath = `originals/${storyCategory}/${storyName}/${episodeName}/${fileName}`;

      // 1. Cek apakah file sudah ada di GitHub untuk mendapatkan `sha`
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
      } catch (e) {
        // Abaikan jika file belum ada
      }

      // 2. Upload/Update file ke GitHub
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
            message: episodeId 
              ? `Update original: ${storyName} - ${episodeName}`
              : `Add original: ${storyName} - ${episodeName}`,
            content: base64Content,
            ...(fileSha && { sha: fileSha }),
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      // 3. Update atau Insert ke Supabase
      if (episodeId) {
        // Jika UPDATE episode
        const updatePayload: Record<string, any> = {
          episode_name: episodeName,
          original_file_url: ghData.content.download_url,
        };

        if (intervalloName) {
          updatePayload.intervallo_name = intervalloName;
        } else if (cantoName) {
          updatePayload.canto_name = cantoName;
        }

        const { data, error } = await supabase
          .from('episodes')
          .update(updatePayload)
          .eq('id', episodeId)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      } else {
        // Jika TAMBAH episode baru
        const insertPayload: Record<string, any> = {
          episode_name: episodeName,
          original_file_url: ghData.content.download_url,
        };

        if (intervalloName) {
          insertPayload.intervallo_name = intervalloName;
        } else {
          insertPayload.canto_name = cantoName;
        }

        const { data, error } = await supabase
          .from('episodes')
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
      }
    }

    // ----------------------------------------------------
    // B. UPLOAD SUBMISSION TERJEMAHAN (USER / TRANSLATOR)
    // ----------------------------------------------------
    if (type === 'user_submission') {
      const filePath = `submissions/${episodeId}/${Date.now()}_${fileName}`;

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
            message: `Add translation for episode ID: ${episodeId}`,
            content: base64Content,
          }),
        }
      );

      const ghData = await ghRes.json();
      if (!ghRes.ok) throw new Error(ghData.message || 'Gagal upload ke GitHub');

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          episode_id: episodeId,
          file_name: fileName,
          file_url: ghData.content.download_url,
          author_name: authorName,
          author_id: authorId,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Tipe request tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}