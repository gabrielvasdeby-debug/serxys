import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://medymhlxzfzfkjvkkexa.supabase.co";
const supabaseKey = "sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSessions() {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('status', 'open');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Open Sessions:', JSON.stringify(data, null, 2));
}

checkSessions();
