import { createClient } from "@/lib/supabase/server";
import { supabase as adminDb } from "@/lib/supabase";

export async function getAuthenticatedUser() {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) return null;

    let { data: dbUser, error } = await adminDb
        .from("users")
        .select("*")
        .eq("email", authUser.email)
        .single();

    // Admin emails whitelist
    const ADMIN_EMAILS = ['nadeemalikalhoro310@gmail.com'];

    if (error && error.code !== 'PGRST116') {
        console.warn("[Auth Helpers] Database user fetch error, using whitelist fallback:", error.message);
        const isAdmin = authUser.email && ADMIN_EMAILS.includes(authUser.email.toLowerCase());
        if (isAdmin) {
            return { ...authUser, role: 'admin', bypassDb: true };
        }
        return null;
    }

    if (!dbUser) {
        // Handle referral code if present in cookies (passed from middleware/client)
        // For now, we'll assume the code might be in a header or we'll need to update this after checking middleware
        let referredById = null;
        // Logic to get referral link/code will be added in middleware or via query sync

        const newUserData = {
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email.split('@')[0],
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
            role: (authUser.email && ADMIN_EMAILS.includes(authUser.email.toLowerCase())) ? "admin" : "user",
            package: "free",
            coins: 3,
            id: authUser.id,
            referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referral_count: 0,
            referral_rewarded_count: 0
        };

        // If we had a way to identify the referrer here, we would set referred_by
        // Note: OAuth flow might make it tricky to pass the code here unless using cookies or sessions

        const { data: newUser, error: createError } = await adminDb
            .from("users")
            .insert([newUserData])
            .select("*")
            .single();

        if (createError) {
            console.error("Failed to create user record:", createError);
            const isAdmin = authUser.email && ADMIN_EMAILS.includes(authUser.email.toLowerCase());
            if (isAdmin) return { ...authUser, role: 'admin', bypassDb: true };
            return null;
        }
        dbUser = newUser;

        // Process referral if code exists in cookies (OAuth flow)
        try {
            const { cookies } = await import('next/headers');
            const cookieStore = await cookies();
            const referralCode = cookieStore.get("referral_code")?.value;
            if (referralCode) {
                await processReferral(authUser.email, referralCode);
                // Refetch user to get updated referred_by
                const { data: updatedUser } = await adminDb
                    .from("users")
                    .select("*")
                    .eq("id", dbUser.id)
                    .single();
                if (updatedUser) dbUser = updatedUser;
            }
        } catch (cookieErr) {
            console.warn("[Auth Helpers] Could not process referral in OAuth signup:", cookieErr.message);
        }
    } else if (!dbUser.referral_code) {
        // Migration: Ensure existing users have a referral code
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: updatedUser } = await adminDb
            .from("users")
            .update({ referral_code: newCode })
            .eq("id", dbUser.id)
            .select("*")
            .single();
        if (updatedUser) dbUser = updatedUser;
    }

    return dbUser;
}

export async function processReferral(newUserEmail, referralCode) {
    if (!referralCode) return;

    try {
        // 1. Find the referrer
        const { data: referrer, error: referrerError } = await adminDb
            .from("users")
            .select("id, referral_count, referral_rewarded_count, coins, email")
            .eq("referral_code", referralCode)
            .single();

        if (referrerError || !referrer) return;

        // 2. Update the new user with referred_by
        const { error: updateNewUserError } = await adminDb
            .from("users")
            .update({ referred_by: referrer.id })
            .eq("email", newUserEmail)
            .is("referred_by", null); // Only if not already set

        if (updateNewUserError) return;

        // 3. Increment referrer's count
        const newCount = (referrer.referral_count || 0) + 1;
        let newRewardedCount = referrer.referral_rewarded_count || 0;
        let newCoins = referrer.coins || 0;

        // 4. Check for reward (Every 3 successful referrals = 10 coins)
        if (newCount - newRewardedCount >= 3) {
            newCoins += 10;
            newRewardedCount += 3;
        }

        await adminDb
            .from("users")
            .update({
                referral_count: newCount,
                referral_rewarded_count: newRewardedCount,
                coins: newCoins
            })
            .eq("id", referrer.id);

        console.log(`Referral processed: ${newUserEmail} referred by ${referrer.email}. New count: ${newCount}, Reward given: ${newCount % 3 === 0}`);
    } catch (err) {
        console.error("Process referral error:", err);
    }
}
