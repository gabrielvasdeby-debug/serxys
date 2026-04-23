const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://medymhlxzfzfkjvkkexa.supabase.co', 'sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde');

async function test() {
  const { data, error } = await supabase.from('products').insert({
    name: 'Test',
    category: 'Test',
    description: 'Test',
    barcode: '123456789',
    price: 10,
    cost_price: 5,
    stock: 10,
    min_stock: 5,
    image: '',
    updated_at: new Date().toISOString()
  }).select().single();

  console.log("Data:", data);
  console.log("RAW Error object:", error);
  console.log("JSON.stringify(error):", JSON.stringify(error));
  if (error) {
     console.log("error instanceof Error?", error instanceof Error);
     console.log("error properties:", Object.getOwnPropertyNames(error));
     console.log("error.message:", error.message);
  }
}
test();
