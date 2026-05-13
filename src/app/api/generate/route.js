import { NextResponse } from 'next/server';
import { generateImage as generateImageGradio } from "@/lib/gradio";
import { generateImage as generateImageDeapi } from "@/lib/deapi";
import { supabase as adminDb } from "@/lib/supabase";
import { sendGenerationAlert, sendGenerationResult } from "@/lib/telegram";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { acquireSlot, releaseSlot } from "@/lib/concurrency";

export const maxDuration = 300; // Allow 5 minutes for queuing and generation

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.package === 'banned') {
            return NextResponse.json({ error: "Your account has been restricted. Please login with your real Gmail account to continue." }, { status: 403 });
        }

        const formData = await req.formData();
        const prompt = formData.get("prompt");
        const file = formData.get("image");
        const selectedMode = formData.get("mode");
        const provider = formData.get("provider") || "gradio";
        const model = formData.get("model");

        const mode = selectedMode || user.package;
        const cost = mode === 'nude' ? 6 : (mode === 'bikini' || mode === 'remover' ? 2 : 0);

        if (user.coins < cost) {
            return NextResponse.json({ error: `Insufficient coins. ${mode} mode costs ${cost} coins.` }, { status: 403 });
        }

        // 2. CHECK DAILY LIMITS
        const today = new Date().toISOString().split('T')[0];
        const { data: usageData, error: usageError } = await adminDb
            .from("daily_usage")
            .select("generation_count")
            .eq("user_id", user.id)
            .eq("usage_date", today)
            .maybeSingle();

        const currentUsage = usageData?.generation_count || 0;
        const isFreeUser = !user.package || user.package === 'free' || user.package === 'trial';

        if (isFreeUser && currentUsage >= 1) {
            return NextResponse.json({ 
                error: "Daily limit reached for Free plan (1 image/day). Please upgrade your plan for unlimited generations." 
            }, { status: 403 });
        }

        if (!file) {
            return NextResponse.json({ error: "Image file is required" }, { status: 400 });
        }

        // Convert file to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Send Telegram Generation Alert (Async, don't block generation)
        sendGenerationAlert({
            userId: user.id,
            mode: mode,
            prompt: prompt,
            provider: provider,
        }, buffer).catch(err => console.error("Generation alert failed:", err));

        // Acquire concurrency slot
        try {
            await acquireSlot(user.id);
        } catch (slotErr) {
            return NextResponse.json({ error: slotErr.message }, { status: 429 });
        }

        let resultUrls;
        try {
            if (provider === "deapi") {
                resultUrls = await generateImageDeapi(prompt, buffer, mode, model);
            } else {
                resultUrls = await generateImageGradio(prompt, buffer, mode);
            }
        } finally {
            // Always release the slot, even if generation fails
            releaseSlot(user.id);
        }

        // Process generated images and upload to Supabase Storage
        const processedUrls = [];
        if (resultUrls && resultUrls.length > 0) {
            // Ensure bucket exists
            const { data: buckets } = await adminDb.storage.listBuckets();
            if (!buckets?.find(b => b.name === 'generated_images')) {
                await adminDb.storage.createBucket('generated_images', { public: true });
            }

            for (const url of resultUrls) {
                try {
                    // Download the image
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Failed to fetch generated image: ${response.statusText}`);
                    const imageBlob = await response.blob();
                    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

                    // Determine file extension
                    const extension = url.split('.').pop().split('?')[0] || 'webp';
                    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

                    // Upload to Supabase Storage
                    const { error: uploadError } = await adminDb.storage
                        .from('generated_images')
                        .upload(fileName, imageBuffer, {
                            contentType: imageBlob.type || `image/${extension}`,
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    // Get Public URL
                    const { data: { publicUrl } } = adminDb.storage
                        .from('generated_images')
                        .getPublicUrl(fileName);

                    processedUrls.push(publicUrl);
                } catch (err) {
                    console.error("Error processing generated image:", err);
                    // Fallback to original URL if upload fails
                    processedUrls.push(url);
                }
            }
        }

        let generationId = null;
        // Log generation and deduct coins
        if (processedUrls.length > 0) {
            // Log generation
            const { data: genData, error: genError } = await adminDb
                .from("generations")
                .insert([
                    {
                        user_id: user.id, // Use the DB-verified user ID
                        prompt: prompt || "Visual transformation",
                        image_url: processedUrls[0],
                        mode: mode,
                        provider: provider,
                        model: model || (provider === "deapi" ? "Flux_2_Klein_4B_BF16" : "Gradio Pool"),
                    }
                ])
                .select("id")
                .single();

            if (genError) {
                console.error("Critical: Database log failed for generation:", genError);
            } else {
                generationId = genData?.id;
            }

            // Deduct coins
            const { error: deductError } = await adminDb
                .from("users")
                .update({ coins: user.coins - cost })
                .eq("id", user.id);

            if (deductError) {
                console.error("Critical: Coin deduction failed:", deductError);
            }
            
            // 3. Update DAILY USAGE
            const { error: usageUpdateError } = await adminDb
                .from("daily_usage")
                .upsert({ 
                    user_id: user.id, 
                    usage_date: today, 
                    generation_count: currentUsage + 1 
                }, { onConflict: 'user_id,usage_date' });
            
            if (usageUpdateError) {
                console.error("Daily usage update failed:", usageUpdateError.message);
            }

            // Send Telegram Generation Result (Async)
            sendGenerationResult({
                userId: user.id,
                mode: mode,
                resultUrl: processedUrls[0],
            }).catch(err => console.error("Generation result alert failed:", err));
        }

        return NextResponse.json({
            success: true,
            images: processedUrls,
            generationId,
            remainingCoins: user.coins - cost
        });

    } catch (error) {
        console.error("Generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
