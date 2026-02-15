export async function generateImage(prompt, initImgBuffer, mode, modelOverride) {
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
        negativePrompt += " clothes, dress, shirt, pants, original clothing, covered body, modified face, changed features, different person, distorted eyes, changed expression, plastic surgery look.";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt += `${identity_preservation} ${anatomic_realism} ${masterpiece_enhancer} (COMPLETE NUDITY:2.0), (REMOVE ALL CLOTHING:2.0), (FULLY NAKED:1.9), (BARE SKIN EVERYWHERE:1.9). DELETE: dress, saree, dupatta, pants, top, bra, underwear, ALL fabric, ALL garments. REPLACE WITH: (flawless smooth bare skin:2.0), (completely nude body:1.9), (no clothing whatsoever:1.9). Full body naked, hyper-realistic natural female anatomy, highly detailed natural breasts, perfectly rendered realistic vulva/pussy area, intimate areas match skin tone. Uniform skin texture, spotless clear skin, soft natural lighting. NEGATIVE: clothes, dress, fabric, garments, bra, underwear, covered, clothed. IMPORTANT: (STRICT 1:1 FACE LOCK:2.0), (DO NOT MODIFY FACIAL FEATURES:2.0), (KEEP ORIGINAL EYES NOSE AND LIPS:2.0), (SAME PERSON:2.0). (Perfect anatomy:1.7), flawless hands and feet. High-resolution raw photography.`;
        negativePrompt += " clothes, dress, fabric, garments, bra, underwear, changed pose, modified body, fake anatomy, modified face, swapped face, face distortion, changed eyes, changed mouth, different identity.";
    } else {
        finalPrompt = prompt || "full body photo";
    }

    const allKeys = (process.env.DEAPI_API_KEYS || process.env.DEAPI_API_KEY || "").split(',').filter(k => k.trim());
    const model = modelOverride || "Flux_2_Klein_4B_BF16";

    // Retry mechanism for rate limits
    let lastError = null;
    const maxRetries = 2; // Try the whole set of keys twice

    const blob = new Blob([initImgBuffer], { type: 'image/jpeg' });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);
        let allKeysRateLimited = true;

        for (let i = 0; i < shuffledKeys.length; i++) {
            const apiKey = shuffledKeys[i].trim();
            try {
                if (attempt > 0) {
                    console.log(`Retry attempt ${attempt + 1}/${maxRetries} for DeAPI generation...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retrying
                }

                console.log(`Attempting DeAPI generation directly with key index ${i}...`);

                // Try preferred model first
                const modelsToTry = [model, "flux-dev", "flux", "stable-diffusion-xl"];

                // Dynamic parameters based on mode for optimal results
                // Lower strength preserves MORE of the original image (especially the face)
                const guidance = mode === 'nude' ? 4.0 : 3.0;
                const strength = mode === 'nude' ? 0.58 : 0.55;
                const imageStrength = mode === 'nude' ? 0.85 : 0.82;

                for (const currentModel of modelsToTry) {
                    const formData = new FormData();
                    formData.append('image', blob, 'image.jpg');
                    formData.append('prompt', finalPrompt);
                    formData.append('negative_prompt', negativePrompt);
                    formData.append('model', currentModel);
                    formData.append('steps', '4');
                    formData.append('width', '1024');
                    formData.append('height', '1024');
                    formData.append('guidance_scale', guidance.toString());
                    formData.append('strength', strength.toString());
                    formData.append('image_strength', imageStrength.toString())
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
                        console.warn(`DeAPI key ${i} rate limited (429).`);
                        lastError = new Error(`DeAPI key ${i} rate limited.`);
                        break; // Exit model loop, try next key
                    }

                    if (response.status === 422) {
                        console.warn(`DeAPI key ${i} does not support model ${currentModel}. Trying next fallback...`);
                        allKeysRateLimited = false; // It's not a rate limit, just model handling
                        continue; // Try next fallback model with SAME key
                    }

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`DeAPI key ${i} error ${response.status}: ${errorText}`);
                        lastError = new Error(`DeAPI error ${response.status}: ${errorText}`);
                        allKeysRateLimited = false;
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
                lastError = error;
                allKeysRateLimited = false; // Network error or other exception
            }
        }

        // If we tried all keys and all were 429, we loop to the next attempt
        if (!allKeysRateLimited) {
            // If we had a non-429 error (like 500 or 401), we probably shouldn't just retry blindly, but let's assume we want to exhaust retries
            // Actually, if !allKeysRateLimited, it means we hit a real error or success (but returned returned above).
            // If we are here, it means we FAILED to return.
            // If errors were NOT rate limits, maybe we should stop?
            // But simpler to just let it retry or throw.
            // Let's just continue loop.
        }
    }

    throw lastError || new Error("All DeAPI keys failed or were rate-limited. Please try again later.");
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
