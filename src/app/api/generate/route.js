import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { generateImage as generateImageGradio } from "@/lib/gradio";
import { generateImage as generateImageDeapi } from "@/lib/deapi";
import { supabase } from "@/lib/supabase";
import { sendGenerationAlert } from "@/lib/telegram";

export const maxDuration = 60; // Allow 60s for generation

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id, package, coins")
            .eq("id", session.user.id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
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
            userId: session.user.id,
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

        // Log generation and deduct coins
        if (resultUrls && resultUrls.length > 0) {
            // Log generation
            await supabase
                .from("generations")
                .insert([
                    {
                        user_id: session.user.id,
                        prompt: prompt || "Visual transformation",
                        image_url: resultUrls[0],
                        mode: mode,
                        provider: provider,
                        model: model || (provider === "deapi" ? "Flux_2_Klein_4B_BF16" : "Gradio Pool"),
                    }
                ]);

            // Deduct coins
            if (cost > 0) {
                await supabase
                    .from("users")
                    .update({ coins: user.coins - cost })
                    .eq("id", session.user.id);
            }
        }

        return NextResponse.json({ success: true, images: resultUrls, remainingCoins: user.coins - cost });

    } catch (error) {
        console.error("Generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
