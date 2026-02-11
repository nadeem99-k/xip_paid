import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: tickets, error } = await adminDb
            .from("support_tickets")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, tickets });
    } catch (error) {
        console.error("Admin support fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ticketId, status } = await req.json();

        const { error } = await adminDb
            .from("support_tickets")
            .update({ status })
            .eq("id", ticketId);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Ticket status updated" });
    } catch (error) {
        console.error("Admin support update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
