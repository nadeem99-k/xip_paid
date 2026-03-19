import { getAuthenticatedUser } from "@/lib/auth-helpers";

export async function GET(request) {
    try {
        // ✅ Real admin auth check
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get environment variable keys count
        const envKeys = (process.env.DEAPI_API_KEYS || process.env.DEAPI_API_KEY || "").split(',').filter(k => k.trim());

        return Response.json({
            success: true,
            env_keys_count: envKeys.length,
            env_keys_details: envKeys.map((k, i) => ({
                index: i + 1,
                preview: `...${k.slice(-8)}`,
                length: k.length
            }))
        });
    } catch (error) {
        console.error('Error fetching env info:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
