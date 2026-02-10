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
                        name: user.name,
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

                try {
                    // Check if user exists
                    const { data: existingUser, error: fetchError } = await supabase
                        .from("users")
                        .select("id")
                        .eq("email", email)
                        .maybeSingle();

                    if (fetchError) {
                        console.error("Error fetching Google user:", fetchError);
                        // Don't block sign-in if it's just a fetch error, but log it
                    }

                    if (!existingUser) {
                        const { error: insertError } = await supabase
                            .from("users")
                            .insert([
                                {
                                    email,
                                    name: name || "Google User",
                                    role: "user",
                                    package: "free",
                                    coins: 3,
                                    password: "", // Google users don't have a password, but field might be required
                                },
                            ]);

                        if (insertError) {
                            console.error("Error creating Google user:", insertError);
                            // If insert fails, we might want to return false to show Access Denied
                            // but let's see if we can provide more info or at least not crash
                            return false;
                        }
                    }
                } catch (err) {
                    console.error("Sync error in signIn callback:", err);
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
                    .select("id, role, package, coins, joined_whatsapp")
                    .eq("email", token.email)
                    .single();

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
