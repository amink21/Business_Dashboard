import { NextResponse } from 'next/server';
import { COOKIE, verifyToken } from './lib/auth';

// Gates pages AND the data routes. Protecting only the pages would be theatre:
// /api/sheet returns the whole sheet to anyone who asks for it directly.
export const config = {
  matcher: [
    /*
     * Everything except:
     *   _next/static, _next/image  - build output, needed to render the login page
     *   icons/, manifest, sw.js    - the installed PWA fetches these before any session
     *   login, api/login           - the way back in
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|login|api/login).*)',
  ],
};

export async function middleware(request) {
  const password = process.env.DASHBOARD_PASSWORD;

  // No password configured means the dashboard is deliberately open, which is
  // fine for localhost and not fine on a public URL. The README says so.
  if (!password) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  if (await verifyToken(token, password)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;

  // An API caller wants a status code, not a login page it cannot render.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Not signed in.', code: 'unauthenticated' },
      { status: 401 }
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  // Come back to where they were headed once they are through.
  if (pathname !== '/') url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}
