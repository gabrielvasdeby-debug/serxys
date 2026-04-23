
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

async function inspect() {
  const { data: app_settings } = await supabase.from('app_settings').select('*');
  console.log('APP SETTINGS:', JSON.stringify(app_settings, null, 2));
  
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('PROFILES:', JSON.stringify(profiles, null, 2));

  const { data: companies } = await supabase.from('company_settings').select('*');
  console.log('COMPANY SETTINGS:', JSON.stringify(companies, null, 2));
}

inspect();
