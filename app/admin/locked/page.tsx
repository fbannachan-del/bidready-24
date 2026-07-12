import Link from "next/link";
import { publicAppUrl, sanitizeAdminRedirect } from "@/lib/admin-auth";

export default async function AdminLocked({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  const next = sanitizeAdminRedirect(query.next);
  const error = query.error === "invalid"
    ? "The password was not accepted. Please try again."
    : query.error === "configuration"
      ? "Admin access is not configured. Set ADMIN_PASSWORD in the deployment secrets."
      : query.error === "origin"
        ? "Your browser blocked the sign-in request. This page now uses the canonical secure address—please try once more."
      : null;
  const sessionAction = process.env.NODE_ENV === "production"
    ? publicAppUrl("/api/admin/session", "https://www.bidready24.com", process.env.APP_URL).href
    : "/api/admin/session";
  return (
    <div className="mx-auto mt-10 max-w-md border border-[#D9D5CB] bg-[#FBFAF6] p-8 text-center font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <div className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1457FF]">Protected workspace</div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Admin access</h1>
      <p className="mt-4 text-sm leading-6 text-[#667085]">
        Sign in with the deployment admin password. The password is submitted securely and is never added to the URL.
      </p>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form action={sessionAction} method="post" className="mt-6 text-left">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="admin-password" className="block text-sm font-medium text-slate-800">Admin password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required autoFocus className="mt-2 w-full border border-[#B7B2A7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1457FF] focus:ring-2 focus:ring-[#DCE5FF]" />
        <button type="submit" className="mt-4 w-full bg-[#1457FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0C45D8]">Sign in</button>
      </form>
      <p className="mt-4 text-xs text-[#64748B]">Sessions expire after eight hours. Set ADMIN_PASSWORD in the Render environment secrets and rotate it immediately if exposure is suspected.</p>
      <div className="mt-6">
        <Link href="/" className="text-[#1457FF] underline underline-offset-4">← Back to site</Link>
      </div>
    </div>
  );
}
