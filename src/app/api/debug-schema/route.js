import { NextResponse } from "next/server";
import { supabase as adminDb } from "@/lib/supabase";

export async function GET() {
    try {
        const { data, error } = await adminDb.from('users').select('*').limit(1);
        if (error) throw error;

        return NextResponse.json({
            columns: Object.keys(data[0] || {}),
            sample: data[0]
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
