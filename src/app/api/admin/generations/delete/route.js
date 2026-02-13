import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function POST(req) {
    try {
        const adminUser = await getAuthenticatedUser();
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { generationId } = await req.json();

        if (!generationId) {
            return NextResponse.json({ error: "Generation ID is required" }, { status: 400 });
        }

        // Delete from generations table
        const { error } = await adminDb
            .from('generations')
            .delete()
            .eq('id', generationId);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: "Generation deleted successfully"
        });
    } catch (error) {
        console.error("Admin delete generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
