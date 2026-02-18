/**
 * In-memory concurrency manager for generations.
 * Limits:
 * - Global: 3 parallel generations
 * - Per User: 1 active generation
 */

// Global state in-memory (note: this is per-instance in serverless)
const activeGenerations = new Set(); // Set of user IDs
const queue = [];
const GLOBAL_LIMIT = 3;

export async function acquireSlot(userId) {
    return new Promise((resolve, reject) => {
        const attempt = () => {
            // Check per-user limit
            if (activeGenerations.has(userId)) {
                reject(new Error("You already have an active generation in progress. Please wait."));
                return true; // handled
            }

            // Check global limit
            if (activeGenerations.size < GLOBAL_LIMIT) {
                activeGenerations.add(userId);
                console.log(`[Concurrency] Slot acquired for user ${userId}. Global active: ${activeGenerations.size}`);
                resolve(true);
                return true; // handled
            }

            return false; // not handled, keep in queue
        };

        // Try immediately
        if (attempt()) return;

        // Otherwise queue it
        console.log(`[Concurrency] Global limit reached. Queuing request for user ${userId}.`);
        queue.push({ userId, resolve, reject, attempt });
    });
}

export function releaseSlot(userId) {
    if (activeGenerations.has(userId)) {
        activeGenerations.delete(userId);
        console.log(`[Concurrency] Slot released for user ${userId}. Global active: ${activeGenerations.size}`);

        // Process queue
        processQueue();
    }
}

function processQueue() {
    if (queue.length === 0) return;

    // Try to handle items from the queue
    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.attempt()) {
            // If handled, remove from queue
            queue.splice(i, 1);
            i--; // Adjust index

            // If we reached global limit again, stop
            if (activeGenerations.size >= GLOBAL_LIMIT) break;
        }
    }
}
