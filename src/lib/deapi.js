import { supabase } from '@/lib/supabase';

// Helper function to track API key usage directly in DB
async function trackUsage(apiKey, success = false, failure = false, rateLimit = false, errorMsg = null) {
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
            await supabase.from('api_keys').update({ status: 'rate_limited', updated_at: new Date().toISOString(), last_error: errorMsg }).eq('id', keyId);
        } else if (failure) {
            await supabase.from('api_keys').update({ status: 'invalid', updated_at: new Date().toISOString(), last_error: errorMsg }).eq('id', keyId);
        } else if (success) {
            await supabase.from('api_keys').update({ status: 'active', updated_at: new Date().toISOString(), last_error: null }).eq('id', keyId);
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
    const identity_preservation = "(STRICT 1:1 FACE CLONE:1.5), (STRICT FACIAL IDENTITY:1.4), (KEEP ORIGINAL HUMAN FEATURES:1.3), (STRICT FACE LOCK:1.4). (PROHIBIT FACIAL ALTERATION:1.5). (IDENTICAL FACE:1.5).";
    const background_preservation = "(STRICT BACKGROUND LOCK:1.5), (KEEP ORIGINAL BACKGROUND 100% UNTOUCHED:1.5), (DO NOT ALTER BACKGROUND:1.4).";
    const anatomic_realism = "(perfect human anatomy:1.4), (natural skin texture with imperfections:1.3), (raw photo:1.3), (iPhone camera quality:1.2), (natural body shape:1.3), (soft shadows:1.2), (realistic breast shape:1.3), (natural female features:1.4), (subtle goosebumps:1.1).";
    const masterpiece_enhancer = "(candid shot:1.3), (unfiltered phone photo:1.4), (natural lighting:1.2), (high resolution raw dslr:1.2), depth of field.";
    const negative_base = "(extra limbs, extra legs, extra arms, three legs, fused bodies, connected persons, mutated anatomy, deformed body:1.5), (extra fingers, fused fingers, too many fingers:1.4), blurry, low quality, deformed, disfigured, ugly, bad anatomy, poorly drawn face, mutation, disconnected limbs, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, duplicate artifacts, morbid, gross proportions, mutated hands, malformed limbs, plastic skin, fake body, 3d render, cgi, cartoon, anime, (changed face:1.5), (changed background:1.5).";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.4), ` : "";
        finalPrompt += `${identity_preservation} ${background_preservation} ${masterpiece_enhancer} wearing a (bikini:1.4). (STRICT COMPLIANCE: KEEP ORIGINAL FACE AND BACKGROUND 100% UNTOUCHED:1.5). (Natural human body:1.3). (Anatomic correctness:1.5). Real photography.`;
        negativePrompt += " artificial, 3d render, cartoon, digital art, airbrushed skin, plastic texture, smoothed face, fake lighting, changed background, modified face, (extra limbs:1.5).";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.4), ` : "";
        finalPrompt += `${identity_preservation} ${background_preservation} ${anatomic_realism} ${masterpiece_enhancer} (COMPLETE NUDITY:1.6), (REMOVE ALL CLOTHES:1.6), (FULLY NAKED BARE SKIN:1.6). (Full body naked candid:1.4), (natural anatomy:1.5), (perfect human structure:1.5), (no extra parts:1.6), (detailed breasts:1.3), (natural vulva:1.4). (Shadows and depth in intimate area:1.3). NEGATIVE: clothes, dress, fabric, bra, underwear, bikini, swimsuit, (plastic skin:1.5), (3d model:1.5). (STRICT 1:1 FACE LOCK:1.5). (BACKGROUND LOCK:1.5). High-resolution raw candid photo.`;
        negativePrompt += " clothes, dress, fabric, garments, bra, underwear, bikini, swimsuit, changed pose, modified body, fake anatomy, modified face, swapped face, face distortion, plastic texture, airbrushed, cgi, flat look, oversaturated, modified background, (three legs, extra limbs, fused limbs:1.6).";
    } else if (mode === 'remover') {
        const remove_instruction = "(REMOVE STICKER:2.0), (REMOVE EMOJI:2.0), (CLEAN FACE:2.0), (RESTORE ORIGINAL FACE:1.8).";
        finalPrompt = `${remove_instruction} ${identity_preservation} ${background_preservation} ${masterpiece_enhancer} Remove any occlusions, stickers, emojis, graphics overlaying the face. Keep hair, ears, neck, and background EXACTLY as they are. High quality restoration. IMPORTANT: (SAME EYES:2.0), (SAME NOSE:2.0), (SAME LIPS:2.0), (EXACT FACE SHAPE:2.0). (STRICT BACKGROUND PRESERVATION:1.6).`;
        negativePrompt += " sticker, emoji, graphic, text, watermark, occlusion, distorted face, changed identity, blur, plastic, low quality, changed background, changed eyes, changed nose, changed lips, modified environment.";
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
                const guidance = mode === 'nude' ? 2.5 : (mode === 'remover' ? 2.0 : 2.5);
                const strength = mode === 'nude' ? 0.62 : (mode === 'remover' ? 0.38 : 0.35);
                const imageStrength = mode === 'nude' ? 0.98 : (mode === 'remover' ? 0.99 : 0.98);

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
                        await trackUsage(apiKey, false, false, true, `Rate Limited (429): ${errorText.slice(0, 100)}`);
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
                        await trackUsage(apiKey, false, true, false, `Error ${response.status}: ${errorText.slice(0, 100)}`);
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
