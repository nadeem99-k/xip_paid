import { NextResponse } from 'next/server';
import { generateImage as generateImageGradio } from "@/lib/gradio";
import { generateImage as generateImageDeapi } from "@/lib/deapi";
import { supabase as adminDb } from "@/lib/supabase";
import { sendGenerationAlert } from "@/lib/telegram";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export const maxDuration = 60; // Allow 60s for generation

export async function POST(req) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const prompt = formData.get("prompt");
        const file = formData.get("image");
        const selectedMode = formData.get("mode");
        const provider = formData.get("provider") || "gradio";
        const model = formData.get("model");

        const mode = selectedMode || user.package;
        const cost = mode === 'nude' ? 6 : (mode === 'bikini' ? 2 : 0);

        if (user.coins < cost) {
            return NextResponse.json({ error: `Insufficient coins. ${mode} mode costs ${cost} coins.` }, { status: 403 });
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

        let resultUrls;
        if (provider === "deapi") {
            resultUrls = await generateImageDeapi(prompt, buffer, mode, model);
        } else {
            resultUrls = await generateImageGradio(prompt, buffer, mode);
        }

        let generationId = null;
        // Log generation and deduct coins
        if (resultUrls && resultUrls.length > 0) {
            // Log generation
            const { data: genData, error: genError } = await adminDb
                .from("generations")
                .insert([
                    {
                        user_id: user.id, // Use the DB-verified user ID
                        prompt: prompt || "Visual transformation",
                        image_url: resultUrls[0],
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
        }

        return NextResponse.json({
            success: true,
            images: resultUrls,
            generationId,
            remainingCoins: user.coins - cost
        });

    } catch (error) {
        console.error("Generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
