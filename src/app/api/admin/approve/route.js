import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { paymentId, action } = await req.json(); // action: 'approve' or 'reject'

        const { data: payment, error: fetchError } = await adminDb
            .from("payments")
            .select("*")
            .eq("id", paymentId)
            .single();

        if (fetchError || !payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        if (action === 'approve') {
            // Update payment status
            const { error: paymentUpdateError } = await adminDb
                .from("payments")
                .update({ status: 'approved' })
                .eq("id", paymentId);

            if (paymentUpdateError) throw paymentUpdateError;

            // Grant access or coins to user
            let updateData = { package: payment.package };

            // If the package is '3 Coins' or similar, credit coins
            if (payment.package && payment.package.toLowerCase().includes('coin')) {
                // Extract number of coins from string (e.g., "3 Coins")
                const match = payment.package.match(/(\d+)/);
                const coinsToAdd = match ? parseInt(match[0]) : 0;

                if (coinsToAdd > 0) {
                    const { data: targetUser } = await adminDb
                        .from("users")
                        .select("coins")
                        .eq("id", payment.user_id)
                        .single();

                    updateData.coins = (targetUser?.coins || 0) + coinsToAdd;
                    console.log(`Crediting ${coinsToAdd} coins to user ${payment.user_id}. New balance: ${updateData.coins}`);
                }
            }

            console.log("Updating user with data:", updateData);
            const { error: userUpdateError } = await adminDb
                .from("users")
                .update(updateData)
                .eq("id", payment.user_id);

            if (userUpdateError) throw userUpdateError;

            // --- REFERRAL REWARD LOGIC ---
            // Only trigger referral rewards on the FIRST successful payment
            const { data: previousPayments } = await adminDb
                .from("payments")
                .select("id")
                .eq("user_id", payment.user_id)
                .eq("status", "approved")
                .neq("id", paymentId);

            if (!previousPayments || previousPayments.length === 0) {
                // This is the first payment!
                const { data: currentUser } = await adminDb
                    .from("users")
                    .select("referred_by")
                    .eq("id", payment.user_id)
                    .single();

                if (currentUser?.referred_by) {
                    console.log(`[Referral] User ${payment.user_id} was referred by ${currentUser.referred_by}. Processing reward...`);
                    
                    const { data: referrer } = await adminDb
                        .from("users")
                        .select("id, referral_count, referral_rewarded_count, coins")
                        .eq("id", currentUser.referred_by)
                        .single();

                    if (referrer) {
                        const newCount = (referrer.referral_count || 0) + 1;
                        let newRewardedCount = referrer.referral_rewarded_count || 0;
                        let newCoins = referrer.coins || 0;

                        if (newCount - newRewardedCount >= 3) {
                            newCoins += 10;
                            newRewardedCount += 3;
                            console.log(`[Referral] Referrer ${referrer.id} reached threshold. 10 coins added.`);
                        }

                        await adminDb.from("users").update({
                            referral_count: newCount,
                            referral_rewarded_count: newRewardedCount,
                            coins: newCoins
                        }).eq("id", referrer.id);
                    }
                }
            }
            // -----------------------------

            return NextResponse.json({ success: true, message: "Payment approved and package unlocked." });
        } else if (action === 'reject') {
            const { error: rejectError } = await adminDb
                .from("payments")
                .update({ status: 'rejected' })
                .eq("id", paymentId);

            if (rejectError) throw rejectError;

            return NextResponse.json({ success: true, message: "Payment rejected." });
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

    } catch (error) {
        console.error("Approval error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
