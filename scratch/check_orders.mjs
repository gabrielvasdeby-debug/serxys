import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://medymhlxzfzfkjvkkexa.supabase.co";
const supabaseKey = "sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde";

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const orderId = '1775901245673';
  console.log(`Fetching order ${orderId} with customers join...`);
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(*)')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Error Details:', error.details);
    console.error('Error Hint:', error.hint);
  } else {
    console.log('Order found with customer:', data);
  }
}

test();
