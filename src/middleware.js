import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // Allow requests if the following is true:
    // 1) It's a request for next-auth session & provider fetching
    // 2) The token exists
    if (pathname.startsWith("/api/auth") || token) {
        return NextResponse.next();
    }

    // Redirect them to login if they don't have a token AND are requesting a protected route
    if (!token && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/api/((?!auth).*)"],
};
