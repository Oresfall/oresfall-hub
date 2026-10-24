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
      {/* BANNER HEROBAR */}
      <div className="bg-gradient-to-r from-[#181920] via-[#2a0e12] to-[#181920] border border-[#7f1d1d] rounded p-6 text-center relative overflow-hidden shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-100 mb-2">
          Selamat Datang di <span className="text-[#ef4444]">Terjemahan Limbus Indonesia</span>
        </h1>
        <div className="bg-[#831843]/60 border-y border-[#be123c] py-1 my-2">
          <p className="text-xs font-bold uppercase tracking-widest text-red-200">
            HADAPI DOKSLI, TERJEMAHKAN E.G.O
          </p>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl mx-auto mt-2 leading-relaxed">
          Komunitas penimpa teks di game <span className="text-slate-200 font-semibold">Limbus Company</span> dalam bahasa Indonesia.
        </p>
      </div>

      {/* KATEGORI TERJEMAHAN */}
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

      {/* TENTANG INDONESIA LIMBUS TRANSLATION */}
      <section className="bg-[#18181b]/60 border border-[#27272a] rounded p-5 space-y-3 shadow-lg">
        <h2 className="text-[#ef4444] font-bold text-sm tracking-wider uppercase border-b border-[#27272a] pb-2">
            Tentang Indonesia Limbus Translation
        </h2>
        
        <div className="space-y-2 text-xs text-[#a1a1aa] leading-relaxed">
          <p>
            Website ini berfungsi sebagai pusat koordinasi utama untuk menerjemahkan Canto cerita, skill Identitas, Announcer, EGO Gift, hingga Lirik Lagu ke dalam bahasa Indonesia.
          </p>
          <p>
            Tertarik untuk berkontribusi tapi tidak memiliki waktu untuk menerjemahkan? Kamu tetap bisa mendukung proyek ini dengan memberikan donasi melalui link di bawah!
          </p>
          <p>
            Kalian juga dapat bergabung dengan komunitas Discord kami untuk berdiskusi, memberikan saran, atau sekadar bersosialisasi dengan sesama penggemar Limbus Company!
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
              href="https://github.com/Oresfall/Indonesia-Limbus-Translation/releases/tag/v0.10.0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#b91c1c] hover:bg-[#dc2626] text-white font-bold text-xs px-4 py-2 rounded transition shadow"
          >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Download Terjemahan Indonesia
          </a>

          <a
              href="https://sociabuzz.com/oresfall/tribe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2 rounded transition shadow"
          >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              Dukungan Donasi
          </a>

          <a
              href="https://discord.gg/BAqBnceVQS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs px-4 py-2 rounded transition shadow"
          >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.077.077 0 0 1-.006.128c-.598.35-1.221.648-1.873.892-.041.016-.062.064-.04.106.355.698.766 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Komunitas Discord
          </a>
        </div>
      </section>

      {/* FAQ SECTION */}
      <div className="bg-[#0f1015]/80 border border-[#27272a] rounded p-5 space-y-3 shadow-lg">
        <h2 className="text-base font-bold uppercase tracking-wide text-slate-200 border-b border-[#27272a] pb-2">
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>
        <div className="space-y-3">
          {FAQS.map((faq, index) => (
            <div key={index} className="bg-[#14151a] border border-[#27272a] p-3 rounded hover:border-[#3f3f46] transition">
              <p className="text-xs font-bold text-red-400 mb-1">T: {faq.q}</p>
              <p className="text-xs text-slate-300 leading-relaxed">J: {faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}