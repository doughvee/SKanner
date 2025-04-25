import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = 'https://hzoehlkvqxeqkiedipuk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6b2VobGt2cXhlcWtpZWRpcHVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk0NzkzOSwiZXhwIjoyMDU1NTIzOTM5fQ.zQYaDqgYqCMDLmwml_w9mDqkLm7zxXF41uvRLx2w1X4';


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
