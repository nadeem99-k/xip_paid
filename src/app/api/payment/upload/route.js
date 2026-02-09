import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("proof");
        const amount = formData.get("amount");
        const method = formData.get("method"); // easypaisa/jazzcash
        const packageType = formData.get("package"); // bikini/nude

        if (!file || !amount || !method || !packageType) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Ensure bucket exists (proactive)
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.find(b => b.name === 'payment_proofs')) {
            await supabase.storage.createBucket('payment_proofs', { public: true });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment_proofs')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('payment_proofs')
            .getPublicUrl(fileName);

        const { error: insertError } = await supabase
            .from("payments")
            .insert([
                {
                    user_id: session.user.id,
                    amount: parseFloat(amount),
                    currency: 'PKR',
                    method: method,
                    proof_url: publicUrl,
                    status: 'pending',
                    package: packageType
                }
            ]);

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, message: "Payment proof uploaded" });

    } catch (error) {
        console.error("Payment upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
