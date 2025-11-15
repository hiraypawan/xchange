import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Xchangee - Twitter Engagement Platform',
  description: 'Earn credits by engaging with tweets, spend credits to boost your content',
  keywords: ['twitter', 'engagement', 'social media', 'automation', 'credits'],
  authors: [{ name: 'Xchangee Team' }],
  creator: 'Xchangee',
  publisher: 'Xchangee',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'Xchangee - Twitter Engagement Platform',
    description: 'Earn credits by engaging with tweets, spend credits to boost your content',
    siteName: 'Xchangee',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xchangee - Twitter Engagement Platform',
    description: 'Earn credits by engaging with tweets, spend credits to boost your content',
    creator: '@xchangee',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}