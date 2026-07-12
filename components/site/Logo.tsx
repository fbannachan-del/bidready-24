import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="BidReady 24 home">
      <span className="relative grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--ink)] text-white shadow-[0_1px_0_rgba(0,0,0,.12)]">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 4 4L19 6" />
          <circle cx="19" cy="6" r="1.7" className="fill-[var(--signal-blue)] stroke-[var(--signal-blue)]" />
        </svg>
      </span>
      {!compact && (
        <span className="font-serif text-[21px] font-semibold tracking-[-0.03em] text-[var(--ink)]">
          BidReady <span className="text-[var(--signal-blue)]">24</span>
        </span>
      )}
    </Link>
  );
}
