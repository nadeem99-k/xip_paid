import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get date ranges for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // Fetch users created in the last 30 days
        const { data: recentUsers, error: usersError } = await adminDb
            .from("users")
            .select("created_at")
            .gte("created_at", thirtyDaysAgo.toISOString());

        if (usersError) throw usersError;

        // Fetch approved payments in the last 30 days
        const { data: recentPayments, error: paymentsError } = await adminDb
            .from("payments")
            .select("amount, timestamp")
            .eq("status", "approved")
            .gte("timestamp", thirtyDaysAgo.toISOString());

        if (paymentsError) throw paymentsError;

        // Process growth data by day
        const growthData = {};
        const revenueData = {};

        // Pre-fill last 30 days with 0s
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            growthData[dateStr] = 0;
            revenueData[dateStr] = 0;
        }

        recentUsers?.forEach(u => {
            const date = u.created_at.split('T')[0];
            if (growthData[date] !== undefined) growthData[date]++;
        });

        recentPayments?.forEach(p => {
            const date = p.timestamp.split('T')[0];
            if (revenueData[date] !== undefined) revenueData[date] += (p.amount || 0);
        });

        const labels = Object.keys(growthData).reverse();
        const users = labels.map(l => growthData[l]);
        const revenue = labels.map(l => revenueData[l]);

        return NextResponse.json({
            success: true,
            labels,
            users,
            revenue
        });
    } catch (error) {
        console.error("Admin growth stats error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
