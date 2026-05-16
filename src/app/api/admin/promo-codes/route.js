import { NextResponse } from "next/server";
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

// Admin check middleware
async function checkAdmin() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'admin') return null;
    return user;
}

// GET — List all promo codes
export async function GET(req) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { data, error } = await adminDb
            .from("promo_codes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, codes: data });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST — Create a new promo code
export async function POST(req) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { code, discount_percent, max_uses, expires_at } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "Code is required" }, { status: 400 });
        }

        const discount = parseInt(discount_percent) || 30;
        if (discount < 1 || discount > 100) {
            return NextResponse.json({ error: "Discount must be between 1 and 100" }, { status: 400 });
        }

        const { data, error } = await adminDb
            .from("promo_codes")
            .insert([{
                code: code.trim().toUpperCase(),
                discount_percent: discount,
                is_active: true,
                usage_count: 0,
                max_uses: max_uses ? parseInt(max_uses) : null,
                expires_at: expires_at ? new Date(expires_at).toISOString() : null,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, code: data });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH — Toggle active/inactive
export async function PATCH(req) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id, is_active } = await req.json();

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        const { data, error } = await adminDb
            .from("promo_codes")
            .update({ is_active: is_active })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, code: data, message: `Promo code ${is_active ? 'activated' : 'deactivated'}` });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE — Remove a promo code
export async function DELETE(req) {
    const admin = await checkAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        const { error } = await adminDb
            .from("promo_codes")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true, message: "Promo code deleted" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
