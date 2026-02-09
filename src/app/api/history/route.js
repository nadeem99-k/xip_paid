import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, email, package, coins, role")
            .eq("id", session.user.id)
            .single();

        if (userError) throw userError;
        console.log(`History API: Found user ${user.id} with ${user.coins} coins`);

        const { data: history, error } = await supabase
            .from("generations")
            .select("*")
            .eq("user_id", session.user.id)
            .order("timestamp", { ascending: false });

        if (error) {
            console.error("History fetch error details:", error);
            // If timestamp fails, try without ordering or with created_at if common
            const { data: altHistory, error: altError } = await supabase
                .from("generations")
                .select("*")
                .eq("user_id", session.user.id);

            if (altError) {
                console.error("Critical fallback failed:", altError);
                return NextResponse.json({ success: true, history: [], user });
            }
            return NextResponse.json({ success: true, history: altHistory, user });
        }

        return NextResponse.json({ success: true, history, user });
    } catch (error) {
        console.error("History fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const imageId = searchParams.get('id');

        if (!imageId) {
            return NextResponse.json({ error: "Image ID required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("generations")
            .delete()
            .eq("id", imageId)
            .eq("user_id", session.user.id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: "Image deleted successfully" });
    } catch (error) {
        console.error("History delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
