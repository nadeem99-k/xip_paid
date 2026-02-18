import { supabase } from '@/lib/supabase';

// In-memory blacklist to skip failed keys immediately in the current process
const sessionBlacklist = new Set();
const blacklistTimes = new Map(); // key -> expiry timestamp

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
        finalPrompt += `${identity_preservation} ${background_preservation} ${pose_preservation} ${masterpiece_enhancer} (wearing a bikini:1.6), (FORCED BIKINI CHANGE:1.6). (STRICT COMPLIANCE: KEEP ORIGINAL FACE, POSE AND BACKGROUND 100% UNTOUCHED:1.5). (Natural human body:1.3). (Anatomic correctness:1.5). Real photography.`;
        negativePrompt += " artificial, 3d render, cartoon, digital art, airbrushed skin, plastic texture, smoothed face, fake lighting, changed background, modified face, (extra limbs:1.5), changed pose, modified pose, swapped pose, (original clothes visible:1.6), (underlying clothes:1.6).";
    } else if (mode === 'nude') {
        const userSpecificPrompt = "[EXACT SAME PHOTO]: COPYRIGHT CLONE. KEEP SAME FACE. KEEP SAME POSE. KEEP SAME BACKGROUND. KEEP SAME LIGHTING. [ACTION]: REMOVE CLOTHES ONLY. UNDRESS GIRL. REMOVE BRA. REMOVE NIKAR. REMOVE PANTIES. REMOVE DRESS. REMOVE ALL CLOTHING LAYERS. [RESULT]: NUDE BODY. BARE SKIN. [IMPORTANT]: DO NOT CHANGE SKIN COLOR. DO NOT CHANGE ART STYLE. DO NOT REDRAW. JUST REMOVE CLOTHES. romve NIKAR NIKAR Ral body nude show all photos";
        finalPrompt = prompt ? `(${prompt}:1.4), ${userSpecificPrompt}` : userSpecificPrompt;
        negativePrompt += " (clothes:2.0), (dress:2.5), (fabric:2.0), (garments:2.0), (bra:2.0), (underwear:2.0), (bikini:2.0), (swimsuit:2.0), (visible clothing:2.0), changed pose, modified body, fake anatomy, modified face, swapped face, face distortion, plastic texture, airbrushed, cgi, flat look, oversaturated, modified background, (three legs, extra limbs, fused limbs:1.6), (original clothes:2.0), (visible fabric:2.0).";
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
                .select('api_key, status')
                .eq('provider', 'deapi')
                .eq('is_enabled', true);

            if (!error && keys && keys.length > 0) {
                // Prioritize 'active' keys, then unknown/others
                const sortedKeys = keys.sort((a, b) => {
                    if (a.status === 'active' && b.status !== 'active') return -1;
                    if (a.status !== 'active' && b.status === 'active') return 1;
                    return 0;
                });

                sortedKeys.forEach(k => {
                    if (k.api_key && k.api_key.trim()) {
                        dbKeys.push(k.api_key.trim());
                    }
                });
                console.log(`Loaded ${dbKeys.length} DeAPI keys from database (Prioritizing Active)`);
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
    if (envKeys.length > 0) {
        console.log(`Loaded ${envKeys.length} DeAPI keys from environment`);
    }

    // Merge and deduplicate while preserving order (Active DB keys first)
    const allKeys = [...new Set([...dbKeys, ...envKeys])];

    // Clean up expired blacklist items
    const now = Date.now();
    for (const [key, expiry] of blacklistTimes.entries()) {
        if (now > expiry) {
            sessionBlacklist.delete(key);
            blacklistTimes.delete(key);
        }
    }

    if (allKeys.length === 0) {
        console.warn("No DeAPI keys found in database or environment!");
    }

    const model = modelOverride || "Flux_2_Klein_4B_BF16";

    // Retry mechanism for rate limits
    let lastError = null;
    const maxRetries = 2; // Try the whole set of keys twice

    const blob = new Blob([initImgBuffer], { type: 'image/jpeg' });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Only shuffle the keys if this isn't the first attempt or if we want randomness.
        // For premium speed, we'll keep the ordered ones first if attempt === 0.
        const keysToTry = attempt === 0 ? allKeys : [...allKeys].sort(() => Math.random() - 0.5);

        for (let i = 0; i < keysToTry.length; i++) {
            const apiKey = keysToTry[i].trim();

            // FAST FAIL: Skip blacklisted keys immediately
            if (sessionBlacklist.has(apiKey)) {
                continue;
            }

            try {
                if (attempt > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay
                }

                // Shorter log
                process.stdout.write(`.`); // Loading indicator instead of long log

                // Try preferred model first
                let modelsToTry = [model, "flux-dev", "flux", "stable-diffusion-xl"];
                // Remover mode: Prefer Flux for identity, Qwen might be too strong
                if (mode === 'remover') {
                    modelsToTry = ["Flux_2_Klein_4B_BF16", "flux-dev", "flux"];
                }

                // Dynamic parameters based on mode for optimal results
                // REMOVER: Lower strength preserves MORE of the original image (especially the face)
                const guidance = mode === 'nude' ? 4.5 : (mode === 'remover' ? 2.5 : 3.0);
                const strength = mode === 'nude' ? 0.95 : (mode === 'remover' ? 0.38 : 0.55);
                const imageStrength = mode === 'nude' ? 0.1 : (mode === 'remover' ? 0.99 : 0.96);

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
                        // Blacklist for 5 minutes
                        sessionBlacklist.add(apiKey);
                        blacklistTimes.set(apiKey, Date.now() + 5 * 60 * 1000);

                        await trackUsage(apiKey, false, false, true, `Rate Limited (429)`);
                        lastError = new Error(`DeAPI key rate limited`);
                        break; // Exit model loop, try next key
                    }

                    if (response.status === 401) {
                        // Blacklist indefinitely (until restart)
                        sessionBlacklist.add(apiKey);
                        blacklistTimes.set(apiKey, Date.now() + 24 * 60 * 60 * 1000);

                        console.error(`\nDeAPI key is INVALID (401). Blacklisting...`);
                        lastError = new Error(`Invalid key`);
                        break;
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

                    console.log(`\n✓ DeAPI success with model ${currentModel}`);
                    const data = await response.json();
                    const requestId = data.data?.request_id || data.request_id;

                    if (!requestId) {
                        continue;
                    }

                    // Track successful request
                    const result = await pollStatus(requestId, apiKey);
                    await trackUsage(apiKey, true, false, false);
                    return result;
                }
            } catch (error) {
                // If it's a fetch failure, blacklist briefly
                if (error.message.includes('fetch failed')) {
                    sessionBlacklist.add(apiKey);
                    blacklistTimes.set(apiKey, Date.now() + 60 * 1000); // 1 min blacklist
                }
                lastError = error;
            }
        }
    }
    console.log(""); // New line after dots

    throw lastError || new Error("All DeAPI keys failed or were rate-limited. Please try again later.");
}

async function pollStatus(requestId, apiKey) {
    let attempts = 0;
    const maxAttempts = 40;
    let delay = 1500; // Reduced initial delay for faster feedback

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

            // Success call but not done yet
            if (attempts > 5 && delay < 2500) delay += 200; // Slightly increase delay if taking longer
            if (delay > 3000) delay = 3000;

        } catch (pollError) {
            console.warn(`Polling error: ${pollError.message}`);
        }
        attempts++;
    }
    throw new Error(`DeAPI timed out after reaching maximum polling attempts.`);
}
