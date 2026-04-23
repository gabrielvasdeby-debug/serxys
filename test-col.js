const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://medymhlxzfzfkjvkkexa.supabase.co', 'sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde');

async function test() {
  const { data: cols, error: colsErr } = await supabase.rpc('get_table_info', {table_name: 'products'});
  if (colsErr) {
     const { data, error } = await supabase.from('products').select().limit(1);
     console.log('Test select:', error);
  } else {
     console.log('Columns:', cols);
  }
}
test();
