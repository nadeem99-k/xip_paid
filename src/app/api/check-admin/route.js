import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-helpers";

/**
 * Admin Status Check Endpoint
 * Returns current user's authentication status and role
 */
export async function GET() {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({
                success: false,
                authenticated: false,
                isAdmin: false,
                message: "Not authenticated"
            }, { status: 401 });
        }

        const isAdmin = user.role === 'admin';

        return NextResponse.json({
            success: true,
            authenticated: true,
            isAdmin,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                coins: user.coins,
                package: user.package
            }
        });
    } catch (error) {
        console.error("[Admin Check] Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
