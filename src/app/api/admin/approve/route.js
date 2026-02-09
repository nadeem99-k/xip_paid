import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { paymentId, action } = await req.json(); // action: 'approve' or 'reject'

        const { data: payment, error: fetchError } = await supabase
            .from("payments")
            .select("*")
            .eq("id", paymentId)
            .single();

        if (fetchError || !payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        if (action === 'approve') {
            // Update payment status
            const { error: paymentUpdateError } = await supabase
                .from("payments")
                .update({ status: 'approved' })
                .eq("id", paymentId);

            if (paymentUpdateError) throw paymentUpdateError;

            // Grant access or coins to user
            let updateData = { package: payment.package };

            // If the package is '3 Coins' or similar, credit coins
            // For now, let's assume any approved payment for 50 RS credits 3 coins
            // or we add 3 coins if the payment package says 'coins'.
            if (payment.package && payment.package.toLowerCase().includes('coin')) {
                // Extract number of coins from string (e.g., "3 Coins")
                const match = payment.package.match(/(\d+)/);
                const coinsToAdd = match ? parseInt(match[0]) : 0;

                if (coinsToAdd > 0) {
                    const { data: user } = await supabase
                        .from("users")
                        .select("coins")
                        .eq("id", payment.user_id)
                        .single();

                    updateData.coins = (user?.coins || 0) + coinsToAdd;
                    console.log(`Crediting ${coinsToAdd} coins to user ${payment.user_id}. New balance: ${updateData.coins}`);
                }
            }

            console.log("Updating user with data:", updateData);
            const { error: userUpdateError } = await supabase
                .from("users")
                .update(updateData)
                .eq("id", payment.user_id);

            if (userUpdateError) throw userUpdateError;

            return NextResponse.json({ success: true, message: "Payment approved and package unlocked." });
        } else if (action === 'reject') {
            const { error: rejectError } = await supabase
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
