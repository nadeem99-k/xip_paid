import sharp from "sharp";

export async function generateImage(prompt, initImgBuffer, mode, modelOverride) {
    const identity_preservation = "(1:1 ABSOLUTE BODY SILHOUETTE MATCH:2.5), (STRICT IDENTITY AND POSE PRESERVATION:2.5), (PRESERVE ORIGINAL BODY MASS AND PROPORTIONS:2.2), (ZERO PIXEL CHANGE TO HEAD AND FACE:2.5), (LOCK ALL FACIAL FEATURES:2.0).";
    const anatomic_realism = "(BIOLOGICALLY ACCURATE SKIN RECOVERY:1.9), (ULTRA-REALISTIC NATURAL SKIN TEXTURE:1.9), (DETAILED AREOLAS AND NIPPLES:1.8), (ANATOMICALLY PERFECT LABIA AND VULVA:1.7), (NATURAL GRAVITY ON BREASTS:1.5), (NATURAL SKIN OIL SHEEN:1.3), (REALISTIC ANATOMY MATCHING ORIGINAL POSE:1.9).";
    const masterpiece_enhancer = "masterpiece, (8k UHD raw photo:1.3), ultra-detailed photographic realism, (realistic skin pores:1.4), (seamless skin integration:1.6), (natural shadows:1.5), (MATCH ORIGINAL FILM GRAIN:1.4), (COLOR TEMPERATURE MATCH:1.4), cinematic RAW photography.";
    const negative_base = "blurry, low quality, deformed, disfigured, ugly, bad anatomy, extra limbs, poorly drawn face, mutation, disconnected limbs, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, extra fingers, duplicate artifacts, morbid, gross proportions, missing arms, missing legs, extra arms, extra legs, mutated hands, fused fingers, too many fingers, malformed limbs, plastic skin, fake body, 3d render, cgi, cartoon, anime.";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        const userPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt = `(full nudity:1.8), (wearing a matching bikini:1.5), ${userPrompt} ${identity_preservation} ${masterpiece_enhancer} (APPLY BIKINI TO ALL GIRLS IN THE PHOTO:1.9), realistic fabric physics, (MATCH ORIGINAL PHOTO LIGHTING:1.5). IMPORTANT: Keep the exact same people, faces, hair, pose, background.`;
        negativePrompt += " clothes, dress, shirt, pants, original clothing, covered body.";
    } else if (mode === 'nude') {
        const userPrompt = prompt ? `(${prompt}:1.3), ` : "";
        finalPrompt = `(unclothed:2.0), (full nakedness:2.2), (explicit nudity:2.5), (MAINTAIN ORIGINAL BODY SHAPE:2.2), (NO BODY ENHANCEMENT:2.0), (breasts and nipples:1.9), (vulva and labia:1.9), ${userPrompt} ${identity_preservation} ${anatomic_realism} ${masterpiece_enhancer} (COMPLETELY UNDRESS:2.5), (REMOVE ALL LAYERS OF CLOTHING:2.5), (FORCE COMPLETE NUDITY:2.3), (STRICTLY PRESERVE ORIGINAL POSE AND BACKGROUND:2.5). DELETE: ALL clothes, fabric, dress, top, bra, underwear. REPLACE WITH: (hyper-realistic bare skin:1.9). IMPORTANT: Zero modification to face, ZERO modification to background, ZERO modification to original body proportions.`;
        negativePrompt += " clothes, dress, fabric, garments, bra, underwear, changed pose, modified body, fake anatomy, modified background, changed face, zooming, cropping, blurry face, different identity, censored, hidden features, (unnaturally large breasts:1.5), (idealized proportions:1.5), (bodybuilder physique:1.5).";
    } else {
        finalPrompt = prompt || "full body photo";
    }

    const allKeys = (process.env.DEAPI_API_KEYS || process.env.DEAPI_API_KEY || "").split(',').filter(k => k.trim());
    const model = modelOverride || "Flux_2_Klein_4B_BF16";

    // Retry mechanism for rate limits
    let lastError = null;
    const maxRetries = 2; // Try the whole set of keys twice

    const blob = new Blob([initImgBuffer], { type: 'image/jpeg' });

    // Detect Original Dimensions to fix "Zooming"
    let width = 1024;
    let height = 1024;
    try {
        const metadata = await sharp(initImgBuffer).metadata();
        width = metadata.width;
        height = metadata.height;
        // Normalize to multiples of 32
        width = Math.floor(width / 32) * 32;
        height = Math.floor(height / 32) * 32;
        // Cap at 1536
        if (width > 1536) width = 1536;
        if (height > 1536) height = 1536;
        console.log(`DeAPI Detected dimensions: ${width}x${height} `);
    } catch (e) {
        console.warn("DeAPI failed to detect dimensions:", e.message);
    }

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
                const guidance = mode === 'nude' ? 3.5 : 3.5;
                const strength = mode === 'nude' ? 0.62 : 0.60; // Lowered significantly to lock the silhouette edges
                const imageStrength = mode === 'nude' ? 0.75 : 0.70; // Increased to anchor original pixels

                for (const currentModel of modelsToTry) {
                    const formData = new FormData();
                    formData.append('image', blob, 'image.jpg');
                    formData.append('prompt', finalPrompt);
                    formData.append('negative_prompt', negativePrompt);
                    formData.append('model', currentModel);
                    formData.append('steps', '4');
                    // Dynamic Resolution to fix "Zooming"
                    formData.append('width', width.toString());
                    formData.append('height', height.toString());
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
