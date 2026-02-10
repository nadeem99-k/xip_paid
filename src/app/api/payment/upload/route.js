import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";
import { sendPaymentNotification } from "@/lib/telegram";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("proof");
        const sourceFile = formData.get("source"); // Optional source reference for backup
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

        // Upload Proof to Supabase Storage
        const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment_proofs')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get Public URL for Proof
        const { data: { publicUrl } } = supabase.storage
            .from('payment_proofs')
            .getPublicUrl(fileName);

        // Handle Source Reference (optional backup)
        let sourcePublicUrl = null;
        if (sourceFile) {
            const sourceBuffer = Buffer.from(await sourceFile.arrayBuffer());
            const sourceFileName = `${session.user.id}/source-${Date.now()}-${sourceFile.name}`;
            const { data: sourceUploadData } = await supabase.storage
                .from('payment_proofs')
                .upload(sourceFileName, sourceBuffer, {
                    contentType: sourceFile.type,
                    upsert: true
                });

            if (sourceUploadData) {
                const { data: { publicUrl: sUrl } } = supabase.storage
                    .from('payment_proofs')
                    .getPublicUrl(sourceFileName);
                sourcePublicUrl = sUrl;
            }
        }

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

        // Send Telegram Notification (Async, don't block response)
        sendPaymentNotification({
            userId: session.user.id,
            amount: amount,
            method: method,
            package: packageType,
            proofUrl: publicUrl,
            sourceUrl: sourcePublicUrl
        }).catch(err => console.error("Notification failed:", err));

        return NextResponse.json({ success: true, message: "Payment proof uploaded" });

    } catch (error) {
        console.error("Payment upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
