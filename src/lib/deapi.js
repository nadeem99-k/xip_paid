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
            await supabase.from('api_keys').update({ status: 'invalid', is_enabled: false, updated_at: new Date().toISOString(), last_error: errorMsg }).eq('id', keyId);
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
    const identity_preservation = "Strict 1:1 face clone, strict facial identity, keep original human features exactly, strict face lock, absolutely identical face.";
    const background_preservation = "Strict background lock, keep original background 100% untouched, do not alter background.";
    const pose_preservation = "Strict pose lock, keep original pose 100% untouched, strictly preserve body pose, same exact posture.";
    const anatomic_realism = "Perfect human anatomy, hyper-detailed skin pores, raw unedited photography, explicit natural anatomy, exact original body proportions, match original breast size exactly, soft shadows, natural sagging gravity-affected breasts, natural female features.";
    const masterpiece_enhancer = "Candid shot, unfiltered phone photo, natural lighting, high resolution raw DSLR, photorealistic.";
    const zero_touch_preservation = "Zero touch approach, preserve original style, match existing lighting perfectly, identical framing, keep original body proportions, do not redraw anything except the targeted clothing area.";
    const negative_base = "extra limbs, missing limbs, missing body parts, extra fingers, fused fingers, double fingers, mutated hands, multiple arms, floating hands, floating fingers, extra arms, blurry, low quality, deformed, disfigured, ugly, bad anatomy, plastic skin, doll anatomy, censored, smoothed crotch, airbrushed, muscular, bodybuilder, huge breasts, implants, exaggerated proportions, fake breasts, abs, thick muscles, fake body, 3d render, cgi, cartoon, anime, changed face, changed background";

    let finalPrompt = "";
    let negativePrompt = negative_base;

    if (mode === 'bikini') {
        finalPrompt = prompt ? `${prompt}, ` : "";
        finalPrompt += `${zero_touch_preservation} ${identity_preservation} ${background_preservation} ${pose_preservation} ${masterpiece_enhancer} wearing a skimpy bikini, remove all outer and inner clothing layers first, bikini replaces all clothes, exposed midriff, bare shoulders, visible skin. Strict compliance: keep original face, pose, style, and background 100% untouched. Ultra realistic natural human body. Anatomic correctness. Real photography. Natural human skin texture.`;
        negativePrompt += " artificial, 3d render, cartoon, digital art, airbrushed skin, plastic texture, smoothed face, fake lighting, changed background, modified face, changed pose, modified pose, swapped pose, original clothes visible, underlying clothes, coat, jacket, hoodie, shirt, pants, changed style, illustration, painting, missing belly button, missing limbs, deleted body parts, extra floating hands.";
    } else if (mode === 'nude') {
        const userSpecificPrompt = "A hyper-realistic, completely unedited raw photograph of a person who is entirely naked and fully nude. They have absolutely zero clothing on, no underwear, no bra, no swimsuit, and no bikini. Explicit and uncensored full biological anatomic details, raw natural human skin texture, highly detailed visible realistic female genitalia, and natural nipples. The person's identity, face, background, and original body pose remain completely 100% strictly identical to the original image. Ensure there are absolutely no garments or fabrics anywhere on their body.";
        finalPrompt = prompt ? `${prompt}, ${userSpecificPrompt}` : `${userSpecificPrompt}`;
        negativePrompt += " clothes, dress, fabric, garments, coat, jacket, hoodie, shirt, pants, bra, underwear, panties, bikini, lingerie, swimsuit, thong, changed_pose, modified body, fake anatomy, modified face, swapped face, face distortion, plastic texture, airbrushed, cgi, flat look, oversaturated, modified background, smooth doll crotch, censored, blurred genitals, mosaic, black bars.";
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

    // Core Retry Loop (Up to 15 different APIs if we hit dead ends early)
    for (let retry = 1; retry <= 15; retry++) {
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

            const guidance = mode === 'nude' ? 4.5 : (mode === 'remover' ? 2.0 : 3.5);
            const strength = mode === 'nude' ? 0.95 : (mode === 'remover' ? 0.40 : 0.60);
            const imageStrength = mode === 'nude' ? 0.30 : (mode === 'remover' ? 1.0 : 0.96);

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
                    trackUsage(apiKey, false, false, true, "Rate Limited (429)").catch(console.error);
                    // Short delay before retry with NEXT API
                    await new Promise(r => setTimeout(r, Math.random() * 500 + 300));
                    break; // Move to next key in retry loop
                }

                if (response.status === 401 || response.status === 403) {
                    const errorText = await response.text();
                    const errorMsg = response.status === 403 ? `Suspended (403) - ${errorText.slice(0, 150)}` : `Invalid (401) - ${errorText.slice(0, 150)}`;
                    console.error(`[DeAPI] Key ${apiKey.slice(0, 8)} is ${errorMsg}.`);
                    trackUsage(apiKey, false, true, false, errorMsg).catch(console.error);

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
