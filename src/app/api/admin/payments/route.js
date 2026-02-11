import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { data: payments, error } = await adminDb
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

        const { data: allUsersCount, error: usersError } = await adminDb
            .from("users")
            .select("id", { count: 'exact', head: true });

        const { data: approvedPayments, error: volumeError } = await adminDb
            .from("payments")
            .select("amount")
            .eq("status", "approved");

        const totalVolume = approvedPayments?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;

        // Calculate Today's Revenue and Monthly Volume
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const revenueToday = approvedPayments
            ?.filter(p => new Date(p.timestamp) >= today)
            ?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;

        const monthlyVolume = approvedPayments
            ?.filter(p => new Date(p.timestamp) >= firstDayOfMonth)
            ?.reduce((acc, p) => acc + (p.amount || 0), 0) || 0;

        return NextResponse.json({
            success: true,
            payments: formattedPayments,
            stats: {
                totalUsers: allUsersCount || 0,
                totalVolume: totalVolume,
                revenueToday: revenueToday,
                monthlyVolume: monthlyVolume,
                pendingCount: formattedPayments.length
            }
        });
    } catch (error) {
        console.error("Fetch payments error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
