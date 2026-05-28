import type { Metadata } from 'next';
import { Inter, Paytone_One } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const paytone = Paytone_One({ weight: '400', subsets: ['latin'], variable: '--font-paytone-src' });

export const metadata: Metadata = {
  title: 'Swarm Gallery',
  description: "Your event. Everyone's gallery.",
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${paytone.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
