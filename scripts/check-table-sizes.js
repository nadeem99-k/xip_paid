const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSizes() {
  console.log('--- Table Sizes (Top 10) ---');
  const { data, error } = await supabase.rpc('get_table_sizes'); // Might not exist
  
  if (error) {
    // Fallback: try raw query if possible via unsafe SQL (Usually not allowed in JS client unless setup)
    console.error('Error checking sizes via RPC:', error.message);
    console.log('Trying fallback row counts...');
    
    const tables = ['users', 'api_keys', 'api_key_usage', 'system_settings'];
    for (const table of tables) {
        const { count, error: countErr } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (countErr) console.log(`${table}: Error - ${countErr.message}`);
        else console.log(`${table}: ${count} rows`);
    }
  } else {
    console.table(data);
  }
}

checkSizes();
