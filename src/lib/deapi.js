import { supabase } from '@/lib/supabase';

// Helper function to track API key usage directly in DB
async function trackUsage(apiKey, success = false, failure = false, rateLimit = false) {
    if (!supabase) return;

    try {
        // Find the API key in the database
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .select('id, status')
            .eq('api_key', apiKey)
            .single();

        if (keyError || !keyData) {
            // Key not in database, skip tracking
            return;
        }

        const keyId = keyData.id;

        // Update last_used_at timestamp
        await supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyId);

        // Update status based on response
        if (rateLimit) {
            await supabase.from('api_keys').update({ status: 'rate_limited' }).eq('id', keyId);
        } else if (failure) {
            await supabase.from('api_keys').update({ status: 'invalid' }).eq('id', keyId);
        } else if (success) {
            await supabase.from('api_keys').update({ status: 'active' }).eq('id', keyId);
        }

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Try to get existing usage record for today
        const { data: existingUsage } = await supabase
            .from('api_key_usage')
            .select('*')
            .eq('api_key_id', keyId)
            .eq('request_date', today)
            .single();

        if (existingUsage) {
            // Update existing record
            const updates = {};
            if (success) updates.success_count = (existingUsage.success_count || 0) + 1;
            if (failure) updates.failure_count = (existingUsage.failure_count || 0) + 1;
            if (rateLimit) updates.rate_limit_count = (existingUsage.rate_limit_count || 0) + 1;
            updates.updated_at = new Date().toISOString();

            await supabase
                .from('api_key_usage')
                .update(updates)
                .eq('id', existingUsage.id);
        } else {
            // Insert new record
            await supabase
                .from('api_key_usage')
                .insert({
                    api_key_id: keyId,
                    request_date: today,
                    success_count: success ? 1 : 0,
                    failure_count: failure ? 1 : 0,
                    rate_limit_count: rateLimit ? 1 : 0
                });
        }
    } catch (err) {
        console.warn('Failed to track usage:', err.message);
    }
}

export async function generateImage(prompt, initImgBuffer, mode, modelOverride) {
    const identity_preservation = "(STRICT 1:1 FACE CLONE:3.0), (DO NOT TOUCH FACE:3.0), (MAINTAIN IDENTICAL FACIAL FEATURES:3.0), (STRICT FACIAL PORTRAIT PRESERVATION:2.5), (KEEP ORIGINAL HUMAN FEATURES:2.5), (KEEP EXACT SAME PERSON AND IDENTITY:3.0), (LEAVE EYES NOSE MOUTH UNTOUCHED:3.0), (EXACT COPY OF INPUT FACE:3.0).";
    const anatomic_realism = "(BIOLOGICALLY ACCURATE ANATOMY:2.0), (NATURAL DETAILED SKIN TEXTURE:2.0), (REALISTIC BREASTS AND PINK INTIMATE AREAS:2.0), (DETAILED REALISTIC VULVA/PUSSY TEXTURE:2.0).";
    const masterpiece_enhancer = "masterpiece, ultra-detailed photography, 8k resolution, highly realistic, skin pores, natural light, cinematic composition.";
    const negative_base = "blurry, low quality, deformed, disfigured, ugly, bad anatomy, extra limbs, poorly drawn face, mutation, disconnected limbs, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, extra fingers, duplicate artifacts, morbid, gross proportions, missing arms, missing legs, extra arms, extra legs, mutated hands, fused fingers, too many fingers, malformed limbs, plastic skin, fake body, 3d render, cgi, cartoon, anime.";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt += `${identity_preservation} ${masterpiece_enhancer} wearing a matching (bikini:1.4), realistic fabric physics, intricate clothing details. IMPORTANT: (STRICT COMPLIANCE: KEEP ORIGINAL FACE 100% UNTOUCHED:3.0), (IDENTICAL HEAD AND HAIR:2.5). (Perfect anatomy:1.6), flawless hands with exactly five fingers. High-resolution raw photography. (SAME FACE AS INPUT:3.0).`;
        negativePrompt += " clothes, dress, shirt, pants, original clothing, covered body, modified face, changed features, different person, distorted eyes, changed expression, plastic surgery look.";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.5), ` : "";
        finalPrompt += `${identity_preservation} ${anatomic_realism} ${masterpiece_enhancer} (COMPLETE NUDITY:2.0), (REMOVE ALL CLOTHING:2.0), (FULLY NAKED:2.0), (BARE SKIN EVERYWHERE:2.0). DELETE: dress, saree, dupatta, pants, top, bra, underwear, ALL fabric, ALL garments. REPLACE WITH: (flawless smooth bare skin:2.0), (completely nude body:2.0), (no clothing whatsoever:2.0). Full body naked, hyper-realistic natural female anatomy, highly detailed natural breasts, perfectly rendered realistic vulva/pussy area, intimate areas match skin tone. Uniform skin texture, spotless clear skin, soft natural lighting. NEGATIVE: clothes, dress, fabric, garments, bra, underwear, covered, clothed. IMPORTANT: (STRICT 1:1 FACE LOCK:3.0), (DO NOT MODIFY FACIAL FEATURES:3.0), (KEEP ORIGINAL EYES NOSE AND LIPS:3.0), (SAME PERSON:3.0). (Perfect anatomy:1.8), flawless hands and feet. High-resolution raw photography. (SAME FACE AS INPUT:3.0).`;
        negativePrompt += " clothes, dress, fabric, garments, bra, underwear, changed pose, modified body, fake anatomy, modified face, swapped face, face distortion, changed eyes, changed mouth, different identity.";
    } else if (mode === 'remover') {
        const remove_instruction = "(REMOVE STICKER:2.0), (REMOVE EMOJI:2.0), (CLEAN FACE:2.0), (RESTORE ORIGINAL FACE:1.8).";
        finalPrompt = `${remove_instruction} ${identity_preservation} ${masterpiece_enhancer} Remove any occlusions, stickers, emojis, graphics overlaying the face. Keep hair, ears, neck, and background EXACTLY as they are. High quality restoration. IMPORTANT: (SAME EYES:2.0), (SAME NOSE:2.0), (SAME LIPS:2.0), (EXACT FACE SHAPE:2.0).`;
        negativePrompt += " sticker, emoji, graphic, text, watermark, occlusion, distorted face, changed identity, blur, plastic, low quality, changed background, changed eyes, changed nose, changed lips.";
    } else {
        finalPrompt = prompt || "full body photo";
    }

    // Filter out known bad keys (those that returned 401 recently in this session)
    // In a real app we'd persistent this, but for now we'll just track it in a local set if needed
    // However, the requested change is to skip them during the loop if 401 is encountered.


    // Fetch API keys from database first (Direct Supabase Query)
    const dbKeys = [];
    if (supabase) {
        try {
            const { data: keys, error } = await supabase
                .from('api_keys')
                .select('api_key')
                .eq('provider', 'deapi')
                .eq('is_enabled', true);

            if (!error && keys && keys.length > 0) {
                keys.forEach(k => {
                    if (k.api_key && k.api_key.trim()) {
                        dbKeys.push(k.api_key.trim());
                    }
                });
                console.log(`Loaded ${dbKeys.length} DeAPI keys from database (Direct DB)`);
            } else if (error) {
                console.warn('Supabase DB error fetching keys:', error.message);
            }
        } catch (dbError) {
            console.warn('Failed to fetch keys from database:', dbError.message);
        }
    } else {
        console.warn('Supabase client not available, skipping DB keys.');
    }

    // Load environment keys
    const envKeysRaw = (process.env.DEAPI_API_KEYS || process.env.DEAPI_API_KEY || "").split(',');
    const envKeys = envKeysRaw.map(k => k.trim()).filter(k => k.length > 0);
    console.log(`Loaded ${envKeys.length} DeAPI keys from environment`);

    // Merge and deduplicate
    const allKeys = [...new Set([...dbKeys, ...envKeys])];
    console.log(`Total unique DeAPI keys available: ${allKeys.length}`);

    if (allKeys.length === 0) {
        console.warn("No DeAPI keys found in database or environment!");
    }

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
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Skip if we hit 401 on this key before (optional enhancement, but let's just handle it in the loop)
                console.log(`Attempting DeAPI generation directly with key index ${i}...`);

                // Try preferred model first
                let modelsToTry = [model, "flux-dev", "flux", "stable-diffusion-xl"];
                // Remover mode: Prefer Flux for identity, Qwen might be too strong
                if (mode === 'remover') {
                    modelsToTry = ["Flux_2_Klein_4B_BF16", "flux-dev", "flux"];
                }

                // Dynamic parameters based on mode for optimal results
                // REMOVER: Lower strength preserves MORE of the original image (especially the face)
                const guidance = mode === 'nude' ? 3.0 : (mode === 'remover' ? 2.2 : 2.5);
                const strength = mode === 'nude' ? 0.50 : (mode === 'remover' ? 0.45 : 0.45);
                const imageStrength = mode === 'nude' ? 0.96 : (mode === 'remover' ? 0.95 : 0.96);

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
                        const errorText = await response.text();
                        console.warn(`DeAPI key ${i} rate limited (429) on POST. Details: ${errorText}`);
                        await trackUsage(apiKey, false, false, true);
                        lastError = new Error(`DeAPI key ${i} rate limited: ${errorText}`);
                        break; // Exit model loop, try next key
                    }

                    if (response.status === 401) {
                        console.error(`DeAPI key ${i} is INVALID (401). Skipping...`);
                        lastError = new Error(`Invalid key ${i}`);
                        break; // Exit model loop, skip this key forever in this loop
                    }

                    if (response.status === 422) {
                        console.warn(`DeAPI key ${i} does not support model ${currentModel}. Trying next fallback...`);
                        allKeysRateLimited = false;
                        continue;
                    }

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`DeAPI key ${i} error ${response.status}: ${errorText}`);
                        await trackUsage(apiKey, false, true, false);
                        lastError = new Error(`DeAPI error ${response.status}: ${errorText}`);
                        allKeysRateLimited = false;
                        break;
                    }

                    const data = await response.json();
                    const requestId = data.data?.request_id || data.request_id;

                    if (!requestId) {
                        console.warn(`No request_id returned from DeAPI with key ${i} and model ${currentModel}`);
                        continue;
                    }

                    // Track successful request
                    const result = await pollStatus(requestId, apiKey);
                    await trackUsage(apiKey, true, false, false);
                    return result;
                }
            } catch (error) {
                console.error(`DeAPI Attempt with key index ${i} failed:`, error.message);
                lastError = error;
                allKeysRateLimited = false;
            }
        }
    }

    throw lastError || new Error("All DeAPI keys failed or were rate-limited. Please try again later.");
}

async function pollStatus(requestId, apiKey) {
    let attempts = 0;
    const maxAttempts = 40; // Increased
    let delay = 2000;

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        try {
            const statusResponse = await fetch(`https://api.deapi.ai/api/v1/client/request-status/${requestId}`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (statusResponse.status === 429) {
                console.warn(`Polling 429 Rate Limit for request ${requestId}. Increasing delay...`);
                delay *= 1.5; // Exponential backoff
                attempts++;
                continue;
            }

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

            // Success call but not done yet, reset delay slightly or keep it
            if (delay > 2000) delay -= 500;
            if (delay < 2000) delay = 2000;

        } catch (pollError) {
            console.warn(`Polling error: ${pollError.message}`);
        }
        attempts++;
    }
    throw new Error(`DeAPI timed out after reaching maximum polling attempts.`);
}
