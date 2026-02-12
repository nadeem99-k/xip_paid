import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'pending';

        let query = adminDb
            .from("payments")
            .select(`
                *,
                users:user_id (email)
            `)
            .order("timestamp", { ascending: false });

        if (status !== 'all') {
            query = query.eq("status", status);
        }

        const { data: payments, error } = await query;

        if (error) throw error;

        const formattedPayments = payments.map(p => ({
            ...p,
            userEmail: p.users?.email
        }));

        const { count: totalUsersCount, error: usersError } = await adminDb
            .from("users")
            .select("*", { count: 'exact', head: true });

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
                totalUsers: totalUsersCount || 0,
                totalVolume: totalVolume,
                revenueToday: revenueToday,
                monthlyVolume: monthlyVolume,
                pendingCount: formattedPayments.filter(p => p.status === 'pending').length
            }
        });
    } catch (error) {
        console.error("Fetch payments error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
