import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from './Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Boticario Wi-Fi Insights',
  description: 'Visitor Wi-Fi analytics for a Boticario store',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
