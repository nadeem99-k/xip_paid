const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  console.log('--- Supabase Storage Cleanup ---');

  // 1. Cleanup API Key Usage Logs (Keep only last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const dateStr = threeDaysAgo.toISOString().split('T')[0];

  console.log(`Cleaning api_key_usage older than ${dateStr}...`);
  const { count, error } = await supabase
    .from('api_key_usage')
    .delete({ count: 'exact' })
    .lt('request_date', dateStr);

  if (error) {
    console.error('Error cleaning api_key_usage:', error.message);
  } else {
    console.log(`Successfully deleted ${count} log rows.`);
  }

  // 2. You can add more cleanup here if you have other heavy tables
  
  console.log('Cleanup finished. Please wait a few minutes for Supabase to reflect the storage change.');
}

cleanup();
