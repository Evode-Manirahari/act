import type { Metadata } from 'next';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'ACT Capture — Admin',
  description: 'Review proposed teachable moments and publish training cards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">ACT CAPTURE</Link>
            <nav className="navlinks" style={{ alignItems: 'center' }}>
              <Link href="/">Review queue</Link>
              <Link href="/library">Library</Link>
              <form action="/api/sign-out" method="POST" style={{ marginLeft: 8 }}>
                <button type="submit" className="ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </div>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
