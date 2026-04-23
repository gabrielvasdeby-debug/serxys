import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://medymhlxzfzfkjvkkexa.supabase.co";
const supabaseKey = "sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('suppliers').insert({
    id: crypto.randomUUID(),
    company_name: 'Test Supplier',
    contact_name: 'Contact',
    phone: '123456789',
    email: '',
    supply_type: 'Test',
    address: 'Test Address',
    updated_at: new Date().toISOString()
  }).select();

  if (error) {
    console.log('Error found:');
    console.log(error);
  } else {
    console.log('Success:', data);
  }
}

testInsert();
