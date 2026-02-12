import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";

export async function GET() {
    try {
        const { data: settings, error } = await adminDb
            .from("system_settings")
            .select("key, value");

        if (error) {
            return NextResponse.json({ success: true, settings: [] });
        }

        // Filter for public keys only for safety
        const publicKeys = ['broadcast', 'pricing'];
        const publicSettings = settings.filter(s => publicKeys.includes(s.key));

        return NextResponse.json({ success: true, settings: publicSettings });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
