import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://medymhlxzfzfkjvkkexa.supabase.co',
  'sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde'
);

// The real question: does the .select('id, os_number') on insert
// cause Supabase PostgREST to fail if there's a DB function/trigger
// that reads public_id?
// Let's test a select query that mimics what the insert+select does:
const { data, error } = await s.from('orders').select('id, os_number').limit(1);
console.log('SELECT id,os_number error:', JSON.stringify(error));
console.log('SELECT id,os_number data:', JSON.stringify(data));

// Now check if there's something in the RLS policy itself referencing public_id
const { data: data2, error: error2 } = await s.from('orders').select('*').limit(1);
console.log('\nSELECT * error:', JSON.stringify(error2));
console.log('Columns in orders:', data2 && data2[0] ? Object.keys(data2[0]).join(', ') : 'none');
