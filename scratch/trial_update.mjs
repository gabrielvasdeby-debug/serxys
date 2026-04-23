
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

async function trialUpdate() {
  const companyId = "7139c2fb-44f0-4f75-8c62-d8e44cdc9466";
  const companyKey = `os_settings_${companyId}`;
  
  const { data: current } = await supabase.from('app_settings').select('*').eq('key', companyKey).single();
  const newValue = { ...current.value, nextOsNumber: 1 };
  
  console.log('🔄 Trying to update with company_id...');
  const { error: err1 } = await supabase
    .from('app_settings')
    .upsert({ key: companyKey, value: newValue, company_id: companyId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  
  if (err1) {
    console.error('❌ Error with company_id:', err1.message);
  } else {
    console.log('✅ Success with company_id!');
  }

  console.log('🔄 Trying to update WITHOUT company_id...');
  const { error: err2 } = await supabase
    .from('app_settings')
    .upsert({ key: companyKey, value: newValue, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (err2) {
    console.error('❌ Error WITHOUT company_id:', err2.message);
  } else {
    console.log('✅ Success WITHOUT company_id!');
  }
}

trialUpdate();
