import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('warranties').select('*').limit(1);
  if (error) {
    console.error('Error fetching warranties:', error);
  } else {
    console.log('Sample warranty:', data);
  }
}

check();
