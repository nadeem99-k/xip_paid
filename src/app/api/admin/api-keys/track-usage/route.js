import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
    try {
        const { api_key, success, failure, rate_limit } = await request.json();

        if (!api_key) {
            return Response.json({ success: false, error: 'API key is required' }, { status: 400 });
        }

        // Find the API key in the database
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .select('id, status')
            .eq('api_key', api_key)
            .single();

        if (keyError || !keyData) {
            // Key not in database, skip tracking
            return Response.json({ success: true, message: 'Key not tracked (not in database)' });
        }

        const keyId = keyData.id;

        // Update last_used_at timestamp
        await supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyId);

        // Update status based on response
        if (rate_limit) {
            await supabase
                .from('api_keys')
                .update({ status: 'rate_limited' })
                .eq('id', keyId);
        } else if (failure) {
            await supabase
                .from('api_keys')
                .update({ status: 'invalid' })
                .eq('id', keyId);
        } else if (success) {
            await supabase
                .from('api_keys')
                .update({ status: 'active' })
                .eq('id', keyId);
        }

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Upsert usage record for today
        const updateData = {};
        if (success) updateData.success_count = 1;
        if (failure) updateData.failure_count = 1;
        if (rate_limit) updateData.rate_limit_count = 1;

        // Try to get existing record for today
        const { data: existingUsage } = await supabase
            .from('api_key_usage')
            .select('*')
            .eq('api_key_id', keyId)
            .eq('request_date', today)
            .single();

        if (existingUsage) {
            // Update existing record
            const updates = {};
            if (success) updates.success_count = existingUsage.success_count + 1;
            if (failure) updates.failure_count = existingUsage.failure_count + 1;
            if (rate_limit) updates.rate_limit_count = existingUsage.rate_limit_count + 1;
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
                    rate_limit_count: rate_limit ? 1 : 0
                });
        }

        return Response.json({ success: true, message: 'Usage tracked successfully' });
    } catch (error) {
        console.error('Error tracking usage:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
