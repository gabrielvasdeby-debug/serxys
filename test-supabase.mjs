import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://medymhlxzfzfkjvkkexa.supabase.co";
const supabaseKey = "sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const t_profiles = await supabase.from('profiles').select('*').limit(1);
  const t_customers = await supabase.from('customers').select('*').limit(1);
  const t_orders = await supabase.from('orders').select('*').limit(1);
  const t_products = await supabase.from('produtos').select('*').limit(1); // checking if it's produtos or products
  
  console.log('Profiles:', t_profiles.error ? t_profiles.error.message : 'OK');
  console.log('Customers:', t_customers.error ? t_customers.error.message : 'OK');
  console.log('Orders:', t_orders.error ? t_orders.error.message : 'OK');
  console.log('Produtos:', t_products.error ? t_products.error.message : 'OK');
}

checkTables();
