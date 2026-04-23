const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://medymhlxzfzfkjvkkexa.supabase.co', 'sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde');

async function test() {
  const { data, error } = await supabase.from('products').update({ name: 'Test' }).eq('id', 'non-existent-id');
  console.log("Update Data:", data);
  console.log("Update Error:", error);
}
test();
