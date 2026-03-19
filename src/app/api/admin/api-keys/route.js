import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-helpers";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch all API keys with usage statistics
export async function GET(request) {
    try {
        // ✅ Real admin auth check
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all API keys
        const { data: keys, error: keysError } = await supabase
            .from('api_keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (keysError) {
            console.error('Error fetching API keys:', keysError);
            return NextResponse.json({ success: false, error: 'Failed to fetch API keys' }, { status: 500 });
        }

        const keyIds = keys.map(k => k.id);
        const today = new Date().toISOString().split('T')[0];

        // ✅ Single query for ALL usage stats (no N+1)
        const { data: allUsage } = await supabase
            .from('api_key_usage')
            .select('api_key_id, request_date, success_count, failure_count, rate_limit_count')
            .in('api_key_id', keyIds);

        // Group usage by key id
        const usageByKey = {};
        for (const u of allUsage || []) {
            if (!usageByKey[u.api_key_id]) usageByKey[u.api_key_id] = { total: [], today: null };
            usageByKey[u.api_key_id].total.push(u);
            if (u.request_date === today) usageByKey[u.api_key_id].today = u;
        }

        const keysWithStats = keys.map((key) => {
            const usage = usageByKey[key.id] || { total: [], today: null };

            const totalSuccess = usage.total.reduce((sum, u) => sum + (u.success_count || 0), 0);
            const totalFailure = usage.total.reduce((sum, u) => sum + (u.failure_count || 0), 0);
            const totalRateLimit = usage.total.reduce((sum, u) => sum + (u.rate_limit_count || 0), 0);
            const totalRequests = totalSuccess + totalFailure + totalRateLimit;

            const todaySuccess = usage.today?.success_count || 0;
            const todayFailure = usage.today?.failure_count || 0;
            const todayRateLimit = usage.today?.rate_limit_count || 0;
            const todayRequests = todaySuccess + todayFailure + todayRateLimit;

            const remainingTotal = key.total_limit ? Math.max(0, key.total_limit - totalRequests) : null;
            const remainingDaily = key.daily_limit ? Math.max(0, key.daily_limit - todayRequests) : null;

            return {
                ...key,
                usage: {
                    total: { requests: totalRequests, success: totalSuccess, failure: totalFailure, rate_limit: totalRateLimit, remaining: remainingTotal },
                    today: { requests: todayRequests, success: todaySuccess, failure: todayFailure, rate_limit: todayRateLimit, remaining: remainingDaily }
                }
            };
        });

        return NextResponse.json({
            success: true,
            keys: keysWithStats,
            total: keysWithStats.length
        });

    } catch (error) {
        console.error('Error in GET /api/admin/api-keys:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST - Create or update an API key
export async function POST(request) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const { id, provider, key_name, api_key, daily_limit, total_limit, is_enabled, status } = body;

        // Validation
        if (!provider || !key_name || !api_key) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: provider, key_name, api_key'
            }, { status: 400 });
        }

        if (id) {
            // Update existing key
            const updateData = {
                provider,
                key_name,
                api_key,
                daily_limit: daily_limit || null,
                total_limit: total_limit || null,
                is_enabled: is_enabled !== undefined ? is_enabled : true,
                updated_at: new Date().toISOString()
            };

            if (status) {
                updateData.status = status;
            }

            const { data, error } = await supabase
                .from('api_keys')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating API key:', error);
                return NextResponse.json({ success: false, error: 'Failed to update API key' }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'API key updated successfully',
                key: data
            });

        } else {
            // Create new key
            const { data, error } = await supabase
                .from('api_keys')
                .insert([{
                    provider,
                    key_name,
                    api_key,
                    daily_limit: daily_limit || null,
                    total_limit: total_limit || null,
                    is_enabled: is_enabled !== undefined ? is_enabled : true,
                    status: 'active'
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating API key:', error);
                return NextResponse.json({
                    success: false,
                    error: `Database Error: ${error.message || error.code || JSON.stringify(error)}`
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'API key created successfully',
                key: data
            });
        }

    } catch (error) {
        console.error('Error in POST /api/admin/api-keys:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE - Delete an API key
export async function DELETE(request) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'admin') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Missing required field: id'
            }, { status: 400 });
        }

        const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting API key:', error);
            return NextResponse.json({ success: false, error: 'Failed to delete API key' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'API key deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /api/admin/api-keys:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
