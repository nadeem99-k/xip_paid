import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { error } = await supabase
            .from("users")
            .update({ joined_whatsapp: true })
            .eq("email", session.user.email);

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
