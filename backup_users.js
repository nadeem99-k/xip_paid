const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = "https://lxyyugiwagokeatmedaf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eXl1Z2l3YWdva2VhdG1lZGFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM4NzYyNSwiZXhwIjoyMDg1OTYzNjI1fQ.8dM1EJFwTZdwUyklv07DZig49BpzBv0Fhn-_i-Pi-Ks";

const supabase = createClient(supabaseUrl, supabaseKey);

async function backup() {
    console.log('Fetching all users for backup...');
    try {
        const { data, error } = await supabase.from('users').select('*');

        if (error) {
            console.error('Backup failed:', error.message);
            process.exit(1);
        }

        const backupPath = path.join(__dirname, 'users_backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
        console.log(`SUCCESS! Backed up ${data.length} users to users_backup.json`);
    } catch (e) {
        console.error('Unexpected error:', e.message);
        process.exit(1);
    }
}

backup();
