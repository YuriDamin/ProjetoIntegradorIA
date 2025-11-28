import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  const protectedRoutes = ["/board"];

  const tryingToAccessProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  if (tryingToAccessProtectedRoute && !token) {
    
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/board/:path*", "/board"],
};
