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
                console.log(`signIn callback: Attempting Google sign-in for ${email}`);

                try {
                    // Check if user exists
                    const { data: existingUser, error: fetchError } = await supabase
                        .from("users")
                        .select("id")
                        .eq("email", email)
                        .maybeSingle();

                    if (fetchError) {
                        console.error(`signIn callback: Error fetching Google user (${email}):`, fetchError);
                        // We don't return false here to avoid blocking sign-in if Supabase is temporarily flaky
                        // but we will try to proceed. If it's a critical error, the insert will likely fail too.
                    }

                    if (!existingUser) {
                        console.log(`signIn callback: Creating new Google user for ${email}`);

                        // Check if we should use 'name' or 'full_name'
                        // Since the error said 'name' is missing, we'll try 'full_name' or just omit for now
                        const userData = {
                            email,
                            name: name || "",
                            full_name: name || "",
                            role: "user",
                            package: "free",
                            coins: 3,
                            password: "",
                        };

                        // We will try to insert without 'name' first to see if it works, 
                        // or we could try 'full_name' if that's the standard for this schema
                        const { error: insertError } = await supabase
                            .from("users")
                            .insert([userData]);

                        if (insertError) {
                            console.error(`signIn callback: Error creating Google user (${email}):`, insertError);
                            if (insertError.code === '23505') return true;
                            return false;
                        }
                        console.log(`signIn callback: Successfully created Google user for ${email}`);
                    } else {
                        console.log(`signIn callback: Existing user found for ${email}`);
                    }
                } catch (err) {
                    console.error(`signIn callback: Critical error for ${email}:`, err);
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
                }

                if (!token.email) return token;

                // Always fetch latest data from Supabase to keep token in sync
                let { data: dbUser, error: dbError } = await supabase
                    .from("users")
                    .select("id, role, package, coins, joined_whatsapp, name, full_name") // Include name/full_name
                    .eq("email", token.email)
                    .maybeSingle(); // Use maybeSingle to avoid 406 errors if user deleted mid-session

                // Handle missing column fallback
                if (dbError && dbError.code === '42703') {
                    console.warn(`Column missing in Supabase users table, using fallback for ${token.email}`);
                    const { data: fallbackUser, error: fbError } = await supabase
                        .from("users")
                        .select("id, role, package, coins")
                        .eq("email", token.email)
                        .single();

                    if (fbError) {
                        console.error(`Fallback fetch failed for ${token.email}:`, fbError);
                    } else {
                        dbUser = { ...fallbackUser, joined_whatsapp: false };
                    }
                } else if (dbError) {
                    console.error(`JWT Callback: Error fetching user ${token.email}:`, dbError);
                }

                if (dbUser) {
                    token.id = dbUser.id;
                    token.role = dbUser.role;
                    token.package = dbUser.package;
                    token.coins = dbUser.coins;
                    token.joined_whatsapp = dbUser.joined_whatsapp;
                    token.name = dbUser.full_name || dbUser.name || token.name; // Keep name synced
                }

                if (trigger === "update" && session?.package) {
                    token.package = session.package;
                }
                if (trigger === "update" && typeof session?.coins !== 'undefined') {
                    token.coins = session.coins;
                }
                return token;
            } catch (err) {
                console.error("JWT Callback Critical Error:", err);
                return token;
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
