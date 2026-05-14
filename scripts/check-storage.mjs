
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envFile = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
    const envConfig = dotenv.parse(fs.readFileSync(envFile));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStorage() {
    console.log('Checking Supabase Storage Buckets...');
    
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
        console.error('Error fetching buckets:', bucketError);
        return;
    }

    console.log(`Found ${buckets.length} buckets.`);

    for (const bucket of buckets) {
        console.log(`\nBucket: ${bucket.name}`);
        
        // List all files (recursive listing isn't directly available in a single call, but we can try to get an idea)
        const { data: files, error: fileError } = await supabase.storage.from(bucket.name).list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'desc' },
        });

        if (fileError) {
            console.error(`Error listing files in ${bucket.name}:`, fileError);
            continue;
        }

        console.log(`Top ${files.length} files:`);
        files.forEach(f => {
             console.log(`- ${f.name} (${(f.metadata?.size / 1024 / 1024).toFixed(2)} MB)`);
        });
    }
}

checkStorage();
