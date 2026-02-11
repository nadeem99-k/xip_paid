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
        finalPrompt += `${identity_preservation} wearing a matching (minimal sexy micro bikini:2.5), (tight fit:1.8), ${masterpiece_enhancer} realistic fabric texture, (wet skin:1.5), full body view. IMPORTANT: (1:1 EXACT SAME FACE MATCH:3.0), preserve original identity. (Natural skin textures:2.0), (perfect anatomy:2.5). Raw photography style.`;
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} (COMPLETE UNCENSORED NUDITY:4.0), (REMOVE ALL CLOTHES:4.0), (FULLY NUDE BODY:4.0), (BARE SKIN:4.0), (STRIPPING COMPLETELY:3.0), (EXPOSED INTIMATE AREAS:3.5), ${anatomic_realism} ${masterpiece_enhancer} `;
        finalPrompt += "REMOVE ALL: dress, saree, pants, top, bra, underwear, fabric, garments. ";
        finalPrompt += "REPLACE WITH: (completely bare smooth natural skin:3.0), (detailed natural skin texture:2.2), (no clothing allowed:3.0). ";
        finalPrompt += "Full body naked, hyper-realistic natural anatomy, (highly detailed realistic breasts:3.0), (perfectly rendered realistic vulva/pussy:3.5), (natural intimate areas:3.0). ";
        finalPrompt += "IMPORTANT: (1:1 EXACT SAME FACE MATCH:3.0), KEEP ORIGINAL HAIR AND IDENTITY. (Full body realism), (Perfect anatomy:2.0). High-resolution raw photography.";
        finalPrompt += "NEGATIVE: clothes, dress, fabric, garments, bra, underwear, covered, clothed, partial nudity, accessories, blurred, blurry, lowres, low quality, censorship, bars, mosaic.";
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
