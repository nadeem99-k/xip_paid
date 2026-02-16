import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); // 401 is fine, returns JSON
        }

        return NextResponse.json({
            success: true,
            user
        });
    } catch (error) {
        console.error("[Profile API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

