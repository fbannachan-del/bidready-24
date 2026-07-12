import Link from "next/link";

export default function AdminLocked() {
  return (
    <div className="max-w-md mx-auto p-8 mt-10 text-center">
      <h1 className="text-2xl font-semibold">Admin Access</h1>
      <p className="mt-4 text-[#475569]">
        This area is protected. To access in this preview deployment, append <code>?key=YOUR_ADMIN_PASSWORD</code> to the admin URL.
      </p>
      <p className="mt-2 text-xs text-[#64748B]">
        Set ADMIN_PASSWORD in your Render environment variables. 
        For better security, replace this with proper auth before using with real customer data.
      </p>
      <div className="mt-6">
        <Link href="/" className="text-[#0A3D62] underline">← Back to site</Link>
      </div>
    </div>
  );
}
