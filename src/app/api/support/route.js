import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        const { name, email, message } = await req.json();

        if (!name || !email || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { error } = await supabase
            .from("support_tickets")
            .insert([
                {
                    user_id: session?.user?.id || null,
                    name,
                    email,
                    message,
                    status: 'pending'
                }
            ]);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Ticket submitted successfully" });
    } catch (error) {
        console.error("Support submission error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
