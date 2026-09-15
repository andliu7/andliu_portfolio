import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://andrew-liu-portfolio.dainty-robin-4747.chatgpt.site'),
  title: 'Andrew Liu — Curiosity, put to work',
  description: 'Selected work by Andrew Liu. Thoughtful tools for visual learning, connected knowledge, and everyday systems.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Andrew Liu — Selected Work',
    description: 'Chemistry, knowledge, and thoughtful software. A collection of projects by Andrew Liu.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
