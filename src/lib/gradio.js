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
    const identity_preservation = "(1:1 IDENTICAL FACE MATCH:2.0), (STRICT FACIAL PORTRAIT PRESERVATION:2.5), (MAINTAIN ORIGINAL HAIR, HEAD AND FACIAL CHARACTERISTICS:2.0), (KEEP ORIGINAL HUMAN FEATURES UNCHANGED:2.0).";
    const anatomic_realism = "(BIOLOGICALLY ACCURATE UNALTERED FEMALE ANATOMY:2.5), (HYPER-REALISTIC NATURAL SKIN TEXTURE:2.0), (VISIBLE SKIN PORES, GOOSEBUMPS AND FINE HAIR:1.8), (REALISTIC NATURAL BREASTS:2.2), (PINK REALISTIC INTIMATE AREAS:2.2), (DETAILED REALISTIC VULVA/PUSSY ANATOMY:2.5), (8K UHD HDR PHOTOGRAPHY:2.0).";
    const masterpiece_enhancer = "masterpiece, ultra-detailed RAW photography, 8k resolution, extreme realism, cinematic professional lighting, (sharp focus:2.0), (highly detailed skin micro-details:1.8), (ultra-sharp 16k:1.8), professional studio quality, sharp textures, high-quality rendering.";

    let finalPrompt = "";
    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} wearing a matching (tiny sexy micro bikini:2.0), (tight fit:1.6), ${masterpiece_enhancer} realistic fabric physics, intricate clothing details, (wet skin:1.5), full body view. IMPORTANT: Keep the exact same person, face, hair, eyes, pose, background. (Perfect anatomy:2.0), flawless hands with exactly five fingers. High-resolution raw photography, photorealistic style.`;
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} (COMPLETE UNCENSORED NUDITY:2.5), (REMOVE ALL CLOTHES:2.5), (FULLY NAKED BODY:2.5), (BARE SKIN EVERYWHERE:2.5), (UNDRESSING:1.9), (STRIPPING COMPLETELY:2.5), (EXPOSED INTIMATE AREAS:2.5), ${anatomic_realism} ${masterpiece_enhancer} `;
        finalPrompt += "REMOVE: dress, saree, dupatta, pants, top, bra, underwear, ALL fabric, ALL garments, ALL clothing layers, ALL accessories. ";
        finalPrompt += "REPLACE WITH: (flawless smooth natural bare skin:2.5), (completely nude body:2.0), (detailed natural skin texture:1.8), (no clothing whatsoever:2.5). ";
        finalPrompt += "Full body naked, hyper-realistic natural female anatomy, highly detailed natural breasts, perfectly rendered realistic vulva/pussy area, wet intimate areas, professional natural lighting, volumetric shadows. ";
        finalPrompt += "Uniform skin texture, spotless clear skin, soft natural shadows. ";
        finalPrompt += "NEGATIVE: clothes, dress, fabric, garments, bra, underwear, covered, clothed, partial nudity, accessories, blurred, blurry, lowres, low quality, artifacts, censorship, bars, mosaic, watermark, signature. ";
        finalPrompt += "IMPORTANT: Keep exact same person, face, hair, eyes, pose, background. (Full body realism:2.0), (Perfect anatomy:2.0), flawless hands and feet. High-resolution raw photography, photorealistic rendering.";
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
                        const strength = mode === 'nude' ? 0.88 : 0.72;
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
