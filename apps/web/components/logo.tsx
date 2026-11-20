import { cn } from "cn";

export function BusFactorMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="11" cy="3.75" r="2.75" className="fill-brand-primary" />
      <path d="M11 10V26" className="stroke-current" strokeWidth={3.6} strokeLinecap="round" fill="none" />
      <circle cx="18.5" cy="19.5" r="6.5" className="stroke-current" strokeWidth={3.6} fill="none" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-sm text-text-primary", className)}>
      <BusFactorMark className="size-6 shrink-0" />
      <span className="font-display text-label font-semibold tracking-tight">BusFactor</span>
    </span>
  );
}
