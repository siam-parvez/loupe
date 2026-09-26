import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { BRAND } from '@/lib/brand';

import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const jetbrainsMono = JetBrains_Mono({ variable: '--font-jetbrains-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: BRAND.productCredit, template: `%s · ${BRAND.productCredit}` },
  description: `${BRAND.productCredit} — review high-resolution artwork up close before it goes to print.`,
  applicationName: BRAND.product,
  authors: [{ name: BRAND.name, url: BRAND.siteUrl }],
  // Client review links should never show up in search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: BRAND.themeColor,
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
