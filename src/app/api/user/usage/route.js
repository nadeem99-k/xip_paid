import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const today = new Date().toISOString().split('T')[0];
        const { data: usageData } = await adminDb
            .from("daily_usage")
            .select("generation_count")
            .eq("user_id", user.id)
            .eq("usage_date", today)
            .maybeSingle();

        return NextResponse.json({ 
            success: true, 
            usage: usageData?.generation_count || 0 
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
