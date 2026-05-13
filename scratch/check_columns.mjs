
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

async function run() {
  // Try to find any profile to see columns
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error fetching profile:', error);
  } else if (data && data.length > 0) {
    console.log('COLUMNS:', Object.keys(data[0]));
  } else {
    console.log('No profiles found or no permission.');
  }
}

run();
