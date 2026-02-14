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
    { id: "shinkai-ai/flux-dev-img2img", name: "Flux-Dev-Shinkai", type: "flux1_schnell" }
];

const INPAINT_POOL = [
    { id: "multimodalart/flux-inpainting-editing", name: "Flux-Inpaint-Pro" },
    { id: "ameerazam08/FLUX.1-dev-Inpainting-Model-Beta-GPU", name: "Flux-Inpaint-Beta" },
    { id: "Gradio-Community/Text-Guided-Flux-Inpainting", name: "Flux-Inpaint-Text" }
];

const SAM_POOL = [
    { id: "ShilongLiu/Grounded-Segment-Anything", name: "SAM-Grounded" },
    { id: "SkalskiP/Grounded-Segment-Anything", name: "SAM-Detection" }
];

async function generateMask(initImgBuffer) {
    console.log("Generating automatic mask for clothes...");
    for (const space of SAM_POOL) {
        try {
            const client = await Client.connect(space.id);
            const imageFile = await handle_file(initImgBuffer);
            // Grounded-SAM typically takes (image, prompt, task, threshold, text_threshold)
            const result = await client.predict("/predict", [
                imageFile,
                "clothes, dress, bikini, outfit, fabric", // Detection prompt
                "Segment Everything", // Task
                0.3, // Box threshold
                0.25 // Text threshold
            ]);

            if (result && result.data && result.data.length > 0) {
                // Return the mask file (usually the second or third output)
                // SAM outputs: [labeled_image, mask_image, etc]
                const maskUrl = result.data.find(item => item && (item.url || item.path) && item.label === "mask") || result.data[1];
                if (maskUrl) {
                    let url = maskUrl.url || maskUrl.path;
                    if (url && !url.startsWith('http')) {
                        url = `${client.config.root.replace(/\/$/, '')}/file=${url}`;
                    }
                    return url;
                }
            }
        } catch (e) {
            console.warn(`SAM Space ${space.name} failed:`, e.message);
        }
    }
    return null;
}

export async function generateImage(prompt, initImgBuffer, mode) {
    const identity_preservation = "(STRICT IDENTITY AND POSE PRESERVATION:2.0), (MAINTAIN EXACT ORIGINAL BODY SILHOUETTE:2.0), (KEEP ORIGINAL FACES AND HAIR:1.9).";
    const anatomic_realism = "(BIOLOGICALLY ACCURATE SKIN RECOVERY:1.8), (NATURAL SKIN TEXTURE:1.8), (REALISTIC ANATOMY MATCHING ORIGINAL POSE:1.9), (DETAILED REALISTIC SKIN WHERE CLOTHING WAS REMOVED:1.9).";
    const masterpiece_enhancer = "masterpiece, (8k UHD raw photo:1.3), ultra-detailed, (realistic skin pores:1.4), cinematic lighting, RAW photography.";
    const negative_base = "blurry, low quality, deformed, disfigured, ugly, bad anatomy, extra limbs, poorly drawn face, mutation, disconnected limbs, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, extra fingers, duplicate artifacts, morbid, gross proportions, missing arms, missing legs, extra arms, extra legs, mutated hands, fused fingers, too many fingers, malformed limbs, plastic skin, fake body, 3d render, cgi, cartoon, anime.";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    // Identity preservation & realism prompts - apply to uploaded image only
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt += `${identity_preservation} ${masterpiece_enhancer} (APPLY BIKINI TO ALL GIRLS IN THE PHOTO:1.9), wearing a matching (bikini:1.4), realistic fabric physics, intricate clothing details. IMPORTANT: Keep the exact same people, faces, hair, pose, background. (Perfect anatomy:1.6), flawless hands with exactly five fingers. High-resolution raw photography.`;
        negativePrompt += " clothes, dress, shirt, pants, original clothing, covered body.";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.3), ` : "";
        finalPrompt += `${identity_preservation} ${anatomic_realism} ${masterpiece_enhancer} (UNCLOTHE AND REMOVE CLOTHING ONLY:1.9), (COMPLETE NUDITY:1.8), (STRICTLY PRESERVE ORIGINAL POSE:2.0). DELETE: ALL clothes, dress, top, bra, underwear. REPLACE WITH: (realistic bare skin:1.8). IMPORTANT: Keep exact same people, faces, and EXACT pose. Perfect anatomical match to original body.`;
        negativePrompt += " clothes, dress, fabric, garments, bra, underwear, changed pose, modified body, fake anatomy.";
    } else {
        finalPrompt = prompt || "full body photo";
    }

    const shuffledPool = [...SPACE_POOL].sort(() => Math.random() - 0.5);
    const shuffledInpaint = [...INPAINT_POOL].sort(() => Math.random() - 0.5);
    const batchSize = 3;
    const allErrors = [];

    // Attempt Mask Generation for "Pixel Perfect" results
    let maskUrl = null;
    if (initImgBuffer && (mode === 'nude' || mode === 'bikini')) {
        maskUrl = await generateMask(initImgBuffer);
    }

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
                    if (maskUrl) {
                        // INPAINTING WORKFLOW
                        const inpaintSpace = shuffledInpaint[0]; // Try the best available inpaint space
                        const inpaintClient = await Client.connect(inpaintSpace.id);

                        // Flux Inpainting format: [ {background, layers, composite}, prompt, neg_prompt, strength, match_colors ]
                        result = await inpaintClient.predict("/predict", [
                            {
                                background: imageFile,
                                layers: [{ path: maskUrl }],
                                composite: null
                            },
                            finalPrompt,
                            negativePrompt,
                            0.68, // Optimal inpainting strength
                            true  // Match original colors
                        ]);
                    } else if (space.type === "flux2_klein") {
                        result = await client.predict("/generate", [
                            finalPrompt, imageFile ? [{ image: imageFile }] : [],
                            "Distilled (4 steps)", Math.floor(Math.random() * 2147483647),
                            true, 1024, 1024, 8, 2.7, false
                        ]);
                    } else if (space.type === "flux1_schnell" || space.type === "sdxl_turbo") {
                        const strength = mode === 'nude' ? 0.68 : 0.60;
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
