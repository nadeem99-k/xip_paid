import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: referrals, error } = await adminDb
            .from("users")
            .select("email, created_at")
            .eq("referred_by", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Mask emails for privacy (e.g., u***@gmail.com)
        const maskedReferrals = referrals.map(r => ({
            email: r.email.replace(/(.{1})(.*)(@.*)/, "$1***$3"),
            timestamp: r.created_at
        }));

        return NextResponse.json({ success: true, referrals: maskedReferrals });
    } catch (error) {
        console.error("User referrals fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
