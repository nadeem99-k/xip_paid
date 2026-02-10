import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const authOptions = {
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days persistence
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    const { email, password } = credentials;

                    const { data: user, error } = await supabase
                        .from("users")
                        .select("*")
                        .eq("email", email)
                        .single();

                    if (error || !user) {
                        console.error("User not found:", email);
                        return null;
                    }

                    const isValid = await bcrypt.compare(password, user.password);

                    if (!isValid) {
                        console.error("Invalid password for:", email);
                        return null;
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.full_name || user.name || "", // Try full_name first
                        role: user.role,
                        package: user.package,
                        coins: user.coins,
                    };
                } catch (err) {
                    console.error("Authorization error:", err);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account.provider === "google") {
                const { email, name } = user;
                console.log(`[NextAuth] signIn callback: Attempting Google sign-in for ${email}`);

                try {
                    // Check if user exists
                    const { data: existingUser, error: fetchError } = await supabase
                        .from("users")
                        .select("id")
                        .eq("email", email)
                        .maybeSingle();

                    if (fetchError) {
                        console.error(`[NextAuth] signIn callback: Error fetching Google user (${email}):`, fetchError);
                        // We assume fetch error shouldn't block login if it's transient, 
                        // but if we can't verify user existence, we might create duplicate if constraint missing.
                        // Ideally, we proceed and let potential insert fail if unique constraint exists.
                    }

                    if (!existingUser) {
                        console.log(`[NextAuth] signIn callback: Creating new Google user for ${email}`);

                        const userData = {
                            email,
                            name: name || "",
                            full_name: name || "",
                            role: "user",
                            package: "free",
                            coins: 3,
                            password: "", // Schema might require this column even if empty
                        };

                        const { error: insertError } = await supabase
                            .from("users")
                            .insert([userData]);

                        if (insertError) {
                            // Postgres invalid input syntax for type uuid: "undefined" or similar might happen if ID generation fails
                            // Unique violation (23505) means user exists (race condition), which is fine.
                            if (insertError.code === '23505') {
                                console.log(`[NextAuth] signIn callback: User ${email} already exists (race condition handling).`);
                                return true;
                            }

                            console.error(`[NextAuth] signIn callback: CRITICAL Error creating Google user (${email}):`, insertError);
                            return false; // Prevent login if we can't create the user
                        }
                        console.log(`[NextAuth] signIn callback: Successfully created Google user for ${email}`);
                    } else {
                        console.log(`[NextAuth] signIn callback: Existing user found for ${email} (ID: ${existingUser.id})`);
                    }
                } catch (err) {
                    console.error(`[NextAuth] signIn callback: UNEXPECTED CRITICAL error for ${email}:`, err);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            try {
                // Initial sign in
                if (user) {
                    token.id = user.id;
                    token.email = user.email;
                    token.role = user.role;
                    console.log(`[NextAuth] JWT Initial: Set token for ${user.email}`);
                }

                if (!token.email) return token;

                // Always fetch latest data from Supabase to keep token in sync
                // We use a timeout or try/catch to ensure this doesn't hang indefinitely or block the UI on slow DB
                let dbUser = null;
                try {
                    const { data, error } = await supabase
                        .from("users")
                        .select("id, role, package, coins, joined_whatsapp, name, full_name")
                        .eq("email", token.email)
                        .maybeSingle();

                    if (error) {
                        // Handle missing column fallback specifically for 'joined_whatsapp' or 'full_name' if schema drift
                        if (error.code === '42703') {
                            console.warn(`[NextAuth] JWT: Column missing in Supabase users table, attempting fallback for ${token.email}`);
                            const { data: fallbackUser, error: fbError } = await supabase
                                .from("users")
                                .select("id, role, package, coins")
                                .eq("email", token.email)
                                .maybeSingle();

                            if (!fbError) dbUser = { ...fallbackUser, joined_whatsapp: false };
                        } else {
                            console.error(`[NextAuth] JWT: Error fetching user ${token.email}:`, error);
                        }
                    } else {
                        dbUser = data;
                    }
                } catch (fetchErr) {
                    console.error(`[NextAuth] JWT: Exception fetching user ${token.email}:`, fetchErr);
                }

                if (dbUser) {
                    token.id = dbUser.id;
                    token.role = dbUser.role;
                    token.package = dbUser.package;
                    token.coins = dbUser.coins;
                    token.joined_whatsapp = dbUser.joined_whatsapp;
                    token.name = dbUser.full_name || dbUser.name || token.name;
                } else if (!token.id && !trigger) {
                    // If we don't have a user in DB and no token ID, session is invalid.
                    // But if it's an update trigger, we might just be refreshing.
                    console.warn(`[NextAuth] JWT: No user found in DB for ${token.email}, but token exists.`);
                }

                if (trigger === "update" && session) {
                    if (session.package) token.package = session.package;
                    if (typeof session.coins !== 'undefined') token.coins = session.coins;
                }

                return token;
            } catch (err) {
                console.error("[NextAuth] JWT Callback Critical Error:", err);
                return token; // Return previous token to avoid killing session on transient error
            }
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.package = token.package;
                session.user.coins = token.coins;
                session.user.id = token.id;
                session.user.joined_whatsapp = token.joined_whatsapp;
                session.user.name = token.name;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
    useSecureCookies: process.env.NODE_ENV === "production",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
