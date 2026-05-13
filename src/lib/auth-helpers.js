import { createClient } from "@/lib/supabase/server";
import { supabase as adminDb } from "@/lib/supabase";

export async function getAuthenticatedUser(ipAddress = null) {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) return null;

    let { data: dbUser, error } = await adminDb
        .from("users")
        .select("*")
        .eq("email", authUser.email)
        .maybeSingle();

    // FALLBACK: Check old_users table
    if (!dbUser && !error) {
        console.log("[Auth Helpers] User not in 'users', checking 'old_users' for:", authUser.email);
        const { data: oldUser, error: oldError } = await adminDb
            .from("old_users")
            .select("*")
            .eq("email", authUser.email)
            .maybeSingle();
        
        if (oldUser) {
            console.log("[Auth Helpers] Found user in 'old_users' table.");
            dbUser = oldUser;
        } else if (oldError) {
            console.warn("[Auth Helpers] Error checking 'old_users':", oldError.message);
        }
    }

    // Admin emails whitelist
    const ADMIN_EMAILS = ['nadeemalikalhoro310@gmail.com'];

    if (error) {
        console.error("[Auth Helpers] Database user fetch error:", error.message);
        // Fallback for admins if DB is totally down/failing
        const isAdmin = authUser.email && ADMIN_EMAILS.includes(authUser.email.toLowerCase());
        if (isAdmin) {
            console.log("[Auth Helpers] Emergency Admin fallback for:", authUser.email);
            return { ...authUser, role: 'admin', bypassDb: true };
        }
        return null;
    }

    // Update IP if missing or changed
    if (dbUser && ipAddress && ipAddress !== 'unknown' && dbUser.ip_address !== ipAddress) {
        const targetTable = dbUser.id ? (await adminDb.from("users").select('id').eq('id', dbUser.id).maybeSingle()).data ? "users" : "old_users" : "users";
        console.log(`[Auth Helpers] Updating IP for ${dbUser.email} in ${targetTable}: ${dbUser.ip_address} -> ${ipAddress}`);
        adminDb.from(targetTable).update({ ip_address: ipAddress }).eq("id", dbUser.id).then(({ error }) => {
            if (error) console.error(`[Auth Helpers] Failed to update user IP in ${targetTable}:`, error.message);
        });
        dbUser.ip_address = ipAddress;
    }

    if (!dbUser) {
        console.log("[Auth Helpers] No DB user found for:", authUser.email, "Creating new record...");

        let referralCode;
        let codeUnique = false;
        let attempts = 0;

        while (!codeUnique && attempts < 5) {
            referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { count } = await adminDb.from("users").select('*', { count: 'exact', head: true }).eq('referral_code', referralCode);
            if (count === 0) codeUnique = true;
            attempts++;
        }

        // ANTI-MULTI-ACCOUNT CHECK
        let isFlagged = false;
        if (ipAddress && ipAddress !== 'unknown') {
            const { count } = await adminDb
                .from("users")
                .select('*', { count: 'exact', head: true })
                .eq('ip_address', ipAddress);
            
            if (count >= 2) {
                console.warn(`[Auth Helpers] IP ${ipAddress} has ${count} accounts. Flagging new account as BANNED.`);
                isFlagged = true;
            }
        }

        const newUserData = {
            id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0],
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
            role: (authUser.email && ADMIN_EMAILS.includes(authUser.email.toLowerCase())) ? "admin" : "user",
            package: isFlagged ? "banned" : "free",
            coins: isFlagged ? 0 : 1, // 0 coins for banned users
            referral_code: referralCode,
            referral_count: 0,
            referral_rewarded_count: 0,
            password: "", // Satistfy NOT NULL constraint if present
            joined_whatsapp: false,
            ip_address: ipAddress
        };

        console.log("[Auth Helpers] Attempting to insert new user:", newUserData.email);
        let { data: newUser, error: createError } = await adminDb
            .from("users")
            .insert([newUserData])
            .select("*")
            .single();

        if (createError && createError.message?.includes('ip_address')) {
            console.warn("[Auth Helpers] ip_address column missing, retrying without it...");
            const { ip_address, ...resilientUserData } = newUserData;
            const { data: retryNewUser, error: retryError } = await adminDb
                .from("users")
                .insert([resilientUserData])
                .select("*")
                .single();
            newUser = retryNewUser;
            createError = retryError;
        }

        if (createError) {
            console.error("[Auth Helpers] CRITICAL: Failed to create user record:", createError.message, createError.details);
            // One last attempt: Check if user was created by a trigger/race condition
            const { data: checkAgain } = await adminDb.from("users").select("*").eq("email", authUser.email).maybeSingle();
            if (checkAgain) {
                dbUser = checkAgain;
            } else {
                const isAdmin = authUser.email && ADMIN_EMAILS.includes(authUser.email.toLowerCase());
                if (isAdmin) return { ...authUser, role: 'admin', bypassDb: true };
                return null;
            }
        } else {
            console.log("[Auth Helpers] Successfully created user record for:", newUser.email);
            dbUser = newUser;
        }

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
        let newCode;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 5) {
            newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            // Check for uniqueness
            const { count } = await adminDb
                .from("users")
                .select("*", { count: 'exact', head: true })
                .eq("referral_code", newCode);

            if (count === 0) isUnique = true;
            attempts++;
        }

        console.log(`[Auth Helpers] Generating missing referral code for ${dbUser.email}: ${newCode}`);

        // Use both id and email for update to be safe, but fallback to email if id is problematic
        const { data: updatedUser, error: updateErr } = await adminDb
            .from("users")
            .update({ referral_code: newCode })
            .or(`id.eq.${dbUser.id},email.eq.${dbUser.email}`)
            .select("*")
            .single();

        if (updateErr) {
            console.error("[Auth Helpers] CRITICAL: Failed to persist missing referral code for:", dbUser.email, "Error:", updateErr.message);

            // Try updating by email only as a last resort
            const { data: retryUser, error: retryErr } = await adminDb
                .from("users")
                .update({ referral_code: newCode })
                .eq("email", dbUser.email)
                .select("*")
                .single();

            if (retryErr) {
                console.error("[Auth Helpers] CRITICAL: Email fallback update also failed:", retryErr.message);
                dbUser.referral_code = newCode;
            } else {
                console.log("[Auth Helpers] Successfully persisted referral code via email fallback for:", retryUser.email);
                dbUser = retryUser;
            }
        } else if (updatedUser) {
            console.log("[Auth Helpers] Successfully persisted referral code for:", updatedUser.email);
            dbUser = updatedUser;
        }
    }


    return dbUser;
}

/**
 * Processes a referral by linking a new user to their referrer and rewarding the referrer.
 * Rewards: 10 coins for every 3 successful referrals.
 */
export async function processReferral(newUserEmail, referralCode) {
    if (!referralCode || !newUserEmail) return;

    console.log(`[Referral] Processing referral for ${newUserEmail} with code: ${referralCode}`);

    try {
        // 1. Find the referrer (Check both tables)
        let { data: referrer, error: referrerError } = await adminDb
            .from("users")
            .select("id, referral_count, referral_rewarded_count, coins, email")
            .eq("referral_code", referralCode)
            .maybeSingle();

        let referrerTable = "users";

        if (!referrer && !referrerError) {
            const { data: oldReferrer, error: oldReferrerError } = await adminDb
                .from("old_users")
                .select("id, referral_count, referral_rewarded_count, coins, email")
                .eq("referral_code", referralCode)
                .maybeSingle();
            
            if (oldReferrer) {
                referrer = oldReferrer;
                referrerTable = "old_users";
            }
            referrerError = oldReferrerError;
        }

        if (referrerError || !referrer) {
            console.warn(`[Referral] Referrer not found for code: ${referralCode}`);
            return;
        }

        // Prevent self-referral
        if (referrer.email === newUserEmail) {
            console.warn(`[Referral] Self-referral attempt blocked for: ${newUserEmail}`);
            return;
        }

        // 2. Update the new user with referred_by (Check both tables)
        let { data: newcomer, error: fetchNewUserError } = await adminDb
            .from("users")
            .select("id, referred_by, ip_address")
            .eq("email", newUserEmail)
            .maybeSingle();

        let newcomerTable = "users";

        if (!newcomer && !fetchNewUserError) {
            const { data: oldNewcomer, error: oldNewcomerError } = await adminDb
                .from("old_users")
                .select("id, referred_by, ip_address")
                .eq("email", newUserEmail)
                .maybeSingle();
            
            if (oldNewcomer) {
                newcomer = oldNewcomer;
                newcomerTable = "old_users";
            }
            fetchNewUserError = oldNewcomerError;
        }

        if (fetchNewUserError || !newcomer) {
            console.error(`[Referral] CRITICAL: New user ${newUserEmail} not found in DB. Data:`, newcomer, "Error:", fetchNewUserError?.message);
            return;
        }

        // 2.5 Multi-Account Check (IP based)
        // Check if there are other users with the same IP address
        if (newcomer.ip_address) {
            // Check whitelist first
            const { data: whitelistData } = await adminDb
                .from("system_settings")
                .select("value")
                .eq("key", "security_whitelist")
                .maybeSingle();

            const whitelist = whitelistData?.value || [];
            const isWhitelisted = whitelist.includes(newUserEmail) || whitelist.includes(newcomer.ip_address);

            if (isWhitelisted) {
                console.log(`[Referral] User ${newUserEmail} or IP ${newcomer.ip_address} is WHITELISTED. Bypassing multi-account check.`);
            } else {
                const { count: countUsers, error: ipCheckErrorUsers } = await adminDb
                    .from("users")
                    .select('*', { count: 'exact', head: true })
                    .eq('ip_address', newcomer.ip_address)
                    .neq('email', newUserEmail);

                const { count: countOldUsers, error: ipCheckErrorOld } = await adminDb
                    .from("old_users")
                    .select('*', { count: 'exact', head: true })
                    .eq('ip_address', newcomer.ip_address)
                    .neq('email', newUserEmail);

                const count = (countUsers || 0) + (countOldUsers || 0);

                if (ipCheckErrorUsers || ipCheckErrorOld) {
                    console.error(`[Referral] IP check error for ${newUserEmail}:`, ipCheckErrorUsers?.message || ipCheckErrorOld?.message);
                } else if (count > 0) {
                    console.warn(`[Referral] Potential multi-account detected for ${newUserEmail} (IP: ${newcomer.ip_address}). Referral reward blocked.`);
                    // We still link them for tracking, but we won't increment the reward counter later
                    await adminDb.from(newcomerTable).update({ referred_by: referrer.id }).eq("id", newcomer.id);
                    return;
                }
            }
        }

        // 2. CHECK FOR SELF-REFERRAL (IP MATCH)
        if (referrer.ip_address && newcomer.ip_address && referrer.ip_address === newcomer.ip_address) {
            console.warn(`[Referral] Blocked potential self-referral for IP: ${referrer.ip_address}`);
            return;
        }

        console.log(`[Referral] Linking newcomer ${newcomer.id} to referrer ${referrer.email} (${referrer.id})`);

        const { error: updateNewUserError } = await adminDb
            .from(newcomerTable)
            .update({ referred_by: referrer.id })
            .eq("id", newcomer.id);

        if (updateNewUserError) {
            console.error(`[Referral] Failed to link ${newUserEmail} to referrer ${referrer.id}:`, updateNewUserError.message);
            return;
        }

        console.log(`[Referral] Success: ${newUserEmail} is now linked to referrer ${referrer.email}. Reward will be granted when newcomer buys a plan.`);
    } catch (err) {
        console.error("[Referral] Unexpected error in processReferral:", err);
    }
}
