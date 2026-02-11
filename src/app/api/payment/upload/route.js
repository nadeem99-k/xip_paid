import { NextResponse } from 'next/server';
import { supabase as adminDb } from "@/lib/supabase"; // For DB inserts
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { sendPaymentNotification } from "@/lib/telegram";

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("proof");
        const sourceFile = formData.get("source");
        const amount = formData.get("amount");
        const method = formData.get("method");
        const packageType = formData.get("package");

        if (!file || !amount || !method || !packageType) {
            return NextResponse.json({ error: "Missing Proof, Amount, Method or Package" }, { status: 400 });
        }

        // Use adminDb for storage operations to ensure permissions (or standard client if RLS allows)
        // Here using adminDb ensures it works.

        // Ensure bucket exists
        const { data: buckets } = await adminDb.storage.listBuckets();
        if (!buckets?.find(b => b.name === 'payment_proofs')) {
            await adminDb.storage.createBucket('payment_proofs', { public: true });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await adminDb.storage
            .from('payment_proofs')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = adminDb.storage
            .from('payment_proofs')
            .getPublicUrl(fileName);

        // Handle Source
        let sourcePublicUrl = null;
        if (sourceFile) {
            const sourceBuffer = Buffer.from(await sourceFile.arrayBuffer());
            const sourceFileName = `${user.id}/source-${Date.now()}-${sourceFile.name}`;
            const { error: sourceError } = await adminDb.storage
                .from('payment_proofs')
                .upload(sourceFileName, sourceBuffer, {
                    contentType: sourceFile.type,
                    upsert: true
                });

            if (!sourceError) {
                const { data: { publicUrl: sUrl } } = adminDb.storage
                    .from('payment_proofs')
                    .getPublicUrl(sourceFileName);
                sourcePublicUrl = sUrl;
            }
        }

        const { error: dbError } = await adminDb
            .from("payments")
            .insert([
                {
                    user_id: user.id,
                    amount: parseFloat(amount),
                    currency: 'PKR',
                    method: method,
                    proof_url: publicUrl,
                    status: 'pending',
                    package: packageType
                }
            ]);

        if (dbError) throw dbError;

        // Send Telegram Alert
        try {
            await sendPaymentNotification({
                userId: user.id,
                userName: user.full_name || user.name || user.email,
                amount: amount,
                method: method,
                package: packageType,
                proofUrl: publicUrl,
                sourceUrl: sourcePublicUrl
            });
        } catch (tgError) {
            console.error("Telegram alert failed:", tgError);
        }

        return NextResponse.json({ success: true, message: "Payment submitted successfully" });

    } catch (error) {
        console.error("Payment upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
