import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Basic protection for admin routes (MVP)
  if (pathname.startsWith('/admin')) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    // Allow if no password set (dev), otherwise require ?key= or cookie
    if (adminPassword) {
      const key = request.nextUrl.searchParams.get('key') || 
                  request.cookies.get('admin_key')?.value;
      
      if (key !== adminPassword) {
        return NextResponse.rewrite(new URL('/admin/locked', request.url));
      }

      // If key provided via query, set a short-lived cookie for convenience
      if (request.nextUrl.searchParams.get('key')) {
        const response = NextResponse.next();
        response.cookies.set('admin_key', adminPassword, {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 8, // 8 hours
          path: '/',
        });
        // Clean the key from URL
        const cleanUrl = request.nextUrl.clone();
        cleanUrl.searchParams.delete('key');
        return NextResponse.redirect(cleanUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
