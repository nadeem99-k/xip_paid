import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET() {
    try {
        const adminUser = await getAuthenticatedUser();
        if (!adminUser || adminUser.role !== 'admin') {
            return new Response("Unauthorized", { status: 401 });
        }

        const { data: payments, error } = await adminDb
            .from("payments")
            .select(`
                id,
                amount,
                package,
                method,
                status,
                timestamp,
                user_id,
                users (email)
            `)
            .eq("status", "approved")
            .order("timestamp", { ascending: false });

        if (error) throw error;

        // Create CSV content
        const headers = ["Payment ID", "User ID", "Email", "Amount (Rs)", "Package", "Method", "Date"];
        const rows = payments.map(p => [
            p.id,
            p.user_id,
            p.users?.email || "Unknown",
            p.amount,
            p.package,
            p.method,
            new Date(p.timestamp).toLocaleString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error) {
        console.error("CSV Export error:", error);
        return new Response(error.message, { status: 500 });
    }
}
