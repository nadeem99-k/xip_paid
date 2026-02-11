import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";

/**
 * Set Admin Role Endpoint
 * Use this to set specific email as admin
 * WARNING: This should be secured in production
 */
export async function POST(request) {
    try {
        const { email, secret } = await request.json();

        // Basic security check
        if (secret !== process.env.ADMIN_SECRET) {
            return NextResponse.json({
                success: false,
                error: "Unauthorized"
            }, { status: 401 });
        }

        if (!email) {
            return NextResponse.json({
                success: false,
                error: "Email is required"
            }, { status: 400 });
        }

        // Update user role to admin
        const { data, error } = await adminDb
            .from('users')
            .update({ role: 'admin' })
            .eq('email', email)
            .select();

        if (error) {
            console.error("[Set Admin] Error:", error);
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({
                success: false,
                error: "User not found with that email"
            }, { status: 404 });
        }

        console.log(`[Set Admin] Successfully set ${email} as admin`);

        return NextResponse.json({
            success: true,
            message: `User ${email} is now an admin`,
            user: data[0]
        });
    } catch (error) {
        console.error("[Set Admin] Exception:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
