import type { Metadata } from 'next';
import { Providers } from '@/lib/Providers';
import { HydrateAuth } from '@/components/common/HydrateAuth';
import '@/styles/globals.css';


export const metadata: Metadata = {
  title: 'Шалгалтын Систем',
  description: 'Anti-cheat exam system for Mongolian universities',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <HydrateAuth />
          {children}
        </Providers>
      </body>
    </html>
  );
}