import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId, coinAmount } = await req.json();

        if (!userId || typeof coinAmount !== 'number') {
            return NextResponse.json({ error: "User ID and coin amount are required" }, { status: 400 });
        }

        // Fetch current coins
        const { data: user, error: fetchError } = await supabase
            .from("users")
            .select("coins")
            .eq("id", userId)
            .single();

        if (fetchError) throw fetchError;

        const newBalance = (user.coins || 0) + coinAmount;

        const { error: updateError } = await supabase
            .from("users")
            .update({ coins: newBalance })
            .eq("id", userId);

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            message: `Updated coins. New balance: ${newBalance}`,
            newBalance
        });
    } catch (error) {
        console.error("Admin coin update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
