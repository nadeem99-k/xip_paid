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

    if (error && error.code !== 'PGRST116') {
        console.error("Database user fetch error:", error);
        return null; // DB Error
    }

    if (!dbUser) {
        // User exists in Auth but not in public.users.
        // This logic handles new Google Sign-ups or discrepancies.
        // We create the user record using the email from Auth.
        // We attempt to use the same ID as Auth if possible, but if that ID is taken (unlikely if new),
        // or if we rely on auto-gen ID for public.users, we let the DB decide.
        // However, standard Supabase pattern is ID matching.
        // But here we are migrating, so we just want A record.

        const newUserData = {
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email.split('@')[0],
            full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
            role: "user",
            package: "free",
            coins: 3, // Default starting coins
            id: authUser.id // Try to sync ID if possible. If table has auto-gen, this might be ignored or cause conflict if not UUID type.
        };

        const { data: newUser, error: createError } = await adminDb
            .from("users")
            .insert([newUserData])
            .select("*")
            .single();

        if (createError) {
            console.error("Failed to create user record:", createError);
            // If ID conflict (race condition?), try fetching again?
            return null;
        }
        dbUser = newUser;
    }

    return dbUser;
}
