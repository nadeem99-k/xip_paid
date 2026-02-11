import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: users, error } = await adminDb
            .from("users")
            .select("id, email, package, coins, role, created_at")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, users });
    } catch (error) {
        console.error("Admin users fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
