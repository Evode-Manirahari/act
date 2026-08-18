import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';

import './globals.css';
import { api } from '../lib/api';
import { isActAuthConfigured } from '../lib/actAuth';

// Self-hosted at build time. globals.css asked for Geist by name and nothing
// ever served it, so every visitor got the OS font instead of the design system.
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'ACT Capture — Admin',
  description: 'Review proposed teachable moments and publish training cards.',
};

/** "Acting as" readout: which act-api user this admin's actions are
 * attributed to. Absent while the service login isn't configured; an error
 * chip (not a crash) when sign-in or /me fails, so the operator sees the
 * misconfiguration without losing the whole admin. */
async function actingAs(): Promise<string | null> {
  if (!isActAuthConfigured) return null;
  try {
    const me = await api.me();
    return `acting as ${me.email} · ${me.role}`;
  } catch {
    return 'act-api auth error — check ADMIN_SUPABASE_* env';
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const identity = await actingAs();
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <div className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">ACT CAPTURE</Link>
            <nav className="navlinks" style={{ alignItems: 'center' }}>
              {identity ? (
                <span style={{ fontSize: 12, opacity: 0.7 }}>{identity}</span>
              ) : null}
              <Link href="/">Review queue</Link>
              <Link href="/library">Library</Link>
              <Link href="/learn">Lessons</Link>
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
