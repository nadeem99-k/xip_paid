import { Client, handle_file } from "@gradio/client";
// Trigger re-compilation

// Multi-Space Racing Pool (Ported from webhook.js)
const SPACE_POOL = [
    { id: "black-forest-labs/FLUX.2-klein-9B", name: "Flux-Klein-9B-A", type: "flux2_klein" },
    { id: "black-forest-labs/FLUX.2-klein-4B", name: "Flux-Klein-4B-A", type: "flux2_klein" },
    { id: "Akjava/flux1-schnell-img2img", name: "Flux-Schnell-A", type: "flux1_schnell" },
    { id: "multimodalart/FLUX.1-schnell", name: "Flux-Schnell-B", type: "flux1_schnell" },
    { id: "sayakpaul/flux.1-schnell-img2img", name: "Flux-Schnell-C", type: "flux1_schnell" },
    { id: "diffusers/unofficial-SDXL-Turbo-i2i-t2i", name: "SDXL-Turbo-A", type: "flux1_schnell" },
    { id: "stabilityai/sdxl-turbo", name: "SDXL-Turbo-Direct", type: "sdxl_turbo" },
    { id: "Kijai/FLUX.1-dev-img2img", name: "Flux-Dev-Kijai", type: "flux1_schnell" },
    { id: "lllyasviel/IC-Light-V2", name: "IC-Light-V2", type: "flux1_schnell" },
    { id: "shinkai-ai/flux-dev-img2img", name: "Flux-Dev-Shinkai", type: "flux1_schnell" },
    { id: "cagliostrolab/animagine-xl-3.1", name: "Animagine-XL", type: "sdxl_turbo" }
];

export async function generateImage(prompt, initImgBuffer, mode) {
    const identity_preservation = "(STRICT 1:1 FACE CLONE:3.2), (KEEP ORIGINAL HUMAN FEATURES:3.0), (LEAVE EYES NOSE MOUTH HAIR UNTOUCHED:3.2), (EXACT COPY OF INPUT FACE:3.2), (SAME PERSON:3.2).";
    const anatomic_realism = "(BIOLOGICALLY ACCURATE ANATOMY:2.2), (NATURAL REAL SKIN TEXTURE:2.2), (SKIN PORES AND BUMPS:1.8), (REALISTIC BREASTS:2.0), (DETAILED REALISTIC VULVA/PUSSY:2.2), (SEAMLESS SKIN:1.5), (PHOTOREALISTIC:2.0).";
    const masterpiece_enhancer = "masterpiece, raw photography, 8k resolution, natural light, (skin texture:1.5), depth of field, sharp focus, (unfiltered:1.2).";
    const negative_base = "blurry, low quality, deformed, disfigured, ugly, bad anatomy, extra limbs, poorly drawn face, mutation, disconnected limbs, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, extra fingers, duplicate artifacts, morbid, gross proportions, missing arms, missing legs, extra arms, extra legs, mutated hands, fused fingers, too many fingers, malformed limbs, plastic skin, fake body, 3d render, cgi, cartoon, anime.";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt += `${identity_preservation} ${masterpiece_enhancer} wearing a matching (bikini:1.4), realistic fabric physics. IMPORTANT: (STRICT COMPLIANCE: KEEP ORIGINAL FACE 100% UNTOUCHED:3.2), (IDENTICAL HEAD AND HAIR:2.8). (Perfect anatomy:1.6). High-resolution raw photography. (SAME FACE AS INPUT:3.2).`;
        negativePrompt += " clothes, dress, shirt, pants, original clothing, covered body, modified face, changed features, different person, plastic surgery look, ai generated artifacts, smoothed skin.";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt += `${identity_preservation} ${anatomic_realism} ${masterpiece_enhancer} (COMPLETE NUDITY:2.3), (REMOVE ALL CLOTHING:2.3), (FULLY NAKED:2.3). DELETE: clothing, dress, saree, pants, top, bra, underwear. REPLACE WITH: (flawless smooth real skin:2.3), (completely nude body:2.3). Full body naked, hyper-realistic natural female anatomy, highly detailed natural breasts, rendered realistic vulva/pussy area. Uniform skin texture, soft natural lighting. NEGATIVE: clothes, dress, fabric, garments, bra, underwear. IMPORTANT: (STRICT 1:1 FACE LOCK:3.2), (DO NOT MODIFY FACIAL FEATURES:3.2), (SAME PERSON:3.2). (Perfect anatomy:1.8). High-resolution raw photography. (SAME FACE AS INPUT:3.2).`;
        negativePrompt += " clothes, dress, fabric, garments, bra, underwear, changed pose, modified body, fake anatomy, modified face, swapped face, face distortion, plastic texture, airbrushed skin, cgi.";
    } else if (mode === 'remover') {
        const remove_instruction = "(REMOVE STICKER:2.0), (REMOVE EMOJI:2.0), (CLEAN FACE:2.0), (RESTORE ORIGINAL FACE:1.8).";
        finalPrompt = `${remove_instruction} ${identity_preservation} ${masterpiece_enhancer} Remove any occlusions, stickers, emojis, graphics overlaying the face. Keep hair, ears, neck, and background EXACTLY as they are. High quality restoration. IMPORTANT: (SAME EYES:2.0), (SAME NOSE:2.0), (SAME LIPS:2.0), (EXACT FACE SHAPE:2.0).`;
        negativePrompt += " sticker, emoji, graphic, text, watermark, occlusion, distorted face, changed identity, blur, plastic, low quality, changed background, changed eyes, changed nose, changed lips.";
    } else {
        finalPrompt = prompt || "full body photo";
    }

    const shuffledPool = [...SPACE_POOL].sort(() => Math.random() - 0.5);
    const batchSize = 3;
    const allErrors = [];

    return new Promise(async (resolve, reject) => {
        let finished = false;
        let activeBatches = 0;

        const runBatch = async (index) => {
            if (finished || index >= shuffledPool.length) return;

            activeBatches++;
            const batch = shuffledPool.slice(index, index + batchSize);
            const batchPromises = batch.map(async (space) => {
                try {
                    const client = await Client.connect(space.id);
                    const imageFile = initImgBuffer ? await handle_file(initImgBuffer) : null;

                    let result;
                    if (space.type === "flux2_klein") {
                        result = await client.predict("/generate", [
                            finalPrompt, imageFile ? [{ image: imageFile }] : [],
                            "Distilled (4 steps)", Math.floor(Math.random() * 2147483647),
                            true, 1024, 1024, 8, 3.0, false
                        ]);
                    } else if (space.type === "flux1_schnell" || space.type === "sdxl_turbo") {
                        const strength = mode === 'nude' ? 0.55 : (mode === 'remover' ? 0.45 : 0.48);
                        const payload = [imageFile, finalPrompt, strength, Math.floor(Math.random() * 2147483647), 8];

                        const endpoints = (space.id.includes("SDXL") || space.id.includes("Animagine") || space.type === "sdxl_turbo")
                            ? ["/predict", "/infer", "/generate", 0]
                            : ["/process_images", "/process", "/infer", "/predict", 0];

                        for (const ep of endpoints) {
                            try {
                                result = await client.predict(ep, payload);
                                if (result) break;
                            } catch (e) {
                                continue;
                            }
                        }
                    }

                    if (result && result.data && result.data.length > 0) {
                        const images = result.data
                            .filter(item => item && (item.url || item.path))
                            .map(item => {
                                let url = item.url || item.path;
                                // If path is relative (e.g. from Gradio), make it absolute
                                if (url && !url.startsWith('http')) {
                                    const base = client.config.root;
                                    url = `${base.replace(/\/$/, '')}/file=${url}`;
                                }
                                return url;
                            });

                        if (images.length > 0 && !finished) {
                            finished = true;
                            resolve(images);
                            return;
                        }
                    }
                } catch (e) {
                    allErrors.push(`${space.name}: ${e.message}`);
                }
            });

            const nextBatchTimeout = setTimeout(() => {
                if (!finished) {
                    runBatch(index + batchSize);
                }
            }, 10000);

            await Promise.all(batchPromises);
            activeBatches--;

            if (activeBatches === 0 && !finished && index + batchSize >= shuffledPool.length) {
                clearTimeout(nextBatchTimeout);
                reject(new Error(`All models exhausted: ${allErrors.slice(0, 5).join(' | ')}`));
            }
        };

        runBatch(0);
    });
}
