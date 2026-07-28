import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Prayer Partners',
    template: '%s · Prayer Partners',
  },
  description:
    'Create a prayer partner session for your church or group — everyone joins with a link, and each person is privately matched with someone to pray for.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Prayer Partners',
    description:
      'Create a prayer partner session for your church or group — everyone joins with a link, and each person is privately matched with someone to pray for.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}