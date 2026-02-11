import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all generations with user emails
        const { data: generations, error } = await adminDb
            .from("generations")
            .select(`
                *,
                users (
                    email
                )
            `)
            .order("created_at", { ascending: false });

        if (error) {
            // Fallback for timestamp if created_at fails
            const { data: genAlt, error: errAlt } = await adminDb
                .from("generations")
                .select(`
                    *,
                    users (
                        email
                    )
                `)
                .order("timestamp", { ascending: false });

            if (errAlt) throw errAlt;
            return NextResponse.json({ success: true, generations: genAlt });
        }

        return NextResponse.json({ success: true, generations });
    } catch (error) {
        console.error("Admin generations fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
