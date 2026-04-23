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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSettings() {
  console.log('🔍 Checking settings...');
  
  // 1. Get company id from first profile
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('company_id').limit(1);
  if (pErr || !profiles?.length) {
    console.error('❌ Could not find company id', pErr);
    return;
  }
  const companyId = profiles[0].company_id;
  const companyKey = `os_settings_${companyId}`;
  
  console.log(`🏢 Company ID: ${companyId}`);
  console.log(`🔑 Company Key: ${companyKey}`);

  // 2. Try to update the setting to 1 manually
  console.log('🔄 Attempting to force nextOsNumber to 1...');
  
  // First, let's see what's there
  const { data: current } = await supabase.from('app_settings').select('*').in('key', ['os_settings', companyKey]);
  console.log('📦 Current rows in app_settings:', JSON.stringify(current, null, 2));

  for (const row of (current || [])) {
    const newValue = { ...row.value, nextOsNumber: 1 };
    console.log(`🛠️ Updating row [${row.key}]...`);
    
    // We try to update WITHOUT company_id first to see if it's the culprit
    const { error: updErr } = await supabase
      .from('app_settings')
      .update({ value: newValue })
      .eq('key', row.key);

    if (updErr) {
      console.error(`❌ Error updating [${row.key}]:`, updErr.message);
    } else {
      console.log(`✅ [${row.key}] updated to 1!`);
    }
  }
  
  console.log('🏁 Finished.');
}

fixSettings();
