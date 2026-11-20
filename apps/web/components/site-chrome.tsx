import Image from "next/image";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { label: "Quickstart", href: "/#quickstart" },
  { label: "CLI", href: "/#cli" },
  { label: "Limits", href: "/#limits" },
  { label: "Docs", href: "/docs" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-page items-center justify-between gap-lg px-xl py-xl md:px-2xl">
      <a href="/" className="rounded-corner-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="BusFactor home">
        <Logo />
      </a>
      <div className="flex items-center gap-xs">
        <nav aria-label="Main navigation" className="hidden items-center gap-xs sm:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-corner-md px-md py-sm text-label-sm text-text-primary outline-none hover:text-text-secondary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative isolate mt-4xl overflow-hidden md:mt-section">
      <Image src="/dusk-road.webp" alt="" fill sizes="100vw" className="-z-10 object-cover object-bottom" />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-modal-scrim to-transparent" />
      <div className="mx-auto flex min-h-footer w-full max-w-page flex-col justify-end px-xl pb-2xl md:px-2xl">
        <div className="flex flex-col gap-lg sm:flex-row sm:items-center sm:justify-between">
          <a href="/" className="rounded-corner-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="BusFactor home">
            <Logo className="text-on-brand" />
          </a>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-xs">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-corner-md px-md py-sm text-label-sm text-on-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {item.label}
              </a>
            ))}
            <a href="/terms" className="rounded-corner-md px-md py-sm text-label-sm text-on-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
              Terms
            </a>
            <a href="/privacy" className="rounded-corner-md px-md py-sm text-label-sm text-on-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
              Privacy
            </a>
            <a href="/removal" className="rounded-corner-md px-md py-sm text-label-sm text-on-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
              Removal
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-tertiary font-sans text-text-primary">
      <a
        href="#main"
        className="sr-only rounded-corner-md bg-brand-primary px-lg py-sm text-on-brand focus:not-sr-only focus:absolute focus:top-sm focus:left-sm focus:z-50"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-page px-xl py-3xl md:px-2xl md:py-section">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function PageIntro({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="mx-auto flex max-w-copy flex-col items-center gap-md text-center">
      {eyebrow && <p className="text-xs tracking-widest text-text-secondary uppercase">{eyebrow}</p>}
      <h1 className="type-hero max-w-article">{title}</h1>
      {text && <p className="text-label text-text-secondary">{text}</p>}
    </div>
  );
}
