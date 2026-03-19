/**
 * In-memory concurrency manager for generations.
 * Limits:
 * - Global: 3 parallel generations
 * - Per User: 1 active generation
 */

// Global state in-memory (note: this is per-instance in serverless)
const activeGenerations = new Set(); // Set of user IDs
const queue = [];
const GLOBAL_LIMIT = 10;
const QUEUE_TIMEOUT_MS = 300000; // 5 minutes

export async function acquireSlot(userId) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const attempt = () => {
            // Check queue timeout
            if (Date.now() - startTime > QUEUE_TIMEOUT_MS) {
                reject(new Error("Queue timeout: No generation slot available after 2 minutes."));
                return true; // handled (as failure)
            }

            // Check per-user limit: If user already has an active generation, they MUST wait in queue
            // Even if global slots are available
            if (activeGenerations.has(userId)) {
                return false; // must wait
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
        console.log(`[Concurrency] Queuing request for user ${userId}. (Reason: ${activeGenerations.has(userId) ? 'User active' : 'Global limit reached'})`);
        queue.push({ userId, resolve, reject, attempt, startTime });

        // Safety: If somehow the queue gets stuck, we should eventually timeout the item
        setTimeout(() => {
            const index = queue.findIndex(item => item.startTime === startTime && item.userId === userId);
            if (index !== -1) {
                const item = queue[index];
                item.reject(new Error("Queue timeout: 2 minutes exceeded."));
                queue.splice(index, 1);
            }
        }, QUEUE_TIMEOUT_MS + 1000);
    });
}

export function releaseSlot(userId) {
    if (activeGenerations.has(userId)) {
        activeGenerations.delete(userId);
        console.log(`[Concurrency] Slot released for user ${userId}. Global active: ${activeGenerations.size}`);

        // Process queue after a slot is released
        processQueue();
    }
}

function processQueue() {
    if (queue.length === 0) return;

    console.log(`[Concurrency] Processing queue (Length: ${queue.length})...`);

    // Try to handle items from the queue
    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        // Check if timeout already occurred (item might have been rejected but still in list if setTimeout didn't fire yet)
        if (Date.now() - item.startTime > QUEUE_TIMEOUT_MS) {
            item.reject(new Error("Queue timeout: 2 minutes exceeded."));
            queue.splice(i, 1);
            i--;
            continue;
        }

        if (item.attempt()) {
            // If handled, remove from queue
            queue.splice(i, 1);
            i--; // Adjust index

            // If we reached global limit, stop processing for now (wait for next release)
            if (activeGenerations.size >= GLOBAL_LIMIT) break;
        }
    }
}
