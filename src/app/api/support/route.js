import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { subject, message, priority } = await req.json();

        if (!subject || !message) {
            return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
        }

        const { error } = await adminDb
            .from("support_tickets")
            .insert([
                {
                    user_id: user.id,
                    subject,
                    message,
                    priority: priority || 'normal',
                    status: 'open'
                }
            ]);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Ticket submitted successfully" });
    } catch (error) {
        console.error("Support ticket error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
