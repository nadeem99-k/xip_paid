import { supabase } from '@/lib/supabase';

// In-memory state for API Pool Manager
const poolManager = {
    keys: new Map(), // api_key -> { backoffLevel, cooldownUntil, failCount }

    getKeyState(apiKey) {
        if (!this.keys.has(apiKey)) {
            this.keys.set(apiKey, { backoffLevel: 0, cooldownUntil: 0, failCount: 0 });
        }
        return this.keys.get(apiKey);
    },

    markRateLimited(apiKey) {
        const state = this.getKeyState(apiKey);
        state.backoffLevel++;
        const backoffSeconds = state.backoffLevel === 1 ? 30 : (state.backoffLevel === 2 ? 60 : 120);
        state.cooldownUntil = Date.now() + (backoffSeconds * 1000);
        console.log(`[PoolManager] 429 Rate Limit for ${apiKey.slice(0, 8)}. Level ${state.backoffLevel}, Cooldown: ${backoffSeconds}s`);
    },

    markSuccess(apiKey) {
        const state = this.getKeyState(apiKey);
        state.backoffLevel = 0;
        state.failCount = 0;
        state.cooldownUntil = 0;
    },

    markFailure(apiKey) {
        const state = this.getKeyState(apiKey);
        state.failCount++;
        console.log(`[PoolManager] Failure for ${apiKey.slice(0, 8)}. Consecutive fails: ${state.failCount}`);
        if (state.failCount >= 5) {
            console.error(`[PoolManager] Key ${apiKey.slice(0, 8)} disabled after 5 consecutive failures.`);
        }
    }
};

const FAILURE_THRESHOLD = 5;

// Helper function to track API key usage directly in DB
async function trackUsage(apiKey, success = false, failure = false, rateLimit = false, errorMsg = null) {
    if (!supabase) return;

    try {
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .select('id, status')
            .eq('api_key', apiKey)
            .single();

        if (keyError || !keyData) return;

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

        // Today's usage tracking
        const today = new Date().toISOString().split('T')[0];
        const { data: existingUsage } = await supabase
            .from('api_key_usage')
            .select('*')
            .eq('api_key_id', keyId)
            .eq('request_date', today)
            .single();

        if (existingUsage) {
            const updates = { updated_at: new Date().toISOString() };
            if (success) updates.success_count = (existingUsage.success_count || 0) + 1;
            if (failure) updates.failure_count = (existingUsage.failure_count || 0) + 1;
            if (rateLimit) updates.rate_limit_count = (existingUsage.rate_limit_count || 0) + 1;

            await supabase.from('api_key_usage').update(updates).eq('id', existingUsage.id);
        } else {
            await supabase.from('api_key_usage').insert({
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

async function selectBestKey(maxRetries = 5) {
    const now = Date.now();
    let attempt = 0;

    while (attempt < 5) { // Overall logic loop if no keys found
        try {
            const { data: keys, error } = await supabase
                .from('api_keys')
                .select('api_key, status, last_used_at')
                .eq('provider', 'deapi')
                .eq('is_enabled', true)
                .neq('status', 'invalid')
                .order('last_used_at', { ascending: true }); // LRU Strategy

            if (error) throw error;

            const candidates = keys.map(k => {
                const apiKey = k.api_key.trim();
                const state = poolManager.getKeyState(apiKey);
                return { apiKey, ...k, ...state };
            });

            // Filter out disabled keys (failCount >= 5)
            const available = candidates.filter(k => k.failCount < FAILURE_THRESHOLD);

            // Separate into Active and Cooling
            const active = available.filter(k => k.cooldownUntil <= now);
            const cooling = available.filter(k => k.cooldownUntil > now);

            if (active.length > 0) {
                // Return the LRU among active keys
                return active[0].apiKey;
            }

            if (cooling.length > 0) {
                // Find soonest available
                const soonest = cooling.sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];
                const waitTime = Math.max(0, soonest.cooldownUntil - now);
                console.log(`[PoolManager] No active keys. Waiting ${waitTime}ms for key ${soonest.apiKey.slice(0, 8)}`);
                await new Promise(r => setTimeout(r, waitTime));
                continue; // Re-evaluate
            }

            // If truly no keys, wait 3 seconds and retry
            console.warn(`[PoolManager] All APIs exhausted or cooling. Waiting 3s...`);
            await new Promise(r => setTimeout(r, 3000));
            attempt++;
        } catch (e) {
            console.error(`[PoolManager] Error selecting best key:`, e.message);
            await new Promise(r => setTimeout(r, 1000));
            attempt++;
        }
    }

    throw new Error("Timeout: No API keys available after multiple retry attempts.");
}

export async function generateImage(prompt, initImgBuffer, mode, modelOverride) {
    const identity_preservation = "(STRICT 1:1 FACE CLONE:1.5), (STRICT FACIAL IDENTITY:1.4), (KEEP ORIGINAL HUMAN FEATURES:1.3), (STRICT FACE LOCK:1.4), (IDENTICAL FACE:1.5), (SINGLE PERSON ONLY:1.5), (ONLY ONE PERSON:1.5). (PROHIBIT EXTRA PEOPLE:1.5).";
    const background_preservation = "(STRICT BACKGROUND LOCK:1.5), (KEEP ORIGINAL BACKGROUND 100% UNTOUCHED:1.5), (DO NOT ALTER BACKGROUND:1.4).";
    const pose_preservation = "(STRICT POSE LOCK:1.5), (KEEP ORIGINAL POSE 100% UNTOUCHED:1.5), (STRICTLY PRESERVE BODY POSE:1.5), (SAME POSE:1.5), (SINGLE PERSON POSE:1.4).";
    const anatomic_realism = "(perfect human anatomy:1.4), (hyper-detailed skin pores:1.4), (raw unedited photography:1.5), (explicit natural anatomy:1.5), (highly detailed pussy, visible realistic vagina:2.5), (detailed realistic nipples:2.5), (EXACT ORIGINAL BODY PROPORTIONS:2.0), (match original breast size exactly:2.0), (soft shadows:1.2), (natural sagging, gravity-affected breasts:1.5), (natural female features:1.5).";
    const masterpiece_enhancer = "(candid shot:1.3), (unfiltered phone photo:1.4), (natural lighting:1.2), (high resolution raw dslr:1.2), (photorealistic:1.3).";
    const zero_touch_preservation = "(ZERO TOUCH:1.2), (PRESERVE ORIGINAL STYLE:1.2), (MATCH EXISTING LIGHTING:1.2), (IDENTICAL FRAMING:1.2), (KEEP ORIGINAL BODY PROPORTIONS:1.2), (DO NOT REDRAW ANYTHING EXCEPT CLOTHING AREA:1.5).";
    const negative_base = "(extra limbs:2.5), (missing limbs:2.5), (missing body parts:2.5), (extra fingers:2.5), (fused fingers:2.5), (double fingers:2.5), (mutated hands:2.5), (extra legs, extra arms, three legs, fused bodies, connected persons, mutated anatomy, deformed body:1.5), (multiple people, group of people, twins, clones:1.6), blurry, low quality, deformed, disfigured, ugly, bad anatomy, (plastic skin:2.5), (doll anatomy:2.5), (censored:2.5), (smoothed crotch:2.5), (airbrushed:1.5), (muscular:2.0), (bodybuilder:2.0), (huge breasts:2.0), (implants:2.0), (exaggerated proportions:2.0), (fake breasts:2.0), (enhanced body:2.0), (abs:1.5), (thick muscles:1.5), fake body, 3d render, cgi, cartoon, anime, (changed face:1.5), (changed background:1.5), (extra heads:1.5).";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.4), ` : "";
        finalPrompt += `${zero_touch_preservation} ${identity_preservation} ${background_preservation} ${pose_preservation} ${masterpiece_enhancer} (wearing a bikini:1.6), (FORCED BIKINI CHANGE:1.6). (STRICT COMPLIANCE: KEEP ORIGINAL FACE, POSE, STYLE, AND BACKGROUND 100% UNTOUCHED:1.8). (Ultra realistic natural human body:1.4). (Anatomic correctness:1.5). Real photography.`;
        negativePrompt += " artificial, 3d render, cartoon, digital art, airbrushed skin, plastic texture, smoothed face, fake lighting, changed background, modified face, changed pose, modified pose, swapped pose, (original clothes visible:1.6), (underlying clothes:1.6), changed style, illustration, painting, (missing belly button:2.5), (missing limbs:2.5), (deleted body parts:2.5).";
    } else if (mode === 'nude') {
        const userSpecificPrompt = "[ACTION]: REMOVE CLOTHES ONLY. UNDRESS GIRL. REMOVE ALL CLOTHING LAYERS. [RESULT]: NUDE BODY. BARE SKIN. (EXPLICIT UNCENSORED ANATOMY:2.5). (HIGHLY DETAILED VAGINA AND NIPPLES:2.5). [IMPORTANT]: (DO NOT CHANGE SKIN COLOR). (ADAPT TO ANY IMAGE STYLE:1.5). (DO NOT REDRAW ANYTHING EXCEPT CLOTHING AREA:1.5). JUST REMOVE CLOTHES. (HYPER-REALISTIC BIOLOGICAL DETAIL:2.5)";
        finalPrompt = prompt ? `(${prompt}:1.4), ${userSpecificPrompt}, ${anatomic_realism}` : `${userSpecificPrompt}, ${anatomic_realism}`;
        negativePrompt += " (clothes:2.0), (dress:2.5), (fabric:2.0), (garments:2.0), (bra:2.0), (underlining clothes:2.0), (underwear:2.0), (bikini:2.0), (swimsuit:2.0), changed_pose, modified body, fake anatomy, modified face, swapped face, face distortion, (plastic texture:2.5), (airbrushed:2.5), cgi, flat look, oversaturated, modified background, (three legs, extra limbs, fused limbs:1.6), (original clothes:2.0), (visible fabric:2.0), new environment, cropped photo, weird lighting, (smooth doll crotch:2.5), (censored:2.5).";
    } else if (mode === 'remover') {
        const remove_instruction = "[ACTION]: STRICTLY REMOVE ONLY MASKS, STICKERS, AND EMOJIS. REVEAL REAL HUMAN FACE UNDERNEATH. 0 TOUCHING TO ORIGINAL UNCOVERED PARTS. DO NOT REDRAW OR MODIFY THE UNDERLYING FACE.";
        finalPrompt = `${remove_instruction} ${identity_preservation} ${background_preservation} ${masterpiece_enhancer} Perfect 1:1 facial identity restoration. Same eyes, same nose, same lips. Exactly the same person, just without the mask/sticker.`;
        negativePrompt += " mask, sticker, emoji, drawn overlay, changed face, altered identity, modified eyes, modified lips, changed background, plastic skin, blurred details, distortion.";
    } else {
        finalPrompt = prompt || "full body photo";
    }

    const model = modelOverride || "Flux_2_Klein_4B_BF16";
    const blob = new Blob([initImgBuffer], { type: 'image/jpeg' });
    let lastError = null;

    const usedKeys = new Set();

    // Core Retry Loop (Up to 5 different APIs)
    for (let retry = 1; retry <= 5; retry++) {
        let apiKey;
        try {
            apiKey = await selectBestKey();
            // If we already used this key in this specific generation attempt, force it to cool down
            // so we can grab a DIFFERENT key on the next iteration instead of just burning the same key.
            if (usedKeys.has(apiKey)) {
                console.log(`[DeAPI] Key ${apiKey.slice(0, 8)} already tried. Artificially cooling down to force rotation.`);
                poolManager.markRateLimited(apiKey); // Puts it on ice for 60s
                continue; // Move to next retry attempt, guaranteed to get a new key
            }
            usedKeys.add(apiKey);
        } catch (e) {
            throw e; // No keys available
        }

        try {
            console.log(`[DeAPI] Generation Attempt ${retry} with key ${apiKey.slice(0, 8)}...`);

            let modelsToTry = [model, "flux-dev", "flux", "stable-diffusion-xl"];
            if (mode === 'remover') modelsToTry = ["Flux_2_Klein_4B_BF16", "flux-dev", "flux"];

            const guidance = mode === 'nude' ? 4.5 : (mode === 'remover' ? 2.0 : 3.0);
            const strength = mode === 'nude' ? 0.95 : (mode === 'remover' ? 0.40 : 0.55);
            const imageStrength = mode === 'nude' ? 0.1 : (mode === 'remover' ? 1.0 : 0.96);

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
                formData.append('image_strength', imageStrength.toString());
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
                    poolManager.markRateLimited(apiKey);
                    await trackUsage(apiKey, false, false, true, "Rate Limited (429)");
                    // Short delay before retry with NEXT API
                    await new Promise(r => setTimeout(r, Math.random() * 500 + 300));
                    break; // Move to next key in retry loop
                }

                if (response.status === 401 || response.status === 403) {
                    const errorMsg = response.status === 403 ? "Suspended (403)" : "Invalid (401)";
                    console.error(`[DeAPI] Key ${apiKey.slice(0, 8)} is ${errorMsg}.`);
                    await trackUsage(apiKey, false, true, false, errorMsg);

                    // Force pool manager to disable this key immediately
                    const state = poolManager.getKeyState(apiKey);
                    state.failCount = FAILURE_THRESHOLD;

                    lastError = new Error(`DeAPI API Key ${errorMsg}`);
                    break; // Move to next key
                }

                if (response.status === 422) continue; // Try next model

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[DeAPI] Error ${response.status}: ${errorText}`);
                    poolManager.markFailure(apiKey);

                    const state = poolManager.getKeyState(apiKey);
                    if (state.failCount >= FAILURE_THRESHOLD) {
                        await trackUsage(apiKey, false, true, false, `Failed ${state.failCount} times: ${errorText.slice(0, 50)}`);
                    } else {
                        await trackUsage(apiKey, false, false, false, `Error ${response.status}: ${errorText.slice(0, 50)}`);
                    }
                    break; // Move to next key
                }

                // Success!
                console.log(`[DeAPI] Success with model ${currentModel}`);
                const data = await response.json();
                const requestId = data.data?.request_id || data.request_id;

                if (!requestId) continue;

                const result = await pollStatus(requestId, apiKey);
                poolManager.markSuccess(apiKey);
                await trackUsage(apiKey, true, false, false);
                return result;
            }
        } catch (error) {
            console.error(`[DeAPI] Unexpected error with key ${apiKey.slice(0, 8)}:`, error.message);
            lastError = error;
            poolManager.markFailure(apiKey);
            await new Promise(r => setTimeout(r, 500));
        }
    }

    throw lastError || new Error("All DeAPI keys exhausted, rate-limited, or failed after 5 retries.");
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
