import Link from "next/link";

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-sans font-semibold uppercase leading-none tracking-[-0.045em] text-[var(--ink)] ${className}`}>
      BIDREADY<span className="text-[var(--signal-blue)]">24</span>
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="BIDREADY24 home">
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-8 w-8 shrink-0">
        <rect width="32" height="32" rx="9" fill="var(--signal-blue)" />
        <path d="M8.6 16.4 13.2 20.9 20.6 10.8" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="21.8" cy="9.2" r="2.6" fill="#a8b8ef" />
      </svg>
      {!compact && <BrandWordmark className="text-[18px]" />}
    </Link>
  );
}
