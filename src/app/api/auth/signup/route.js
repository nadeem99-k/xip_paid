import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { error: insertError } = await supabase
            .from("users")
            .insert([
                {
                    email,
                    password: hashedPassword,
                    name: email.split('@')[0],
                    full_name: email.split('@')[0],
                    package: 'free',
                    coins: 3,
                    role: 'user',
                    referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    referral_count: 0,
                    referral_rewarded_count: 0
                }
            ]);

        if (insertError) throw insertError;

        // Process referral if code exists in cookies
        try {
            const { cookies } = await import('next/headers');
            const cookieStore = await cookies();
            const referralCode = cookieStore.get("referral_code")?.value;
            if (referralCode) {
                const { processReferral } = await import("@/lib/auth-helpers");
                await processReferral(email, referralCode);
            }
        } catch (cookieErr) {
            console.warn("Could not process referral in manual signup:", cookieErr.message);
        }

        return NextResponse.json({ success: true, message: "User created" }, { status: 201 });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
