
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) {
    let value = rest.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key.trim()] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceReset() {
  console.log('🚀 FORCING OS NUMBER TO 1...');
  
  const { data: rows } = await supabase.from('app_settings').select('*');
  
  for (const row of (rows || [])) {
    if (row.key.startsWith('os_settings')) {
       console.log(`🛠️ Resetting ${row.key}...`);
       const newValue = { ...row.value, nextOsNumber: 1 };
       const { error } = await supabase
         .from('app_settings')
         .update({ value: newValue })
         .eq('key', row.key);
       
       if (error) console.error(`❌ Error on ${row.key}:`, error.message);
       else console.log(`✅ ${row.key} is now 1.`);
    }
  }
  
  console.log('✨ Cleanup complete.');
}

forceReset();
