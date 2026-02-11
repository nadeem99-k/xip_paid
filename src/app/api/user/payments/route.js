import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: payments, error } = await adminDb
            .from("payments")
            .select("*")
            .eq("user_id", user.id)
            .order("timestamp", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, payments });
    } catch (error) {
        console.error("User payments fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
