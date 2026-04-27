'use client';
import { SessionProvider } from 'next-auth/react';
import './globals.css';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Countryside POS</title>
        <link rel="icon" href="/cside-v2.png" type="image/png" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
