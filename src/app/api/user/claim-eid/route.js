import { NextResponse } from "next/server";
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();

        if (!user || !user.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Check if already claimed
        if (user.eid_gift_claimed) {
            return NextResponse.json({
                success: false,
                error: "You have already claimed your Eid Gift!"
            }, { status: 400 });
        }

        // Add 8 coins and mark as claimed
        const { data: updatedUser, error: updateError } = await adminDb
            .from("users")
            .update({
                coins: (user.coins || 0) + 8,
                eid_gift_claimed: true
            })
            .eq("id", user.id)
            .select("coins, eid_gift_claimed")
            .single();

        if (updateError) {
            console.error("Eid gift claim update error:", updateError);
            return NextResponse.json({ success: false, error: "Failed to claim gift. Please try again later." }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Successfully claimed 8 Free Coins for Eid! 🎉",
            coins: updatedUser.coins,
            eid_gift_claimed: updatedUser.eid_gift_claimed
        });

    } catch (error) {
        console.error("Eid gift API error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
