import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let { data: users, error } = await adminDb
            .from("users")
            .select("id, email, package, coins, role, created_at, ip_address")
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Retrying fetch without ip_address column:", error.message);
            // Retry without ip_address if the column doesn't exist
            const { data: retryUsers, error: retryError } = await adminDb
                .from("users")
                .select("id, email, package, coins, role, created_at")
                .order("created_at", { ascending: false });

            if (retryError) throw retryError;
            users = retryUsers;
        }

        return NextResponse.json({ success: true, users });
    } catch (error) {
        console.error("Admin users fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
