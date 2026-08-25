// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css'; // Sesuaikan lokasi CSS global kamu jika ada

export const metadata: Metadata = {
  title: 'Indonesia Limbus Translation',
  description: 'Komunitas penerjemah teks dan cerita game Limbus Company ke dalam Bahasa Indonesia.',
  icons: {
    icon: 'https://i.imgur.com/rphZwYy.png',
  },
  openGraph: {
    title: 'Indonesia Limbus Translation',
    description: 'Komunitas penerjemah teks dan cerita game Limbus Company ke dalam Bahasa Indonesia.',
    url: 'https://oresfall.vercel.app/limbus-id-tl',
    siteName: 'Limbus Company Wiki TL',
    images: [
      {
        url: 'https://i.imgur.com/CLtyIeQ.png',
        width: 1200,
        height: 630,
        alt: 'Indonesia Limbus Translation Logo',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Indonesia Limbus Translation',
    description: 'Komunitas penerjemah teks dan cerita game Limbus Company ke dalam Bahasa Indonesia.',
    images: ['https://i.imgur.com/CLtyIeQ.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}