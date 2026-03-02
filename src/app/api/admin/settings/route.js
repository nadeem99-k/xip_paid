import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

const TABLE_NAME = "system_settings";

export async function GET() {
    try {
        const { data: settings, error } = await adminDb
            .from(TABLE_NAME)
            .select("*");

        if (error) {
            if (error.code === 'PGRST205') {
                return NextResponse.json({
                    success: false,
                    error: "Table missing",
                    setup_required: true,
                    migration_file: "/migrations/create-system-settings.sql"
                });
            }
            return NextResponse.json({ success: true, settings: [] });
        }

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error("[Settings API] GET error:", error);
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
            .from(TABLE_NAME)
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

        if (error) {
            console.error("[Settings API] Upsert Error:", error);
            if (error.code === 'PGRST205') {
                return NextResponse.json({
                    success: false,
                    error: "Database table 'system_settings' is missing. Please run the migration found in /migrations/create-system-settings.sql",
                    setup_required: true
                }, { status: 400 });
            }
            throw error;
        }

        return NextResponse.json({ success: true, message: "Setting updated" });
    } catch (error) {
        console.error("[Settings API] POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
