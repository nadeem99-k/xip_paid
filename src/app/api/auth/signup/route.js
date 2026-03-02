import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0] ||
            req.headers.get("x-real-ip") ||
            "unknown";

        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate a unique referral code
        let referralCode;
        let codeUnique = false;
        let attempts = 0;

        while (!codeUnique && attempts < 5) {
            referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { count } = await supabase.from("users").select('*', { count: 'exact', head: true }).eq('referral_code', referralCode);
            if (count === 0) codeUnique = true;
            attempts++;
        }

        console.log(`[Signup API] Registering new user: ${email} with code: ${referralCode}`);

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
                    referral_code: referralCode,
                    referral_count: 0,
                    referral_rewarded_count: 0,
                    joined_whatsapp: false,
                    ip_address: ipAddress
                }
            ]);

        if (insertError) throw insertError;

        // Process referral if code exists in cookies
        try {
            const { cookies } = await import('next/headers');
            const cookieStore = await cookies();
            const referralCode = cookieStore.get("referral_code")?.value;

            if (referralCode) {
                console.log(`[Signup API] Detected referral code: ${referralCode} for ${email}`);
                const { processReferral } = await import("@/lib/auth-helpers");
                await processReferral(email, referralCode);

                // Optional: Give the NEW user a small bonus for being referred (e.g., +2 coins)
                const { error: bonusError } = await supabase
                    .from("users")
                    .update({ coins: 5 }) // Base 3 + 2 Bonus
                    .eq("email", email);

                if (bonusError) console.warn("[Signup API] Failed to award referred user bonus:", bonusError.message);
                else console.log(`[Signup API] Awarded 2 bonus coins to referred user: ${email}`);
            }
        } catch (cookieErr) {
            console.warn("[Signup API] Could not process referral in manual signup:", cookieErr.message);
        }

        return NextResponse.json({ success: true, message: "User created" }, { status: 201 });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
