import { NextResponse } from "next/server";
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();

        if (!user || !user.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { error } = await adminDb
            .from("users")
            .update({ joined_whatsapp: true })
            .eq("email", user.email);

        if (error) {
            console.error("Supabase update error:", error);
            return NextResponse.json({ success: false, error: "Database update failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Join WhatsApp API error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
