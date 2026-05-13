import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";

export async function GET() {
    try {
        // Fetch last 12 generations
        const { data, error } = await adminDb
            .from("generations")
            .select("image_url, prompt, mode")
            .order("timestamp", { ascending: false })
            .limit(12);

        if (error) throw error;

        return NextResponse.json({ success: true, images: data });
    } catch (error) {
        console.error("[Public Recent API] Error:", error);
        return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
    }
}
