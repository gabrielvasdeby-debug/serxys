import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://medymhlxzfzfkjvkkexa.supabase.co";
const supabaseKey = "sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSignatures() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, os_number, status, signatures, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching orders:', error.message);
    return;
  }

  console.log('Last 5 orders:');
  data.forEach(order => {
    console.log(`OS: ${order.os_number}, Status: ${order.status}, CreatedAt: ${order.created_at}`);
    console.log('Signatures keys:', order.signatures ? Object.keys(order.signatures) : 'None');
    console.log('Signatures client length:', order.signatures?.client ? order.signatures.client.length : 'None');
    console.log('Signatures client preview (first 40 chars):', order.signatures?.client ? order.signatures.client.substring(0, 40) : 'None');
    console.log('Signatures technician length:', order.signatures?.technician ? order.signatures.technician.length : 'None');
    console.log('Signatures details:', JSON.stringify(order.signatures, null, 2));
    console.log('----------------------------------------------------');
  });
}

checkSignatures();
