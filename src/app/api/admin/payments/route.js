import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { data: payments, error } = await supabase
            .from("payments")
            .select(`
                *,
                users:user_id (email)
            `)
            .eq("status", "pending")
            .order("timestamp", { ascending: false });

        if (error) throw error;

        const formattedPayments = payments.map(p => ({
            ...p,
            userEmail: p.users?.email
        }));

        const { data: allUsersCount, error: usersError } = await supabase
            .from("users")
            .select("id", { count: 'exact', head: true });

        const { data: approvedPayments, error: volumeError } = await supabase
            .from("payments")
            .select("amount")
            .eq("status", "approved");

        const totalVolume = approvedPayments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;

        return NextResponse.json({
            success: true,
            payments: formattedPayments,
            stats: {
                totalUsers: allUsersCount || 0,
                totalVolume: totalVolume,
                pendingCount: formattedPayments.length
            }
        });
    } catch (error) {
        console.error("Fetch payments error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
