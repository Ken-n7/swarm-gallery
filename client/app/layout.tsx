import type { Metadata } from 'next';
import { Inter, Paytone_One } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const paytone = Paytone_One({ weight: '400', subsets: ['latin'], variable: '--font-paytone-src' });

export const metadata: Metadata = {
  title: 'Swarm Gallery',
  description: "Your event. Everyone's gallery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${paytone.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
