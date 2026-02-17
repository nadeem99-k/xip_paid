import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET(req) {
    try {
        const adminUser = await getAuthenticatedUser();
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // Fetch user basic info
        const { data: userProfile, error: userError } = await adminDb
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

        if (userError) throw userError;

        // Fetch user's generations
        const { data: generations, error: genError } = await adminDb
            .from("generations")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        // Fetch user's payments (all statuses)
        const { data: payments, error: payError } = await adminDb
            .from("payments")
            .select("*")
            .eq("user_id", userId)
            .order("timestamp", { ascending: false });

        // Calculate coin breakdown
        const approvedPayments = payments?.filter(p => p.status === 'approved') || [];
        let paidCoins = 0;
        approvedPayments.forEach(p => {
            if (p.package && p.package.toLowerCase().includes('coin')) {
                const match = p.package.match(/(\d+)/);
                if (match) paidCoins += parseInt(match[0]);
            }
        });

        const referralCoins = Math.floor((userProfile.referral_rewarded_count || 0) / 3) * 10;
        const signupBonus = userProfile.referred_by ? 5 : 3;
        const manualAdjustment = (userProfile.coins || 0) - (paidCoins + referralCoins + signupBonus);

        // Fetch Referrer
        let referrer = null;
        if (userProfile.referred_by) {
            const { data: refData } = await adminDb
                .from("users")
                .select("id, email, name")
                .eq("id", userProfile.referred_by)
                .single();
            referrer = refData;
        }

        // Fetch Referral Tree (Direct Referrals)
        const { data: referrals } = await adminDb
            .from("users")
            .select("id, email, name, coins, referral_count, created_at")
            .eq("referred_by", userId)
            .order("created_at", { ascending: false });

        return NextResponse.json({
            success: true,
            profile: userProfile,
            generations: generations || [],
            payments: payments || [],
            stats: {
                breakdown: {
                    paid: paidCoins,
                    referral: referralCoins,
                    bonus: signupBonus,
                    manual: manualAdjustment
                },
                referrer,
                referrals: referrals || []
            }
        });
    } catch (error) {
        console.error("Admin user profile fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
