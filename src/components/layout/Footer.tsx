import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30 py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Company info */}
          <div className="text-xs text-muted-foreground text-center sm:text-left">
            <p>© {new Date().getFullYear()} Imum, UAB. Visos teisės saugomos.</p>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-4 text-xs">
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privatumo politika
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sąlygos
            </Link>
            <span className="text-border">|</span>
            <a
              href="mailto:labas@legalai.lt"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              labas@legalai.lt
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
