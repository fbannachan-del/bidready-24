import Link from "next/link";
import { ArrowUpRight, CalendarClock, MapPin } from "lucide-react";
import type { TenderOpportunity } from "@/lib/contracts-finder";

function formatDate(value: string | null) {
  if (!value) return "Not stated";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0, notation: value >= 1_000_000 ? "compact" : "standard" }).format(value);
}

function formatValue(item: TenderOpportunity) {
  if (item.valueLow && item.valueHigh && item.valueHigh > item.valueLow) return `${formatMoney(item.valueLow)}–${formatMoney(item.valueHigh)}`;
  if (item.valueLow) return `From ${formatMoney(item.valueLow)}`;
  if (item.valueHigh) return `Up to ${formatMoney(item.valueHigh)}`;
  return "Value not stated";
}

function deadlineLabel(deadline: string | null) {
  if (!deadline) return "Deadline not stated";
  const days = Math.ceil((Date.parse(deadline) - Date.now()) / 86_400_000);
  if (days <= 1) return "Closes within 24 hours";
  if (days <= 14) return `${days} days left`;
  return `Closes ${formatDate(deadline)}`;
}

export function TenderCard({ opportunity, compact = false }: { opportunity: TenderOpportunity; compact?: boolean }) {
  return (
    <article className="panel flex h-full flex-col p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-chip bg-emerald-50 text-emerald-700">Open</span>
        {opportunity.suitableForSme && <span className="status-chip bg-[var(--blue-soft)] text-[var(--blue-ink)]">SME suitable</span>}
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[.1em] text-[var(--ink-faint)]">{opportunity.source}</span>
      </div>
      <h3 className="mt-5 font-serif text-xl font-medium leading-snug">{opportunity.title}</h3>
      <p className="mt-2 text-xs font-medium text-[var(--slate)]">{opportunity.buyer}</p>
      {!compact && <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--slate)]">{opportunity.description}</p>}
      <dl className="mt-5 grid gap-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--slate)]">
        <div className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-[var(--signal-blue)]" /><dt className="sr-only">Deadline</dt><dd className="font-medium text-[var(--ink)]">{deadlineLabel(opportunity.deadlineAt)}</dd></div>
        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /><dt className="sr-only">Region</dt><dd>{opportunity.region}</dd></div>
        <div className="flex justify-between gap-3"><dt>Contract value</dt><dd className="text-right font-medium text-[var(--ink)]">{formatValue(opportunity)}</dd></div>
      </dl>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <Link href="/pricing" className="text-xs font-medium text-[var(--blue-ink)]">Analyse this tender</Link>
        <a href={opportunity.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--slate)] hover:text-[var(--ink)]">Official notice <ArrowUpRight className="h-3.5 w-3.5" /></a>
      </div>
    </article>
  );
}
