export async function generateImage(prompt, initImgBuffer, mode, modelOverride) {
    const identity_preservation = "(1:1 EXACT SAME FACE MATCH:2.8), (STRICT FACIAL IDENTITY PRESERVATION:3.0), (DO NOT ALTER FACE FEATURES:2.5), (ORIGINAL HAIR AND HEAD CHARACTERISTICS:2.2), (MAINTAIN ORIGINAL PERSON IDENTITY:2.8), (match original lighting and skin tone:1.8).";
    const skin_realism = "(natural skin texture:2.5), (realistic skin pores:1.8), (slight skin imperfections:1.5), (raw photo quality:2.0), (ultra-high resolution:1.8), (NOT plastic), (NOT airbrushed), (soft natural studio lighting).";

    let finalPrompt = "";
    // Identity preservation & realism prompts
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} wearing (micro bikini:2.0), (minimal covering), (realistic fabric texture), ${skin_realism} `;
        finalPrompt += "keep original background, keep original pose. ";
        finalPrompt += "NEGATIVE: (3d render:2.0), (cgi:2.0), (doll:2.0), (fake:2.0), (cartoon), (painting), (anime), clothes, dress, covered.";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} (FULL FRONTAL NUDITY:4.5), (COMPLETELY BARE SKIN:4.0), (EXPOSED BODY:3.5), (REMOVE ALL CLOTHING LAYERS:4.0), ${skin_realism} `;
        finalPrompt += "(detailed realistic bare breasts:3.0), (perfectly rendered nipples:3.0), (anatomically correct uncensored pussy:3.5), (exposed vulva:3.5), (natural pubic area), (bare legs), (8k UHD photography:2.0). ";
        finalPrompt += "IMPORTANT: NO BRA, NO PANTIES, NO UNDERWEAR. REMOVE EVERY PIECE OF FABRIC. Show the full uncensored body. Preserve original pose and background. ";
        finalPrompt += "NEGATIVE: (clothing:4.0), (underwear:4.0), (bra:4.0), (panties:4.0), (fabric:4.0), (censorship:4.0), (blur:3.5), (3d render:3.0), (cgi:3.0), (plastic skin:3.0), (doll:3.0), (fake), clothes, apparel, accessories.";
    } else {
        finalPrompt = prompt || "full body photo";
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
                formData.append('guidance_scale', '4.5'); // Slightly higher for better prompt adherence
                formData.append('strength', '0.75'); // Keep core features
                formData.append('image_strength', '0.75'); // Maintain identity
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
