import { NextResponse } from "next/server";
import { supabase as adminDb } from "@/lib/supabase";

// GET /api/promo/validate?code=SAVE30
// Public endpoint — validates if a promo code is active
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");

        if (!code) {
            return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });
        }

        const { data, error } = await adminDb
            .from("promo_codes")
            .select("id, code, discount_percent, is_active, usage_count, max_uses")
            .eq("code", code.trim().toUpperCase())
            .single();

        if (error || !data) {
            return NextResponse.json({ valid: false, error: "Invalid promo code" });
        }

        if (!data.is_active) {
            return NextResponse.json({ valid: false, error: "This promo code is no longer active" });
        }

        // Check usage limit
        if (data.max_uses !== null && data.usage_count >= data.max_uses) {
            return NextResponse.json({ valid: false, error: "This promo code has reached its usage limit" });
        }

        return NextResponse.json({
            valid: true,
            code: data.code,
            discount_percent: data.discount_percent,
            message: `🎉 ${data.discount_percent}% discount applied!`
        });

    } catch (error) {
        console.error("Promo validate error:", error);
        return NextResponse.json({ valid: false, error: "Server error" }, { status: 500 });
    }
}
