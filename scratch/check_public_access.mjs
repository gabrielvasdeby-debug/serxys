import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAccess() {
  console.log('--- Checking Public Access ---');
  
  // 1. Check Orders (should work for public IDs)
  const { data: orders, error: orderErr } = await supabase.from('orders').select('id, os_number, company_id').limit(1);
  console.log('Orders Access:', orderErr ? `FAILED: ${orderErr.message}` : 'SUCCESS');

  if (orders && orders.length > 0) {
    const companyId = orders[0].company_id;
    console.log(`Using Company ID: ${companyId}`);

    // 2. Check Company Settings
    const { data: comp, error: compErr } = await supabase.from('company_settings').select('*').eq('id', companyId).single();
    console.log('Company Settings Access:', compErr ? `FAILED: ${compErr.message}` : 'SUCCESS');

    // 3. Check App Settings
    const { data: sett, error: settErr } = await supabase.from('app_settings').select('*').eq('company_id', companyId).eq('key', 'os_settings').single();
    console.log('App Settings Access:', settErr ? `FAILED: ${settErr.message}` : 'SUCCESS');
    
    if (compErr || settErr) {
        console.log('\n--- DIAGNOSIS: RLS is blocking public access to settings ---');
    }
  } else {
    console.log('No orders found to test company settings access.');
  }
}

checkAccess();
