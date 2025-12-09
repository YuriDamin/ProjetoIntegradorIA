import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function proxy(request: NextRequest) {
    // console.log("Middleware executing for:", request.nextUrl.pathname);

    const token = request.cookies.get('token')?.value

    // Se não tiver token e tentar acessar rotas protegidas
    if (!token &&
        (request.nextUrl.pathname.startsWith('/board') ||
            request.nextUrl.pathname.startsWith('/calendar'))) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Se tiver token e tentar acessar login ou register
    if (token &&
        (request.nextUrl.pathname === '/login' ||
            request.nextUrl.pathname === '/register')) {
        return NextResponse.redirect(new URL('/board', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/board/:path*',
        '/calendar/:path*',
        '/login',
        '/register'
    ],
}
