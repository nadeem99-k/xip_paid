import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(req) {
    try {
        const adminUser = await getAuthenticatedUser();
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId, action } = await req.json();

        if (!userId || !action) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        let newRole;
        if (action === 'promote') newRole = 'admin';
        else if (action === 'demote') newRole = 'user';
        else if (action === 'ban') newRole = 'banned';
        else if (action === 'unban') newRole = 'user';
        else return NextResponse.json({ error: "Invalid action" }, { status: 400 });

        const { error } = await adminDb
            .from("users")
            .update({ role: newRole })
            .eq("id", userId);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `User ${action}ed successfully`
        });
    } catch (error) {
        console.error("Admin user action error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
