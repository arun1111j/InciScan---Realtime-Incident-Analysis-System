
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zamwjejxfxevlfejyrpu.supabase.co'
const supabaseKey = 'sb_publishable_ZyGAmt8knD7n9KVYfyBabg_SRPgNC9W' // Note: Usually this should be in .env.local

export const supabase = createClient(supabaseUrl, supabaseKey)
