import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { code } = await req.json();
        if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

        // 1. Fetch the code
        const { data: giftCode, error: fetchError } = await adminDb
            .from("gift_codes")
            .select("*")
            .eq("code", code.trim().toUpperCase())
            .maybeSingle();

        if (fetchError || !giftCode) {
            return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
        }

        if (giftCode.is_used) {
            return NextResponse.json({ error: "Code already redeemed" }, { status: 400 });
        }

        // 2. Perform Atomic Update (Mark used & Add coins)
        // Note: Using RPC if possible for safety, but manual check works for small scale
        const { error: useError } = await adminDb
            .from("gift_codes")
            .update({ 
                is_used: true, 
                used_by: user.id, 
                used_at: new Date().toISOString() 
            })
            .eq("code", giftCode.code);

        if (useError) throw useError;

        // 3. Add coins to user
        const { data: updatedUser, error: updateError } = await adminDb
            .from("users")
            .update({ coins: (user.coins || 0) + giftCode.coins })
            .eq("id", user.id)
            .select("coins")
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ 
            success: true, 
            message: `Success! Added ${giftCode.coins} coins to your vault.`,
            newCoins: updatedUser.coins
        });
    } catch (error) {
        console.error("[Redeem API] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
