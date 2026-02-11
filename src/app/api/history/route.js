import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log(`History API: Found user ${user.id} with ${user.coins} coins`);

        // Check columns to handle missing fields gracefully
        // We typically assume schema is correct or fixed, but keeping fallback logic for robustness if desired
        // For now, simpler query:

        const { data: history, error } = await adminDb
            .from("generations")
            .select("*")
            .eq("user_id", user.id)
            .order("timestamp", { ascending: false });

        if (error) {
            // Fallback for timestamp/created_at sort issues logic if needed
            const { data: historyAlt, error: errorAlt } = await adminDb
                .from("generations")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (!errorAlt) return NextResponse.json({ success: true, history: historyAlt || [], user });

            return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
        }

        return NextResponse.json({ success: true, history: history || [], user });
    } catch (error) {
        console.error("History fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const imageId = searchParams.get('id');

        if (!imageId) {
            return NextResponse.json({ error: "Image ID required" }, { status: 400 });
        }

        const { error } = await adminDb
            .from("generations")
            .delete()
            .eq("id", imageId)
            .eq("user_id", user.id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Image deleted successfully" });
    } catch (error) {
        console.error("History delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
