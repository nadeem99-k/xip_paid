import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST - Test an API key to see if it works
export async function POST(request) {
    try {
        const body = await request.json();
        const { provider, api_key } = body;

        if (!provider || !api_key) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: provider, api_key'
            }, { status: 400 });
        }

        let testResult = { success: false, status: 'error', message: '' };

        if (provider === 'deapi') {
            // Test DeAPI key with a simple request
            try {
                const response = await fetch('https://api.deapi.ai/api/v1/client/models', {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'Authorization': `Bearer ${api_key}`
                    }
                });

                if (response.status === 401) {
                    testResult = {
                        success: false,
                        status: 'invalid',
                        message: 'API key is invalid (401 Unauthorized)'
                    };
                } else if (response.status === 429) {
                    testResult = {
                        success: false,
                        status: 'rate_limited',
                        message: 'API key is rate limited (429)'
                    };
                } else if (response.ok) {
                    testResult = {
                        success: true,
                        status: 'active',
                        message: `API is Valid! Status: ${response.status} OK`
                    };
                } else {
                    testResult = {
                        success: false,
                        status: 'error',
                        message: `API returned status ${response.status}`
                    };
                }

            } catch (error) {
                testResult = {
                    success: false,
                    status: 'error',
                    message: `Test failed: ${error.message}`
                };
            }
        } else if (provider === 'gradio') {
            // Gradio doesn't have API keys in the same way
            testResult = {
                success: true,
                status: 'active',
                message: 'Gradio spaces are publicly accessible (no key validation needed)'
            };
        } else {
            return NextResponse.json({
                success: false,
                error: `Unknown provider: ${provider}`
            }, { status: 400 });
        }

        // Sync status to database if result is definitive (active, invalid, rate_limited)
        console.log(`Test result for key ${api_key.slice(-8)}: ${testResult.status} (Success: ${testResult.success})`);

        if (['active', 'invalid', 'rate_limited'].includes(testResult.status)) {
            try {
                const { data, error } = await supabase
                    .from('api_keys')
                    .update({
                        status: testResult.status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('api_key', api_key.trim())
                    .select();

                if (error) {
                    console.error('Database update error:', error);
                } else if (!data || data.length === 0) {
                    console.warn(`No record found in DB for api_key: ...${api_key.slice(-8)}`);
                } else {
                    console.log(`Successfully updated status to ${testResult.status} for key ...${api_key.slice(-8)}`);
                }
            } catch (dbError) {
                console.error('Failed to sync API key status to DB:', dbError);
            }
        }

        return NextResponse.json(testResult);

    } catch (error) {
        console.error('Error in POST /api/admin/api-keys/test:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
