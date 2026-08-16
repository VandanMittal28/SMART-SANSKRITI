const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
const lines = envText.split('\n');
let supabaseUrl = '';
let supabaseKey = '';
for (const line of lines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  if (error) {
    console.log("Error:", error);
  } else if (data && data.length > 0) {
    console.log("DATA:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No data");
  }
}
check();
