export async function generateImage(prompt, initImgBuffer, mode, modelOverride) {
    const identity_preservation = "(1:1 IDENTICAL FACE MATCH:1.9), (STRICT FACIAL PORTRAIT PRESERVATION:2.0), (MAINTAIN ORIGINAL HEAD AND HAIR:1.9), (KEEP ORIGINAL HUMAN FEATURES:1.9).";
    const anatomic_realism = "(BIOLOGICALLY ACCURATE ANATOMY:2.0), (NATURAL DETAILED SKIN TEXTURE:1.9), (REALISTIC BREASTS AND PINK INTIMATE AREAS:1.9), (DETAILED REALISTIC VULVA/PUSSY TEXTURE:2.0).";
    const masterpiece_enhancer = "masterpiece, ultra-detailed photography, 8k resolution, highly realistic, skin pores, natural light, cinematic composition, (sharp focus:1.5), (highly detailed:1.4), (ultra-sharp:1.5).";

    let finalPrompt = "";
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.4), ` : "";
        finalPrompt += `${identity_preservation} wearing a matching (bikini:1.4), ${masterpiece_enhancer} realistic fabric physics, intricate clothing details. IMPORTANT: Keep the exact same person, face, hair, pose, background. (Perfect anatomy:1.6), flawless hands with exactly five fingers. High-resolution raw photography.`;
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.4), ` : "";
        finalPrompt += `${identity_preservation} (COMPLETE NUDITY:2.0), (REMOVE ALL CLOTHING:2.0), (FULLY NAKED:1.9), (BARE SKIN EVERYWHERE:1.9), (UNDRESSING:1.9), (CLOTHES OFF:2.0), (SHEDDING CLOTHES:1.8), (STRIPPING:1.9), (REMOVING CLOTHING:2.0), ${anatomic_realism} ${masterpiece_enhancer} `;
        finalPrompt += "DELETE: dress, saree, dupatta, pants, top, bra, underwear, ALL fabric, ALL garments, ALL clothing layers. ";
        finalPrompt += "REPLACE WITH: (flawless smooth bare skin:2.0), (completely nude body:1.9), (detailed natural skin texture:1.8), (no clothing whatsoever:1.9). ";
        finalPrompt += "Full body naked, hyper-realistic natural female anatomy, highly detailed natural breasts, perfectly rendered realistic vulva/pussy area, intimate areas match skin tone. ";
        finalPrompt += "Uniform skin texture, spotless clear skin, soft natural lighting. ";
        finalPrompt += "NEGATIVE: clothes, dress, fabric, garments, bra, underwear, covered, clothed, partial nudity, accessories, blurred, blurry, lowres, low quality, artifacts. ";
        finalPrompt += "IMPORTANT: Keep exact same person, face, hair, pose, background. (Perfect anatomy:1.7), flawless hands and feet. High-resolution raw photography.";
    } else {
        finalPrompt = `${prompt || "full body photo"}, ${identity_preservation} ${masterpiece_enhancer}`;
    }

    const allKeys = (process.env.DEAPI_API_KEYS || process.env.DEAPI_API_KEY || "").split(',').filter(k => k.trim());
    const model = modelOverride || "Flux_2_Klein_4B_BF16";
    const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);

    const blob = new Blob([initImgBuffer], { type: 'image/jpeg' });

    for (let i = 0; i < shuffledKeys.length; i++) {
        const apiKey = shuffledKeys[i].trim();
        try {
            console.log(`Attempting DeAPI generation with key index ${i}...`);

            // Try preferred model first
            const modelsToTry = [model, "flux-dev", "flux", "stable-diffusion-xl"];

            for (const currentModel of modelsToTry) {
                const formData = new FormData();
                formData.append('image', blob, 'image.jpg');
                formData.append('prompt', finalPrompt);
                formData.append('model', currentModel);
                formData.append('steps', '4');
                formData.append('width', '1024');
                formData.append('height', '1024');
                formData.append('guidance_scale', '3.5');
                formData.append('seed', Math.floor(Math.random() * 2147483647).toString());

                const response = await fetch('https://api.deapi.ai/api/v1/client/img2img', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: formData
                });

                if (response.status === 429) {
                    console.warn(`DeAPI key ${i} rate limited (429). Rotating to next key...`);
                    break; // Exit model loop, try next key
                }

                if (response.status === 422) {
                    console.warn(`DeAPI key ${i} does not support model ${currentModel}. Trying next fallback...`);
                    continue; // Try next fallback model with SAME key
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`DeAPI key ${i} error ${response.status}: ${errorText}`);
                    break; // Exit model loop, try next key
                }

                const data = await response.json();
                const requestId = data.data?.request_id || data.request_id;

                if (!requestId) {
                    console.warn(`No request_id returned from DeAPI with key ${i} and model ${currentModel}`);
                    continue;
                }

                // If we got here, request is accepted, start polling
                return await pollStatus(requestId, apiKey);
            }
        } catch (error) {
            console.error(`DeAPI Attempt with key index ${i} failed:`, error.message);
        }
    }
    throw new Error("All DeAPI keys failed or were rate-limited. Please try again later.");
}

async function pollStatus(requestId, apiKey) {
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            const statusResponse = await fetch(`https://api.deapi.ai/api/v1/client/request-status/${requestId}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!statusResponse.ok) {
                console.warn(`DeAPI status check failed: ${statusResponse.status}`);
                attempts++;
                continue;
            }

            const statusData = await statusResponse.json();
            const status = statusData.data?.status || statusData.status;

            if (status === 'done' || status === 'success') {
                const result = statusData.data?.result || statusData.result;
                const url = Array.isArray(result) ? result[0] : (typeof result === 'string' ? result : (statusData.data?.url || statusData.url || statusData.data?.result_url));
                if (url) return [url];
                throw new Error(`DeAPI completed but no URL found.`);
            } else if (status === 'error' || status === 'failed') {
                throw new Error(`DeAPI processing failed: ${JSON.stringify(statusData)}`);
            }
        } catch (pollError) {
            console.warn(`Polling error: ${pollError.message}`);
        }
        attempts++;
    }
    throw new Error(`DeAPI timed out after ${maxAttempts * 2} seconds.`);
}
