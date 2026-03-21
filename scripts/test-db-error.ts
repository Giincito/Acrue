import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    console.log("Testing insert...");
    const req = await supabase.from('reminders').insert({
        user_id: 'db56b825-9bba-4e4b-bce9-ee3cdbb0c1dd', // just a test
        title: 'test',
        trigger_at: new Date().toISOString(),
        is_all_day: true
    }).select().single();
    
    console.log("INSERT: ", req.error?.message || "Success");
}
main();
