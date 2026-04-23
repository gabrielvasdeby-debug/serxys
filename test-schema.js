const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://medymhlxzfzfkjvkkexa.supabase.co', 'sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde');

async function test() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'products' }); 
  // If rpc doesn't exist, we can just do a select with limit 1
  const { data: products, error: pError } = await supabase.from('products').select('*').limit(1);
  console.log(products);
}
test();
