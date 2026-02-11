import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";

/**
 * Check User Role Endpoint
 * Quick endpoint to check current user's role and details
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({
                success: false,
                error: "Email parameter is required. Usage: /api/check-user-role?email=your@email.com"
            }, { status: 400 });
        }

        // Fetch user from database
        const { data: user, error } = await adminDb
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: "User not found in database",
                    email: email
                }, { status: 404 });
            }

            console.error("[Check User Role] Error:", error);
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                coins: user.coins,
                package: user.package,
                created_at: user.created_at,
                full_name: user.full_name || user.name
            },
            isAdmin: user.role === 'admin'
        });
    } catch (error) {
        console.error("[Check User Role] Exception:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
