import type { ReactNode } from 'react';

export const metadata = {
  title: 'Markaz Operations',
  description: 'Internal operations and admin panel.',
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
