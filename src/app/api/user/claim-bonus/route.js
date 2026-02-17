import { NextResponse } from "next/server";
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();

        if (!user || !user.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const lastClaim = user.last_bonus_claim ? new Date(user.last_bonus_claim) : null;

        // Check 24 hour cooldown
        if (lastClaim) {
            const twentyFourHours = 24 * 60 * 60 * 1000;
            const timeSinceClaim = now - lastClaim;

            if (timeSinceClaim < twentyFourHours) {
                const remaining = twentyFourHours - timeSinceClaim;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                return NextResponse.json({
                    success: false,
                    error: `Please wait ${hours}h ${minutes}m before your next claim.`
                }, { status: 400 });
            }
        }

        // Add 1 coin and update claim timestamp
        const { data: updatedUser, error: updateError } = await adminDb
            .from("users")
            .update({
                coins: (user.coins || 0) + 1,
                last_bonus_claim: now.toISOString()
            })
            .eq("id", user.id)
            .select("coins, last_bonus_claim")
            .single();

        if (updateError) {
            console.error("Bonus claim update error:", updateError);
            return NextResponse.json({ success: false, error: "Failed to claim bonus. Make sure the 'last_bonus_claim' column exists in the users table." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Successfully claimed 1 free coin!",
            coins: updatedUser.coins,
            lastClaim: updatedUser.last_bonus_claim
        });

    } catch (error) {
        console.error("Daily bonus API error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
