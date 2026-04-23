import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://medymhlxzfzfkjvkkexa.supabase.co";
const supabaseKey = "sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppSettings() {
  console.log('--- Checking app_settings table ---');
  try {
    const { data, error, status } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'os_settings')
      .single();

    if (error) {
      console.error(`Error fetching app_settings (status: ${status}):`, error.message);
    } else {
      console.log('Successfully fetched app_settings:', JSON.stringify(data, null, 2));
    }

    const { data: allRows, error: allErr } = await supabase.from('app_settings').select('*');
    if (allErr) {
      console.error('Error fetching all rows from app_settings:', allErr.message);
    } else {
      console.log(`Found ${allRows.length} rows in app_settings table.`);
      allRows.forEach(row => console.log(`- Key: ${row.key}`));
    }
  } catch (err) {
    console.error('Fatal error in script:', err);
  }
}

checkAppSettings();
