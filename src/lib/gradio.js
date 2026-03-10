import { Client, handle_file } from "@gradio/client";
// Trigger re-compilation

// Multi-Space Racing Pool (Ported from webhook.js)
const SPACE_POOL = [
    { id: "black-forest-labs/FLUX.2-klein-9B", name: "Flux-Klein-9B-A", type: "flux2_klein" },
    { id: "black-forest-labs/FLUX.2-klein-4B", name: "Flux-Klein-4B-A", type: "flux2_klein" },
    { id: "Akjava/flux1-schnell-img2img", name: "Flux-Schnell-A", type: "flux1_schnell" },
    { id: "multimodalart/FLUX.1-schnell", name: "Flux-Schnell-B", type: "flux1_schnell" },
    { id: "sayakpaul/flux.1-schnell-img2img", name: "Flux-Schnell-C", type: "flux1_schnell" },
    { id: "Kijai/FLUX.1-dev-img2img", name: "Flux-Dev-Kijai", type: "flux1_schnell" },
    { id: "shinkai-ai/flux-dev-img2img", name: "Flux-Dev-Shinkai", type: "flux1_schnell" },
    { id: "stabilityai/sdxl-turbo", name: "SDXL-Turbo-Direct", type: "sdxl_turbo" },
];

export async function generateImage(prompt, initImgBuffer, mode) {
    const identity_preservation = "(STRICT 1:1 FACE CLONE:1.5), (STRICT FACIAL IDENTITY:1.4), (KEEP ORIGINAL HUMAN FEATURES:1.3), (STRICT FACE LOCK:1.4), (IDENTICAL FACE:1.5).";
    const background_preservation = "(STRICT BACKGROUND LOCK:1.5), (KEEP ORIGINAL BACKGROUND 100% UNTOUCHED:1.5), (DO NOT ALTER BACKGROUND:1.4).";
    const pose_preservation = "(STRICT POSE LOCK:1.5), (KEEP ORIGINAL POSE 100% UNTOUCHED:1.5), (STRICTLY PRESERVE BODY POSE:1.5), (SAME POSE:1.5).";
    const anatomic_realism = "(perfect human anatomy:1.4), (hyper-detailed skin pores:1.4), (raw unedited photography:1.5), (explicit natural anatomy:1.5), (highly detailed pussy, visible realistic vagina:2.5), (detailed realistic nipples:2.5), (EXACT ORIGINAL BODY PROPORTIONS:2.0), (match original breast size exactly:2.0), (soft shadows:1.2), (natural sagging, gravity-affected breasts:1.5), (natural female features:1.5).";
    const masterpiece_enhancer = "(candid shot:1.3), (unfiltered phone photo:1.4), (natural lighting:1.2), (high resolution raw dslr:1.2), (photorealistic:1.3).";
    const zero_touch_preservation = "(ZERO TOUCH:1.2), (PRESERVE ORIGINAL STYLE:1.2), (MATCH EXISTING LIGHTING:1.2), (IDENTICAL FRAMING:1.2), (KEEP ORIGINAL BODY PROPORTIONS:1.2), (DO NOT REDRAW ANYTHING EXCEPT CLOTHING AREA:1.5).";
    const negative_base = "(extra limbs:2.5), (missing limbs:2.5), (missing body parts:2.5), (extra fingers:2.5), (fused fingers:2.5), (double fingers:2.5), (mutated hands:2.5), blurry, low quality, deformed, disfigured, ugly, bad anatomy, (plastic skin:2.5), (doll anatomy:2.5), (censored:2.5), (smoothed crotch:2.5), (airbrushed:1.5), (muscular:2.0), (bodybuilder:2.0), (huge breasts:2.0), (implants:2.0), (exaggerated proportions:2.0), (fake breasts:2.0), (abs:1.5), (thick muscles:1.5), fake body, 3d render, cgi, cartoon, anime, (changed face:1.5), (changed background:1.5).";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.4), ` : "";
        finalPrompt += `${zero_touch_preservation} ${identity_preservation} ${background_preservation} ${pose_preservation} ${masterpiece_enhancer} (wearing a skimpy bikini:1.8), (REMOVE ALL OUTER AND INNER CLOTHING LAYERS FIRST:1.8), (BIKINI REPLACES ALL CLOTHES:1.8), (EXPOSED MIDRIFF:1.5), (BARE SHOULDERS:1.5), (VISIBLE SKIN:1.5). (STRICT COMPLIANCE: KEEP ORIGINAL FACE, POSE, STYLE, AND BACKGROUND 100% UNTOUCHED:1.8). (Ultra realistic natural human body:1.4). (Anatomic correctness:1.5). Real photography. Natural human skin texture.`;
        negativePrompt += " artificial, 3d render, cartoon, digital art, airbrushed skin, plastic texture, smoothed face, fake lighting, changed background, modified face, changed pose, modified pose, swapped pose, (original clothes visible:1.8), (underlying clothes:1.8), (coat:1.8), (jacket:1.8), (hoodie:1.8), (shirt:1.5), (pants:1.8), changed style, illustration, painting, (missing belly button:2.5), (missing limbs:2.5), (deleted body parts:2.5).";
    } else if (mode === 'nude') {
        const userSpecificPrompt = "[TASK]: FULL BODY CLOTHING REMOVAL PIPELINE. Step 1: IDENTIFY AND REMOVE OUTER LAYER (coat, jacket, sweater, hoodie, shirt, dress, pants). Step 2: REMOVE INNER LAYER (bra, underwear, swimsuit, any remaining fabric). Step 3: REVEAL BARE SKIN UNDERNEATH ALL LAYERS. [RESULT]: COMPLETELY NUDE HUMAN BODY. NO CLOTHING REMNANTS ON ANY PERSON IN IMAGE. (EXPLICIT UNCENSORED FULL ANATOMY:2.5), (HIGHLY DETAILED REALISTIC VAGINA:2.5), (DETAILED REALISTIC NIPPLES:2.5). (DO NOT CHANGE: FACE, POSE, BACKGROUND, SKIN TONE, BODY SHAPE:2.0). (REMOVE EVERY FABRIC LAYER INCLUDING COATS, JACKETS, HOODIES, SHIRTS, PANTS, UNDERWEAR:2.5). (APPLY TO EVERY PERSON IN IMAGE:2.0). (HYPER-REALISTIC BIOLOGICAL SKIN TEXTURE:2.5), (RAW NATURAL HUMAN BODY:2.0). (ADAPT TO ANY POSE: STANDING, SITTING, LYING:1.5). (DO NOT REDRAW ANYTHING EXCEPT CLOTHING AREA:1.5).";
        finalPrompt = prompt ? `(${prompt}:1.4), ${userSpecificPrompt}, ${anatomic_realism}` : `${userSpecificPrompt}, ${anatomic_realism}`;
        negativePrompt += " (clothes:2.5), (dress:2.5), (fabric:2.5), (garments:2.5), (coat:2.5), (jacket:2.5), (hoodie:2.5), (shirt:2.5), (pants:2.5), (bra:2.5), (underlining clothes:2.5), (underwear:2.5), (bikini:2.5), (swimsuit:2.5), (any remaining clothing:2.5), changed_pose, modified body, fake anatomy, modified face, swapped face, face distortion, (plastic texture:2.5), (airbrushed:2.5), cgi, flat look, oversaturated, modified background, (smooth doll crotch:2.5), (censored:2.5), (blurred genitals:2.5), (mosaic:2.5).";
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
                        const strength = mode === 'nude' ? 0.85 : (mode === 'remover' ? 0.40 : 0.60);
                        const payload = [imageFile, finalPrompt, negativePrompt, strength, Math.floor(Math.random() * 2147483647), 8];

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
