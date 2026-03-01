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
    const identity_preservation = "(STRICT 1:1 FACE CLONE:1.5), (STRICT FACIAL IDENTITY:1.4), (KEEP ORIGINAL HUMAN FEATURES:1.3), (STRICT FACE LOCK:1.4), (IDENTICAL FACE:1.5), (SINGLE PERSON ONLY:1.5), (ONLY ONE PERSON:1.5). (PROHIBIT EXTRA PEOPLE:1.5).";
    const background_preservation = "(STRICT BACKGROUND LOCK:1.5), (KEEP ORIGINAL BACKGROUND 100% UNTOUCHED:1.5), (DO NOT ALTER BACKGROUND:1.4).";
    const pose_preservation = "(STRICT POSE LOCK:1.5), (KEEP ORIGINAL POSE 100% UNTOUCHED:1.5), (STRICTLY PRESERVE BODY POSE:1.5), (SAME POSE:1.5), (SINGLE PERSON POSE:1.4).";
    const anatomic_realism = "(perfect human anatomy:1.4), (natural skin texture with imperfections:1.3), (raw photo:1.3), (iPhone camera quality:1.2), (natural body shape:1.3), (soft shadows:1.2), (realistic breasts:1.3), (natural female features:1.4), (detailed skin:1.2).";
    const masterpiece_enhancer = "(candid shot:1.3), (unfiltered phone photo:1.4), (natural lighting:1.2), (high resolution raw dslr:1.2), (photorealistic:1.3).";
    const negative_base = "(extra limbs, extra legs, extra arms, three legs, fused bodies, connected persons, mutated anatomy, deformed body:1.5), (multiple people, group of people, twins, clones, extra people in background:1.6), (extra fingers, fused fingers, too many fingers:1.4), blurry, low quality, deformed, disfigured, ugly, bad anatomy, poorly drawn face, mutation, disconnected limbs, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, duplicate artifacts, morbid, gross proportions, mutated hands, malformed limbs, plastic skin, fake body, 3d render, cgi, cartoon, anime, (changed face:1.5), (changed background:1.5), (extra heads:1.5).";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.4), ` : "";
        finalPrompt += `${identity_preservation} ${background_preservation} ${pose_preservation} ${masterpiece_enhancer} (wearing a bikini:1.6), (FORCED BIKINI TRANSFORMATION:1.5). (STRICT COMPLIANCE: KEEP ORIGINAL FACE, POSE AND BACKGROUND 100% UNTOUCHED:1.5). (Natural human body:1.3). (Anatomic correctness:1.5). Real photography.`;
        negativePrompt += " artificial, 3d render, cartoon, digital art, airbrushed skin, plastic texture, smoothed face, fake lighting, changed background, modified face, (extra limbs:1.5), changed pose, modified pose, swapped pose, (unremoved clothes:1.6), (visible original clothes:1.6).";
    } else if (mode === 'nude') {
        const userSpecificPrompt = "[EXACT SAME PHOTO]: COPYRIGHT CLONE. KEEP SAME FACE. KEEP SAME POSE. KEEP SAME BACKGROUND. KEEP SAME LIGHTING. [ACTION]: REMOVE CLOTHES ONLY. UNDRESS GIRL. REMOVE BRA. REMOVE NIKAR. REMOVE PANTIES. REMOVE DRESS. REMOVE ALL CLOTHING LAYERS. [RESULT]: NUDE BODY. BARE SKIN. [IMPORTANT]: DO NOT CHANGE SKIN COLOR. DO NOT CHANGE ART STYLE. DO NOT REDRAW. JUST REMOVE CLOTHES. romve NIKAR NIKAR Ral body nude show all photos";
        finalPrompt = prompt ? `(${prompt}:1.4), ${userSpecificPrompt}` : userSpecificPrompt;
        negativePrompt += " (clothes:2.0), (dress:2.5), (fabric:2.0), (garments:2.0), (bra:2.0), (underwear:2.0), (bikini:2.0), (swimsuit:2.0), (visible clothing:2.0), changed pose, modified body, fake anatomy, modified face, swapped face, face distortion, plastic texture, airbrushed, cgi, flat look, oversaturated, modified background, (three legs, extra limbs, fused limbs:1.6), (original clothes visible:1.8).";
    } else if (mode === 'remover') {
        const remove_instruction = "[ACTION]: STRICTLY REMOVE ONLY MASKS, STICKERS, AND EMOJIS. REVEAL REAL HUMAN FACE UNDERNEATH. 0 TOUCHING TO ORIGINAL UNCOVERED PARTS. DO NOT REDRAW OR MODIFY THE UNDERLYING FACE.";
        finalPrompt = `${remove_instruction} ${identity_preservation} ${background_preservation} ${masterpiece_enhancer} Perfect 1:1 facial identity restoration. Same eyes, same nose, same lips. Exactly the same person, just without the mask/sticker.`;
        negativePrompt += " mask, sticker, emoji, drawn overlay, changed face, altered identity, modified eyes, modified lips, changed background, plastic skin, blurred details, distortion.";
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
                            true, 1024, 1024, 8, 1.8, false
                        ]);
                    } else if (space.type === "flux1_schnell" || space.type === "sdxl_turbo") {
                        const strength = mode === 'nude' ? 0.95 : (mode === 'remover' ? 0.40 : 0.55);
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
