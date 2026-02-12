export async function generateImage(prompt, initImgBuffer, mode, modelOverride) {
    const identity_preservation = "(1:1 EXACT SAME FACE MATCH:3.8), (STRICT FACIAL IDENTITY PRESERVATION:3.8), (DO NOT ALTER FACE FEATURES:3.5), (MAINTAIN ORIGINAL PERSON IDENTITY:3.8), (EXACT SKIN TONE MATCH:2.8).";
    const structure_preservation = "(STRICTLY KEEP ORIGINAL POSE:4.5), (PRESERVE ORIGINAL BODY SHAPE:4.5), (DO NOT CHANGE BODY PROPORTIONS:4.0), (MAINTAIN ORIGINAL VIEWING DISTANCE:4.0), (KEEP ORIGINAL FRAMING:4.0).";
    const anatomical_integrity = "(STRICT ANATOMICAL ACCURACY:4.5), (PRESERVE ORIGINAL HANDS AND FINGERS:4.5), (EXACT NUMBER OF FINGERS:4.5), (NO EXTRA DIGITS:4.5), (NO MUTATED LIMBS:4.0), (KEEP ORIGINAL LIMB STRUCTURE:4.0).";
    const skin_realism = "(natural skin texture:3.0), (ultra-realistic skin pores:2.5), (slight skin imperfections:2.2), (raw photo quality:3.0), (ultra-high resolution photograph:2.8), (NOT plastic), (NOT airbrushed).";

    let finalPrompt = "";
    // Identity, Structure & Anatomy preservation
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} ${structure_preservation} ${anatomical_integrity} wearing (high-end micro bikini:3.5), (luxurious minimalist bikini:3.0), (realistic fabric-to-skin contact:2.0), ${skin_realism} `;
        finalPrompt += "STRICTLY keep original background, keep original pose, keep original style, keep original hands and fingers. ";
        finalPrompt += "NEGATIVE: (3d render:3.5), (cgi:3.5), (doll:3.5), (fake:3.5), (cartoon:3.0), (anime), (zoom:4.5), (close-up:4.5), (extra fingers:4.5), (mutated hands:4.5), (fused fingers:4.5), (cut parts:4.5), (missing limbs:4.5), (deformed extremities:4.5), clothes, apparel.";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} ${structure_preservation} ${anatomical_integrity} (COMPLETELY UNDRESSED:4.8), (CLOTHES REMOVED:4.5), (NATURAL NAKED STATE:4.8), (EXPOSED FULL BODY:3.8), ${skin_realism} `;
        finalPrompt += "(detailed realistic bare breasts:3.5), (perfectly rendered nipples:3.2), (anatomically accurate uncensored vulva:4.0), (natural pubic area), (bare legs), (professional high-end photography:2.8). ";
        finalPrompt += "IMPORTANT: NO BRA, NO PANTIES, NO UNDERWEAR. REMOVE EVERY PIECE OF FABRIC. Change ONLY clothes to skin. Keep original body structure and hands identical. ";
        finalPrompt += "NEGATIVE: (clothing:4.8), (underwear:4.8), (bra:4.8), (panties:4.8), (fabric:4.8), (censorship:4.8), (extra fingers:4.8), (mutated hands:4.8), (fused fingers:4.8), (cut parts:4.8), (missing limbs:4.8), (deformed extremities:4.8), (zoomed in:4.8), (plastic skin:3.5), (fake body:4.5).";
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
