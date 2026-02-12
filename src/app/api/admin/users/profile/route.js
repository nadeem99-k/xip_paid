import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET(req) {
    try {
        const adminUser = await getAuthenticatedUser();
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // Fetch user basic info
        const { data: userProfile, error: userError } = await adminDb
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

        if (userError) throw userError;

        // Fetch user's generations
        const { data: generations, error: genError } = await adminDb
            .from("generations")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        // Fetch user's payments (all statuses)
        const { data: payments, error: payError } = await adminDb
            .from("payments")
            .select("*")
            .eq("user_id", userId)
            .order("timestamp", { ascending: false });

        return NextResponse.json({
            success: true,
            profile: userProfile,
            generations: generations || [],
            payments: payments || []
        });
    } catch (error) {
        console.error("Admin user profile fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
