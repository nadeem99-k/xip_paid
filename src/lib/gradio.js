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
    const identity_preservation = "(STRICT 1:1 FACE CLONE:2.0), (DO NOT TOUCH FACE:2.0), (MAINTAIN IDENTICAL FACIAL FEATURES:2.0), (STRICT FACIAL PORTRAIT PRESERVATION:1.9), (KEEP ORIGINAL HUMAN FEATURES:1.9), (KEEP EXACT SAME PERSON AND IDENTITY:2.0), (LEAVE EYES NOSE MOUTH UNTOUCHED:2.0).";
    const anatomic_realism = "(BIOLOGICALLY ACCURATE ANATOMY:1.9), (NATURAL DETAILED SKIN TEXTURE:1.8), (REALISTIC BREASTS AND PINK INTIMATE AREAS:1.8), (DETAILED REALISTIC VULVA/PUSSY TEXTURE:1.9).";
    const masterpiece_enhancer = "masterpiece, ultra-detailed photography, 8k resolution, highly realistic, skin pores, natural light, cinematic composition.";
    const negative_base = "blurry, low quality, deformed, disfigured, ugly, bad anatomy, extra limbs, poorly drawn face, mutation, disconnected limbs, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, extra fingers, duplicate artifacts, morbid, gross proportions, missing arms, missing legs, extra arms, extra legs, mutated hands, fused fingers, too many fingers, malformed limbs, plastic skin, fake body, 3d render, cgi, cartoon, anime.";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt += `${identity_preservation} ${masterpiece_enhancer} wearing a matching (bikini:1.4), realistic fabric physics, intricate clothing details. IMPORTANT: (STRICT COMPLIANCE: KEEP ORIGINAL FACE 100% UNTOUCHED:2.0), (IDENTICAL HEAD AND HAIR:1.9). (Perfect anatomy:1.6), flawless hands with exactly five fingers. High-resolution raw photography.`;
        negativePrompt += " clothes, dress, shirt, pants, original clothing, covered body, modified face, changed features, different person, distorted eyes, changed expression.";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt += `${identity_preservation} ${anatomic_realism} ${masterpiece_enhancer} (COMPLETE NUDITY:2.0), (REMOVE ALL CLOTHING:2.0), (FULLY NAKED:1.9), (BARE SKIN EVERYWHERE:1.9). DELETE: dress, saree, dupatta, pants, top, bra, underwear, ALL fabric, ALL garments. REPLACE WITH: (flawless smooth bare skin:2.0), (completely nude body:1.9), (no clothing whatsoever:1.9). Full body naked, hyper-realistic natural female anatomy, highly detailed natural breasts, perfectly rendered realistic vulva/pussy area, intimate areas match skin tone. Uniform skin texture, spotless clear skin, soft natural lighting. NEGATIVE: clothes, dress, fabric, garments, bra, underwear, covered, clothed. IMPORTANT: (STRICT 1:1 FACE LOCK:2.0), (DO NOT MODIFY FACIAL FEATURES:2.0), (KEEP ORIGINAL EYES NOSE AND LIPS:2.0), (SAME PERSON:2.0). (Perfect anatomy:1.7), flawless hands and feet. High-resolution raw photography.`;
        negativePrompt += " clothes, dress, fabric, garments, bra, underwear, changed pose, modified body, fake anatomy, modified face, swapped face, face distortion, changed eyes, changed mouth.";
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
                            true, 1024, 1024, 8, 2.7, false
                        ]);
                    } else if (space.type === "flux1_schnell" || space.type === "sdxl_turbo") {
                        const strength = mode === 'nude' ? 0.58 : 0.55;
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
