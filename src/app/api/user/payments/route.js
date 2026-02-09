import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: payments, error } = await supabase
            .from("payments")
            .select("*")
            .eq("user_id", session.user.id)
            .order("timestamp", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, payments });
    } catch (error) {
        console.error("User payments fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
