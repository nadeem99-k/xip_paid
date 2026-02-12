export async function generateImage(prompt, initImgBuffer, mode, modelOverride) {
    const identity_preservation = "(1:1 EXACT SAME FACE MATCH:3.5), (STRICT FACIAL IDENTITY PRESERVATION:3.5), (DO NOT ALTER FACE FEATURES:3.0), (MAINTAIN ORIGINAL PERSON IDENTITY:3.5), (EXACT SKIN TONE MATCH:2.5).";
    const structure_preservation = "(STRICTLY KEEP ORIGINAL POSE:4.0), (PRESERVE ORIGINAL BODY SHAPE:4.0), (DO NOT CHANGE BODY PROPORTIONS:3.5), (MAINTAIN ORIGINAL VIEWING DISTANCE:3.5), (KEEP ORIGINAL FRAMING:3.5), (STAY AT ORIGINAL DISTANCE:3.5).";
    const skin_realism = "(natural skin texture:3.0), (ultra-realistic skin pores:2.5), (slight skin imperfections:2.0), (raw photo quality:2.8), (ultra-high resolution photograph:2.5), (NOT plastic), (NOT airbrushed), (soft natural lighting).";

    let finalPrompt = "";
    // Identity & Structure preservation
    if (mode === 'bikini') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} ${structure_preservation} wearing (micro bikini dress:3.0), (thin strings:1.5), (realistic fabric-to-skin contact), ${skin_realism} `;
        finalPrompt += "STRICTLY keep original background, keep original pose, keep original style. ";
        finalPrompt += "NEGATIVE: (3d render:3.0), (cgi:3.0), (doll:3.0), (fake:3.0), (cartoon:2.5), (painting), (anime), (zoom:4.5), (close-up:4.5), (enlarged face:3.5), (distorted body:3.5), clothes, dress, covered.";
    } else if (mode === 'nude') {
        finalPrompt = prompt ? `(${prompt}:1.8), ` : "";
        finalPrompt += `${identity_preservation} ${structure_preservation} (COMPLETELY UNDRESSED:4.5), (CLOTHES REMOVED:4.0), (NATURAL NAKED STATE:4.5), (EXPOSED FULL BODY:3.5), ${skin_realism} `;
        finalPrompt += "(detailed realistic bare breasts:3.5), (perfectly rendered nipples:3.2), (anatomically accurate uncensored vulva:3.8), (natural pubic area), (bare legs), (professional high-end photography:2.5). ";
        finalPrompt += "IMPORTANT: NO BRA, NO PANTIES, NO UNDERWEAR. REMOVE EVERY PIECE OF FABRIC. Change ONLY the clothes to skin. Keep EVERYTHING else identical to the original image. ";
        finalPrompt += "NEGATIVE: (clothing:4.5), (underwear:4.5), (bra:4.5), (panties:4.5), (fabric:4.5), (censorship:4.5), (blur:4.0), (3d render:3.5), (cgi:3.5), (plastic skin:3.5), (doll:3.5), (fake body:4.0), (zoomed in:4.5), (close-up:4.5), (distorted body:4.0), clothes, apparel, accessories.";
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
