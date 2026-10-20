import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Snap Shop', template: '%s · Snap Shop' },
  description: 'A simple storefront for small businesses.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
