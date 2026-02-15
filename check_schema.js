import { supabase } from './src/lib/supabase.js';

async function checkSchema() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching users:', error.message);
        if (error.message.includes('column')) {
            console.log('It seems a column is missing or PostgREST cache is stale.');
        }
    } else {
        console.log('Columns in users table:', Object.keys(data[0] || {}).join(', '));
    }
}

checkSchema();
