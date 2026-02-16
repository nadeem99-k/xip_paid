import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Admin authentication check
function isAdmin(request) {
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    const authHeader = request.headers.get('authorization');
    // In a real app, verify the user's session/token
    // For now, we'll rely on the frontend admin check
    return true; // Rely on frontend auth for now
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch all API keys with usage statistics
export async function GET(request) {
    try {
        // Fetch all API keys
        const { data: keys, error: keysError } = await supabase
            .from('api_keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (keysError) {
            console.error('Error fetching API keys:', keysError);
            return NextResponse.json({ success: false, error: 'Failed to fetch API keys' }, { status: 500 });
        }

        // Fetch usage statistics for each key
        const keysWithStats = await Promise.all(keys.map(async (key) => {
            // Get total usage
            const { data: totalUsage } = await supabase
                .from('api_key_usage')
                .select('success_count, failure_count, rate_limit_count')
                .eq('api_key_id', key.id);

            // Get today's usage
            const today = new Date().toISOString().split('T')[0];
            const { data: todayUsage } = await supabase
                .from('api_key_usage')
                .select('success_count, failure_count, rate_limit_count')
                .eq('api_key_id', key.id)
                .eq('request_date', today)
                .single();

            const totalSuccess = totalUsage?.reduce((sum, u) => sum + (u.success_count || 0), 0) || 0;
            const totalFailure = totalUsage?.reduce((sum, u) => sum + (u.failure_count || 0), 0) || 0;
            const totalRateLimit = totalUsage?.reduce((sum, u) => sum + (u.rate_limit_count || 0), 0) || 0;
            const totalRequests = totalSuccess + totalFailure + totalRateLimit;

            const todaySuccess = todayUsage?.success_count || 0;
            const todayFailure = todayUsage?.failure_count || 0;
            const todayRateLimit = todayUsage?.rate_limit_count || 0;
            const todayRequests = todaySuccess + todayFailure + todayRateLimit;

            const remainingTotal = key.total_limit ? Math.max(0, key.total_limit - totalRequests) : null;
            const remainingDaily = key.daily_limit ? Math.max(0, key.daily_limit - todayRequests) : null;

            return {
                ...key,
                usage: {
                    total: {
                        requests: totalRequests,
                        success: totalSuccess,
                        failure: totalFailure,
                        rate_limit: totalRateLimit,
                        remaining: remainingTotal
                    },
                    today: {
                        requests: todayRequests,
                        success: todaySuccess,
                        failure: todayFailure,
                        rate_limit: todayRateLimit,
                        remaining: remainingDaily
                    }
                }
            };
        }));

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
