const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.join(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
        }
    });
    return env;
}

const env = getEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Testing connection to:', supabaseUrl);
    const { data, error } = await supabase.from('users').select('*').limit(1);

    if (error) {
        console.error('Error:', error.message);
        console.error('Full Error:', JSON.stringify(error, null, 2));
    } else {
        if (data && data.length > 0) {
            console.log('SUCCESS! Columns found:', Object.keys(data[0]).join(', '));
        } else {
            console.log('SUCCESS! Connection works but table is empty.');
            // Try to force an error by selecting a non-existent column
            const { error: error2 } = await supabase.from('users').select('referral_code').limit(1);
            if (error2) console.error('referral_code check failed:', error2.message);
            else console.log('referral_code column EXISTS.');
        }
    }
}

check();
