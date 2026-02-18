import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";

export async function middleware(request) {
    console.log(`[Middleware] ${request.method} ${request.nextUrl.pathname}`);
    const response = await updateSession(request);

    // Capture referral code from URL and store in cookie
    const referralCode = request.nextUrl.searchParams.get("ref");
    if (referralCode) {
        // Set cookie for 7 days
        response.cookies.set("referral_code", referralCode, {
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Any file with an extension (e.g. .png, .jpg, .svg)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
