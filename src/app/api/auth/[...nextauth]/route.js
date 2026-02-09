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
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const { data: user, error } = await supabase
                    .from("users")
                    .select("*")
                    .eq("email", credentials.email)
                    .single();

                if (error || !user) {
                    throw new Error("No user found with this email");
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);

                if (!isValid) {
                    throw new Error("Invalid password");
                }

                return {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    package: user.package,
                    coins: user.coins || 0,
                    name: user.email.split("@")[0]
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account.provider === "google") {
                const { data: existingUser } = await supabase
                    .from("users")
                    .select("*")
                    .eq("email", user.email)
                    .single();

                if (!existingUser) {
                    // Create new user in Supabase if they don't exist
                    const { error } = await supabase.from("users").insert([
                        {
                            email: user.email,
                            role: "user",
                            coins: 0,
                            package: "none",
                        },
                    ]);
                    if (error) console.error("Error creating user during Google sign-in:", error);
                }
            }
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.email = user.email;
            }

            // Always fetch latest data from Supabase to keep token in sync
            let { data: dbUser, error: dbError } = await supabase
                .from("users")
                .select("id, role, package, coins, joined_whatsapp")
                .eq("email", token.email)
                .single();

            // Handle missing column fallback
            if (dbError && dbError.code === '42703') {
                const { data: fallbackUser } = await supabase
                    .from("users")
                    .select("id, role, package, coins")
                    .eq("email", token.email)
                    .single();
                dbUser = { ...fallbackUser, joined_whatsapp: false };
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
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
