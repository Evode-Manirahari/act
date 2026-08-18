/**
 * Actober AI marketing site — the Field Instrument system (DESIGN.md)
 * translated to web: Geist + Geist Mono, ink on cool steel, one safety-orange
 * action color, squared radii, mono-accented labels. Light-first, no gradients.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Actober AI - capture your senior HVAC techs before they retire',
  description:
    'Your senior techs film real calls; Actober turns their reasoning into lead-tech-approved training cards that cut callbacks and ramp new hires - with the original footage as proof.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <Link href="/" className="wordmark">
            ACT<span className="wordmarkBy"> · ACTOBER AI</span>
          </Link>
          <nav className="navLinks">
            <a href="/#how">How it works</a>
            <a href="/#library">The training</a>
            <a href="/#pilot" className="navCta">
              Book a pilot
            </a>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <div className="footerInner">
            <span className="mono">© {new Date().getFullYear()} ACTOBER AI</span>
            <div className="footerLinks">
              <Link href="/privacy">Privacy</Link>
              <Link href="/support">Support</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
