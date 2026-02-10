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

        let { data: user, error: userError } = await supabase
            .from("users")
            .select("id, email, package, coins, role, joined_whatsapp")
            .eq("id", session.user.id)
            .single();

        // Fallback for missing column during migration
        if (userError && userError.code === '42703') {
            const { data: fallbackUser, error: fallbackError } = await supabase
                .from("users")
                .select("id, email, package, coins, role")
                .eq("id", session.user.id)
                .single();

            if (fallbackError) throw fallbackError;
            user = { ...fallbackUser, joined_whatsapp: false };
            userError = null;
        }

        if (userError) throw userError;
        console.log(`History API: Found user ${user.id} with ${user.coins} coins`);

        const { data: history, error } = await supabase
            .from("generations")
            .select("*")
            .eq("user_id", session.user.id)
            .order("timestamp", { ascending: false });

        if (error) {
            console.warn("History: timestamp sort failed, trying created_at fallback:", error.message);

            // Try created_at as fallback
            const { data: historyAlt, error: errorAlt } = await supabase
                .from("generations")
                .select("*")
                .eq("user_id", session.user.id)
                .order("created_at", { ascending: false });

            if (!errorAlt) {
                return NextResponse.json({ success: true, history: historyAlt, user });
            }

            // If combined fail, try any order
            const { data: finalHistory, error: finalError } = await supabase
                .from("generations")
                .select("*")
                .eq("user_id", session.user.id);

            if (finalError) {
                console.error("Critical: All history fetch methods failed:", finalError);
                return NextResponse.json({ error: "Failed to fetch history registry", details: finalError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, history: finalHistory || [], user });
        }

        return NextResponse.json({ success: true, history: history || [], user });
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
