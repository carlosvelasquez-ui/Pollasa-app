import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function loadFixturesPayload() {
  const fixturesPath = path.resolve(__dirname, '..', 'public', 'fixtures.json')
  const raw = await readFile(fixturesPath, 'utf8')
  return JSON.parse(raw)
}

async function syncFixtures() {
  const supabase = getSupabaseAdminClient()
  const payload = await loadFixturesPayload()

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

  return {
    ok: true,
    competitions: rows.length,
    syncedAt: new Date().toISOString(),
  }
}

export default async function handler(_req, res) {
  try {
    const result = await syncFixtures()
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error?.message || 'Unable to sync fixtures',
    })
  }
}
