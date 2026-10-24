import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get('accessToken')?.value;
  const userRole = request.cookies.get('userRole')?.value;

  const isAuthenticated = Boolean(accessToken && accessToken.trim().length > 10);

  // 1. Ignore static assets, public files, and api routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Allow /login page to render without auto-redirect to avoid stale-cookie redirect loops
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // 3. Alias /doctor/opd or /doctor/dashboard to /doctor
  if (pathname === '/doctor/opd' || pathname === '/doctor/dashboard') {
    return NextResponse.redirect(new URL('/doctor', request.url));
  }

  // 4. Redirect root path '/' to role landing page or login
  if (pathname === '/') {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('accessToken');
      response.cookies.delete('userRole');
      return response;
    }
    if (userRole === 'hospital_admin') {
      return NextResponse.redirect(new URL('/admin/doctors', request.url));
    }
    return NextResponse.redirect(new URL('/doctor', request.url));
  }

  // 5. Protect Admin routes (/admin/*)
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('accessToken');
      response.cookies.delete('userRole');
      return response;
    }
    if (userRole && userRole !== 'hospital_admin') {
      // Doctor attempting to access admin route
      return NextResponse.redirect(new URL('/doctor', request.url));
    }
  }

  // 6. Protect Doctor routes (/doctor/* or /doctor)
  if (pathname.startsWith('/doctor')) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('accessToken');
      response.cookies.delete('userRole');
      return response;
    }
    if (userRole && userRole === 'hospital_admin') {
      // Admin attempting to access doctor route
      return NextResponse.redirect(new URL('/admin/doctors', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
