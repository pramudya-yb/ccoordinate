import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TM3 Converter',
  description: 'Konversi koordinat WGS84 ↔ TM3 Indonesia (DGN95)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
