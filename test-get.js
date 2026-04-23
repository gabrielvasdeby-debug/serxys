const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://medymhlxzfzfkjvkkexa.supabase.co', 'sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde');

async function test() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}
test();
