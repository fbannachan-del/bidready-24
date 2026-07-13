import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep the document parsers out of the server bundle so the deployed server
  // require()s the real packages at runtime. pdf-parse pulls in pdfjs-dist
  // (ESM/workers, breaks when traced into a bundle) and SheetJS lazily does
  // require('fs') internally (breaks when rewritten by the bundler). When either
  // throws, extractTenderPack()'s Promise.allSettled swallows the failure, so
  // PDF/XLSX uploads silently produce zero fragments (and a single-format upload
  // fails analysis outright). NOTE: verify this resolves it with a local
  // production `next build` + `next start` over the golden fixtures before
  // relying on it — bundling has not been isolated from a possible
  // file-persistence cause on the host.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "xlsx", "mammoth"],
  async headers() {
    const securityHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/project/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
