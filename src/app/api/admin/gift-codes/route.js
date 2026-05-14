import { NextResponse } from "next/server";
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

// Admin check middleware (Simplified)
async function checkAdmin() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'admin') return null;
    return user;
}

export async function GET(req) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { data, error } = await adminDb
            .from("gift_codes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, codes: data });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { code, coins, expires_at } = await req.json();

        if (!code || !coins) {
            return NextResponse.json({ error: "Code and coins are required" }, { status: 400 });
        }

        const { data, error } = await adminDb
            .from("gift_codes")
            .insert([{
                code: code.trim().toUpperCase(),
                coins: parseInt(coins),
                is_used: false,
                created_at: new Date().toISOString()
                // You can add expires_at here if you update the table schema
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, code: data });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");

        if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

        const { error } = await adminDb
            .from("gift_codes")
            .delete()
            .eq("code", code);

        if (error) throw error;
        return NextResponse.json({ success: true, message: "Code deleted" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
