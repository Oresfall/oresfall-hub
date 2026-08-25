'use client';

import Link from 'next/link';

const TRANSLATION_CATEGORIES = [
  {
    id: 'canto',
    title: 'CANTO',
    subtitle: 'Cerita Utama',
    link: '/limbus-id-tl/canto',
    bgImage: 'https://external-preview.redd.it/new-mili-song-with-this-wallpaper-goes-crazy-canto-6-v0-bW05azIwenY3Z25lMRMKqvVlpwiJQd3kJzFegKjvclgWqOxTXVOQgmeYrLwj.png?format=pjpg&auto=webp&s=15e8b113d88904b481103028278b7a9aabc5d464'
  },
  {
    id: 'intervallo',
    title: 'INTERVALLO',
    subtitle: 'Cerita Sampingan & Event',
    link: '/limbus-id-tl/intervallo',
    bgImage: 'https://mediaproxy.tvtropes.org/width/1200/https://static.tvtropes.org/pmwiki/pub/images/timekillingtime.png'
  },
  {
    id: 'identitas',
    title: 'IDENTITAS',
    subtitle: 'Skill & Story Identity',
    link: '/limbus-id-tl/identitas',
    bgImage: 'https://gamebrott.com/wp-content/uploads/2025/08/image-86-1-1024x576.webp'
  },
  {
    id: 'announcer',
    title: 'ANNOUNCER',
    subtitle: 'Battle Announcer',
    link: '/limbus-id-tl/announcer',
    bgImage: 'https://i1.sndcdn.com/artworks-3yyzQnsWboSleCpX-RJJzig-t1080x1080.jpg'
  },
  {
    id: 'ego-gift',
    title: 'MIRROR DUNGEON',
    subtitle: 'EGO Gift & Themepack',
    link: '/limbus-id-tl/mirror-dungeon',
    bgImage: 'https://media.tenor.com/GbSeQtLR5JoAAAAe/mirror-dungeon-situation-is-crazy-hos-ryoshu.png'
  },
  {
    id: 'lirik-lagu',
    title: 'LIRIK LAGU',
    subtitle: 'MILI & OST Limbus',
    link: '/limbus-id-tl/lirik-lagu',
    bgImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6eSiNzw8yfJD1AZjq4MjhKncnrCQ_UqArumleXWy64VY-Cx_O0yaohBA&s=10'
  },
];

const FAQS = [
  {
    q: "Kenapa beberapa Story masih dalam bahasa inggris ya?",
    a: "Untuk project-nya masih dalam tahap pengerjaan ya, teks yang ada di dalam game akan di translasi secara bertahap. Mohon bersabar ya!"
  },
  {
    q: "Apakah translasi bisa dipakai di Limbus HP?",
    a: "Translasi Indonesia hanya dapat dipakai di Limbus Steam ya, untuk yang versi HP belum tersedia."
  },
  {
    q: "Aman tidak jika memakai mod ini?",
    a: "Fitur custom language sudah di support langsung dari pihak Developer-nya ya, jadinya aman."
  }
];

export default function LimbusWikiMainPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#181920] via-[#2a0e12] to-[#181920] border border-[#7f1d1d] rounded p-6 text-center relative overflow-hidden shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-100 mb-2">
          Selamat Datang di <span className="text-[#ef4444]">Terjemahan Limbus Indonesia</span>
        </h1>
        <div className="bg-[#831843]/60 border-y border-[#be123c] py-1 my-2">
          <p className="text-xs font-bold uppercase tracking-widest text-red-200">
            HADAPI DOKSLI, TERJEMAHKAN E.G.O
          </p>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl mx-auto mt-2">
          Komunitas penimpa teks di game <span className="text-slate-200 font-semibold">Limbus Company</span> dalam bahasa Indonesia.
        </p>
      </div>

      <div id="categori-grid" className="space-y-3">
        <div className="border-b border-[#3f3f46] pb-2">
          <h2 className="text-base font-black uppercase tracking-wider text-[#ef4444]">
            Kategori Terjemahan
          </h2>
          <p className="text-xs text-slate-400">Pilih salah satu kategori di bawah untuk melihat daftar berkas terjemahan:</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {TRANSLATION_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.link}
              className="group relative h-36 rounded overflow-hidden border-2 border-[#3f3f46] hover:border-[#ef4444] transition-all duration-300 shadow-lg flex items-center justify-center text-center p-4 cursor-pointer"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url('${cat.bgImage}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40 group-hover:via-black/40 transition-all" />

              <div className="relative z-10 space-y-1">
                <h3 className="text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-red-400 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-[11px] text-slate-300 font-medium tracking-wide">
                  {cat.subtitle}
                </p>
              </div>

              <div className="absolute top-0 left-0 w-full h-1 bg-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>

      <section className="bg-[#18181b]/60 border border-[#27272a] rounded p-4">
        <h2 className="text-[#ef4444] font-bold text-sm tracking-wider uppercase border-b border-[#27272a] pb-2 mb-3">
            Tentang Indonesia Limbus Translation
        </h2>
        <p className="text-xs text-[#a1a1aa] leading-relaxed mb-4">
            Wiki ini berfungsi sebagai pusat koordinasi utama untuk menerjemahkan Canto cerita, skill Identitas, Announcer, EGO Gift, hingga Lirik Lagu ke dalam bahasa Indonesia.
        </p>
        
        <a
            href="https://drive.google.com/drive/folders/1mm45P52j7-CGTaCf_hjzMVFNyAWQ3WK9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#b91c1c] hover:bg-[#dc2626] text-white font-bold text-xs px-4 py-2 rounded transition"
        >
            Download Terjemahan Indonesia
        </a>
      </section>

      <div className="bg-[#0f1015]/80 border border-[#27272a] rounded p-5 space-y-3">
        <h2 className="text-base font-bold uppercase tracking-wide text-slate-200 border-b border-[#27272a] pb-2">
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq, index) => (
            <div key={index} className="bg-[#14151a] border border-[#27272a] p-3 rounded">
              <p className="text-xs font-bold text-red-400 mb-1">T: {faq.q}</p>
              <p className="text-xs text-slate-300 leading-relaxed">J: {faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}