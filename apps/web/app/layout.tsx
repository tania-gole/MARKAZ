import type { ReactNode } from 'react';

export const metadata = {
  title: 'Markaz Home',
  description: 'A transaction-aware real-estate platform for the UAE.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
