import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const { data: settings, error } = await adminDb
            .from("system_settings")
            .select("*");

        if (error) {
            // If table doesn't exist, return empty or default
            return NextResponse.json({ success: true, settings: [] });
        }

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { key, value } = await req.json();

        const { error } = await adminDb
            .from("system_settings")
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Setting updated" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
