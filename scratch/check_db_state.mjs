import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Checking database...');
  
  // 1. Check if public_id column exists
  const { data: columns, error: colErr } = await supabase.rpc('debug_get_columns', { p_table: 'orders' });
  if (colErr) {
    // Fallback: try to select it
    const { error: selectErr } = await supabase.from('orders').select('public_id').limit(1);
    if (selectErr) {
      console.log('❌ public_id column does NOT exist in orders table.');
    } else {
      console.log('✅ public_id column exists.');
    }
  } else {
    const hasPublicId = columns.some(c => c.column_name === 'public_id');
    console.log(hasPublicId ? '✅ public_id column exists.' : '❌ public_id column does NOT exist.');
  }

  // 2. Check if functions exist
  const functions = ['public_sign_order', 'get_public_order', 'get_public_customer'];
  for (const fn of functions) {
    const { error: fnErr } = await supabase.rpc(fn, { p_public_id: '00000000-0000-0000-0000-000000000000' });
    // We expect a "no rows returned" or similar, but NOT "function does not exist"
    if (fnErr && fnErr.message.includes('does not exist')) {
      console.log(`❌ Function ${fn} does NOT exist.`);
    } else {
      console.log(`✅ Function ${fn} exists.`);
    }
  }
}

check();
