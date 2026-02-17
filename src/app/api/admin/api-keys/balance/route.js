import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COST_PER_IMAGE = 0.00268; // Flux 1024x1024, 4 steps

export async function GET() {
    try {
        // Fetch all enabled DeAPI keys
        const { data: keys, error: keysError } = await supabase
            .from('api_keys')
            .select('id, api_key, provider')
            .eq('provider', 'deapi')
            .eq('is_enabled', true);

        if (keysError) {
            console.error('Error fetching API keys:', keysError);
            return NextResponse.json({ success: false, error: 'Failed to fetch API keys' }, { status: 500 });
        }

        const balancePromises = keys.map(async (key) => {
            try {
                const response = await fetch('https://api.deapi.ai/api/v1/client/balance', {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'Authorization': `Bearer ${key.api_key}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Some DeAPI endpoints wrap results in a data object
                    const balance = data.data?.balance ?? data.balance ?? data.data?.credits ?? data.credits ?? 0;
                    return {
                        id: key.id,
                        balance: balance,
                        images_left: Math.floor(balance / COST_PER_IMAGE),
                        success: true
                    };
                } else {
                    return {
                        id: key.id,
                        error: `Status ${response.status}`,
                        success: false
                    };
                }
            } catch (error) {
                return {
                    id: key.id,
                    error: error.message,
                    success: false
                };
            }
        });

        const balances = await Promise.all(balancePromises);

        return NextResponse.json({
            success: true,
            balances,
            cost_per_image: COST_PER_IMAGE
        });

    } catch (error) {
        console.error('Error in GET /api/admin/api-keys/balance:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
