import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, processReferral } from '@/lib/auth-helpers'
import { cookies } from 'next/headers'

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Extract IP address
            const forwardedFor = request.headers.get('x-forwarded-for');
            const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : request.ip || '127.0.0.1';

            // Ensure user record exists in database (syncing coins, role, etc.)
            const user = await getAuthenticatedUser(ip);

            // Handle referral processing
            const referralCode = (await cookies()).get("referral_code")?.value;
            if (user && referralCode) {
                await processReferral(user.email, referralCode);
            }

            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
