import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const fixturesPath = path.resolve(__dirname, '..', 'public', 'fixtures.json')
const raw = await readFile(fixturesPath, 'utf8')
const payload = JSON.parse(raw)

const rows = Object.entries(payload.competitions || {}).map(([competitionId, competition]) => ({
  competition_id: competitionId,
  source: competition.source || '',
  display_updated_at: competition.updatedAt || payload.updatedAt || '',
  note: competition.note || '',
  competition_results: competition.competitionResults || {},
  matches: competition.matches || [],
  synced_at: new Date().toISOString(),
}))

const { error } = await supabase.from('competition_snapshots').upsert(rows)

if (error) {
  throw error
}

console.log(`Synced ${rows.length} competitions to Supabase.`)
