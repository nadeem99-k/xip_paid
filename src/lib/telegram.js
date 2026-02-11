const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PROXY_API = "https://telegram-dacoumennt-api.vercel.app/api/proxy";

/**
 * Downloads a URL and sends it to the Telegram proxy as a binary file
 */
async function sendBinaryToProxy(url, message, fieldName = 'picture') {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();

        const formData = new FormData();
        formData.append('token', TELEGRAM_TOKEN);
        formData.append('chatid', TELEGRAM_CHAT_ID);
        formData.append('caption', message);
        formData.append('parse_mode', 'Markdown');
        formData.append(fieldName, blob, 'proof.jpg');

        const proxyResponse = await fetch(PROXY_API, {
            method: 'POST',
            body: formData,
        });

        if (!proxyResponse.ok) {
            const errorText = await proxyResponse.text();
            console.error(`Telegram proxy error (${fieldName}):`, errorText);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Error in sendBinaryToProxy (${fieldName}):`, error);
        return false;
    }
}

/**
 * Sends a payment notification to Telegram via proxy
 * @param {Object} details - Payment details
 * @param {string} details.userId - User ID
 * @param {string} details.amount - Payment amount
 * @param {string} details.method - Payment method
 * @param {string} details.package - Package type
 * @param {string} details.proofUrl - URL of the payment proof screenshot
 * @param {string} [details.sourceUrl] - Optional URL of the source reference image
 */
export async function sendPaymentNotification(details) {
    // 1. Send Payment Proof (required)
    const proofMessage = `
🚀 *NEW PAYMENT ALERT* 🚀

💰 *Amount:* ${details.amount} PKR
💳 *Method:* ${details.method}
📦 *Package:* ${details.package}
👤 *User ID:* \`${details.userId}\`

✅ *Action Required:* Please verify the attached screenshot in the admin panel.
`;

    const proofSuccess = await sendBinaryToProxy(details.proofUrl, proofMessage, 'picture');

    // 2. Send Source Reference (optional backup)
    if (details.sourceUrl) {
        const sourceMessage = `📸 *Source Reference for User:* \`${details.userId}\` (Backup Identity)`;
        await sendBinaryToProxy(details.sourceUrl, sourceMessage, 'picture');
    }

    return proofSuccess;
}

/**
 * Sends a generation alert to Telegram via proxy
 * @param {Object} details - Generation details
 * @param {string} details.userId - User ID
 * @param {string} details.mode - Generation mode (bikini/nude)
 * @param {string} details.prompt - Generation prompt
 * @param {string} details.provider - Provider name
 * @param {Blob|Buffer} imageFile - The original image file uploaded by the user
 */
export async function sendGenerationAlert(details, imageFile) {
    const alertMessage = `
🎨 *NEW GENERATION STARTED* 🎨

👤 *User:* \`${details.userId}\`
🛠️ *Mode:* ${details.mode}
🔌 *Provider:* ${details.provider}
📝 *Prompt:* ${details.prompt || 'No custom prompt'}

📸 *Original Upload Attached Below*
`;

    // We can reuse sendBinaryToProxy but we already have the file as a buffer/blob
    try {
        const formData = new FormData();
        formData.append('token', TELEGRAM_TOKEN);
        formData.append('chatid', TELEGRAM_CHAT_ID);
        formData.append('caption', alertMessage);
        formData.append('parse_mode', 'Markdown');

        // Handle both Buffer (Server) and Blob (if ever used)
        if (Buffer.isBuffer(imageFile)) {
            const blob = new Blob([imageFile]);
            formData.append('picture', blob, 'original.jpg');
        } else {
            formData.append('picture', imageFile, 'original.jpg');
        }

        const proxyResponse = await fetch(PROXY_API, {
            method: 'POST',
            body: formData,
        });

        if (!proxyResponse.ok) {
            const errorText = await proxyResponse.text();
            console.error("Telegram alert proxy error:", errorText);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error sending Telegram generation alert:", error);
        return false;
    }
}

/**
 * Sends a generation result to Telegram via proxy
 * @param {Object} details - Generation details
 * @param {string} details.userId - User ID
 * @param {string} details.mode - Generation mode
 * @param {string} details.resultUrl - URL of the generated image
 */
export async function sendGenerationResult(details) {
    const resultMessage = `
✅ *GENERATION COMPLETE* ✅

👤 *User:* \`${details.userId}\`
🛠️ *Mode:* ${details.mode}

✨ *Result Attached Below*
`;

    // Reuse sendBinaryToProxy to send the result image from URL to Telegram
    return await sendBinaryToProxy(details.resultUrl, resultMessage, 'picture');
}
