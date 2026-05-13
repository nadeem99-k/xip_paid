const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupBucket() {
  const BUCKET_NAME = 'generated_images';
  console.log(`--- Cleaning Bucket: ${BUCKET_NAME} ---`);

  try {
    // 1. List all folders (since files are under user_id/folders)
    // We'll try to list everything at the root first
    const { data: rootFiles, error: listError } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 100 });
    
    if (listError) {
      console.error('Error listing root files:', listError.message);
      return;
    }

    if (!rootFiles || rootFiles.length === 0) {
      console.log('Bucket is already empty or could not find files.');
      return;
    }

    console.log(`Found ${rootFiles.length} items at root. Processing...`);

    for (const item of rootFiles) {
        if (item.id === undefined) { // It's a folder (user_id)
            console.log(`Cleaning folder: ${item.name}`);
            const { data: subFiles } = await supabase.storage.from(BUCKET_NAME).list(item.name);
            if (subFiles && subFiles.length > 0) {
                const pathsToDelete = subFiles.map(f => `${item.name}/${f.name}`);
                const { error: delErr } = await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete);
                if (delErr) console.error(`Failed to delete files in ${item.name}:`, delErr.message);
                else console.log(`Deleted ${pathsToDelete.length} files from ${item.name}`);
            }
        } else {
            // It's a file at root
            const { error: delErr } = await supabase.storage.from(BUCKET_NAME).remove([item.name]);
            if (delErr) console.error(`Failed to delete root file ${item.name}:`, delErr.message);
            else console.log(`Deleted root file: ${item.name}`);
        }
    }

    console.log('Bucket cleanup attempt finished.');
    console.log('NOTE: To fully empty it, you might need to run this multiple times if you have thousands of users.');
  } catch (err) {
    console.error('Unexpected error during bucket cleanup:', err.message);
  }
}

cleanupBucket();
