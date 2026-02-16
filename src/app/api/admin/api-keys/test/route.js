import { NextResponse } from 'next/server';

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
                    return NextResponse.json({
                        success: false,
                        status: 'invalid',
                        message: 'API key is invalid (401 Unauthorized)'
                    });
                }

                if (response.status === 429) {
                    return NextResponse.json({
                        success: false,
                        status: 'rate_limited',
                        message: 'API key is rate limited (429)'
                    });
                }

                if (response.ok) {
                    return NextResponse.json({
                        success: true,
                        status: 'active',
                        message: `API is Valid! Status: ${response.status} OK`
                    });
                }

                return NextResponse.json({
                    success: false,
                    status: 'error',
                    message: `API returned status ${response.status}`
                });

            } catch (error) {
                return NextResponse.json({
                    success: false,
                    status: 'error',
                    message: `Test failed: ${error.message}`
                });
            }
        } else if (provider === 'gradio') {
            // Gradio doesn't have API keys in the same way
            return NextResponse.json({
                success: true,
                status: 'active',
                message: 'Gradio spaces are publicly accessible (no key validation needed)'
            });
        } else {
            return NextResponse.json({
                success: false,
                error: `Unknown provider: ${provider}`
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Error in POST /api/admin/api-keys/test:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
