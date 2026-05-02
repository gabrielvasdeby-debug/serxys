import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log('Checking orders table...');
  const { data, error } = await supabase.from('orders').select('id, public_id, os_number').limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.table(data);
  
  const mismatch = data.filter(o => o.id !== o.public_id);
  if (mismatch.length > 0) {
    console.log('⚠️ Warning: public_id does NOT match id for some rows.');
    console.log('This means links using /os/[id] will only work if the RPC uses OR id = p_public_id.');
  } else {
    console.log('✅ public_id matches id.');
  }
}

check();
