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
        const newUserData = {
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email.split('@')[0],
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
            role: (authUser.email && ADMIN_EMAILS.includes(authUser.email.toLowerCase())) ? "admin" : "user",
            package: "free",
            coins: 3,
            id: authUser.id
        };

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
    }

    return dbUser;
}
