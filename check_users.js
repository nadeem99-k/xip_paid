const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('--- Checking Users Table ---');

    // 1. Check columns
    const { data: columns, error: colError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (colError) {
        console.error('Error fetching columns:', colError.message);
    } else if (columns && columns.length > 0) {
        console.log('Columns found:', Object.keys(columns[0]).join(', '));
    } else {
        console.log('No users found to check columns.');
    }

    // 2. List recent users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, created_at, coins, role')
        .order('created_at', { ascending: false })
        .limit(10);

    if (userError) {
        console.error('Error fetching users:', userError.message);
    } else {
        console.log('\n--- Recent 10 Users ---');
        users.forEach(u => {
            console.log(`${u.created_at} | ${u.email} | Coins: ${u.coins} | Role: ${u.role}`);
        });
    }
}

checkUsers();
