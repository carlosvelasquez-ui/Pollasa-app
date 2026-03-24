import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

function isRecoverableLockError(error) {
  return (
    error &&
    typeof error.message === 'string' &&
    error.message.includes('auth-token') &&
    error.message.includes('stole it')
  )
}

async function wait(ms) {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function withSupabaseRetry(task, attempts = 3) {
  let lastError = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task()
    } catch (error) {
      lastError = error

      if (!isRecoverableLockError(error) || attempt === attempts - 1) {
        throw error
      }

      await wait(250 * (attempt + 1))
    }
  }

  throw lastError
}

export async function fetchRemoteSnapshot(userId, defaultScoring) {
  return withSupabaseRetry(async () => {
    if (!supabase || !userId) {
      return { users: [], leagues: [], leagueEntries: {}, selectedLeagueId: '' }
    }

    const [ownedLeaguesRes, memberRowsRes, pendingRowsRes, profilesRes] = await Promise.all([
      supabase.from('leagues').select('*').eq('owner_id', userId),
      supabase.from('league_members').select('league_id').eq('user_id', userId),
      supabase
        .from('join_requests')
        .select('league_id')
        .eq('user_id', userId)
        .eq('status', 'pending'),
      supabase.from('profiles').select('id, name, email'),
    ])

    if (ownedLeaguesRes.error) throw ownedLeaguesRes.error
    if (memberRowsRes.error) throw memberRowsRes.error
    if (pendingRowsRes.error) throw pendingRowsRes.error
    if (profilesRes.error) throw profilesRes.error

    const leagueIds = [
      ...new Set([
        ...(ownedLeaguesRes.data || []).map((league) => league.id),
        ...(memberRowsRes.data || []).map((row) => row.league_id),
        ...(pendingRowsRes.data || []).map((row) => row.league_id),
      ]),
    ]

    if (!leagueIds.length) {
      return {
        users: (profilesRes.data || []).map((profile) => ({
          id: profile.id,
          name: profile.name,
          email: profile.email,
        })),
        leagues: [],
        leagueEntries: {},
        selectedLeagueId: '',
      }
    }

    const [leaguesRes, membersRes, requestsRes, entriesRes] = await Promise.all([
      supabase.from('leagues').select('*').in('id', leagueIds),
      supabase.from('league_members').select('*').in('league_id', leagueIds),
      supabase.from('join_requests').select('*').in('league_id', leagueIds),
      supabase.from('league_entries').select('*').in('league_id', leagueIds),
    ])

    if (leaguesRes.error) throw leaguesRes.error
    if (membersRes.error) throw membersRes.error
    if (requestsRes.error) throw requestsRes.error
    if (entriesRes.error) throw entriesRes.error

    const memberMap = new Map()
    for (const row of membersRes.data || []) {
      if (!memberMap.has(row.league_id)) {
        memberMap.set(row.league_id, [])
      }
      memberMap.get(row.league_id).push(row.user_id)
    }

    const requestMap = new Map()
    for (const row of requestsRes.data || []) {
      if (!requestMap.has(row.league_id)) {
        requestMap.set(row.league_id, [])
      }
      requestMap.get(row.league_id).push({
        userId: row.user_id,
        requestedAt: row.requested_at,
        status: row.status,
      })
    }

    const leagueEntries = {}
    for (const row of entriesRes.data || []) {
      if (!leagueEntries[row.league_id]) {
        leagueEntries[row.league_id] = {}
      }
      leagueEntries[row.league_id][row.user_id] = {
        predictions: row.predictions || {},
        bonusPicks: row.bonus_picks || {},
      }
    }

    const leagues = (leaguesRes.data || [])
      .map((league) => ({
        id: league.id,
        name: league.name,
        code: league.code,
        inviteCode: league.invite_code,
        type: league.type,
        competition: league.competition,
        competitionId: league.competition_id,
        entry: league.entry,
        prize: league.prize,
        ownerId: league.owner_id,
        deadline: league.deadline,
        members: memberMap.get(league.id) || [],
        joinRequests: requestMap.get(league.id) || [],
        scoring: league.scoring || defaultScoring(),
        bonusEditOverrides: league.bonus_edit_overrides || {},
      }))
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))

    return {
      users: (profilesRes.data || []).map((profile) => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
      })),
      leagues,
      leagueEntries,
      selectedLeagueId: leagues[0]?.id || '',
    }
  })
}

export async function fetchRemoteCompetitionSnapshots() {
  if (!supabase) {
    return null
  }

  try {
    const { data, error } = await withSupabaseRetry(() =>
      supabase.from('competition_snapshots').select('*'),
    )

    if (error) {
      throw error
    }

    if (!data?.length) {
      return null
    }

    return Object.fromEntries(
      data.map((row) => [
        row.competition_id,
        {
          source: row.source,
          updatedAt: row.display_updated_at,
          note: row.note,
          competitionResults: row.competition_results || {},
          matches: row.matches || [],
        },
      ]),
    )
  } catch {
    return null
  }
}

export async function ensureRemoteProfile(user, name) {
  if (!supabase || !user) {
    return
  }

  const payload = {
    id: user.id,
    name: name || user.user_metadata?.name || user.email?.split('@')[0] || 'Jugador',
    email: user.email,
  }

  const { error } = await withSupabaseRetry(() => supabase.from('profiles').upsert(payload))
  if (error) throw error
}

export async function signUpRemote({ email, password, name }) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) throw error
  if (data.user) {
    await ensureRemoteProfile(data.user, name)
  }

  return data
}

export async function signInRemote({ email, password }) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  if (data.user) {
    await ensureRemoteProfile(data.user)
  }

  return data
}

export async function signOutRemote() {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function createLeagueRemote(league, currentUserId, entry) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { error: leagueError } = await withSupabaseRetry(() =>
    supabase.from('leagues').insert({
      id: league.id,
      name: league.name,
      code: league.code,
      invite_code: league.inviteCode,
      type: league.type,
      competition: league.competition,
      competition_id: league.competitionId,
      entry: league.entry,
      prize: league.prize,
      owner_id: league.ownerId,
      deadline: league.deadline,
      scoring: league.scoring,
      bonus_edit_overrides: league.bonusEditOverrides || {},
    }),
  )

  if (leagueError) throw leagueError

  const { error: memberError } = await withSupabaseRetry(() =>
    supabase.from('league_members').insert({
      league_id: league.id,
      user_id: currentUserId,
    }),
  )

  if (memberError) throw memberError

  const { error: entryError } = await withSupabaseRetry(() =>
    supabase.from('league_entries').upsert({
      league_id: league.id,
      user_id: currentUserId,
      predictions: entry.predictions,
      bonus_picks: entry.bonusPicks,
    }),
  )

  if (entryError) throw entryError
}

export async function requestJoinLeagueRemote(inviteCode, currentUserId) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { data: league, error: leagueError } = await withSupabaseRetry(() =>
    supabase.from('leagues').select('*').eq('invite_code', inviteCode).maybeSingle(),
  )

  if (leagueError) throw leagueError
  if (!league) return null

  const { data: existingRequest, error: existingRequestError } = await withSupabaseRetry(() =>
    supabase
      .from('join_requests')
      .select('*')
      .eq('league_id', league.id)
      .eq('user_id', currentUserId)
      .maybeSingle(),
  )

  if (existingRequestError) throw existingRequestError

  if (!existingRequest) {
    const { error } = await withSupabaseRetry(() =>
      supabase.from('join_requests').insert({
        league_id: league.id,
        user_id: currentUserId,
        status: 'pending',
        requested_at: new Date().toISOString(),
      }),
    )

    if (error) throw error
    return league
  }

  if (existingRequest.status === 'pending') {
    return league
  }

  const { error } = await withSupabaseRetry(() =>
    supabase
      .from('join_requests')
      .update({
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .eq('league_id', league.id)
      .eq('user_id', currentUserId),
  )

  if (error) throw error
  return league
}

export async function updateJoinRequestRemote({
  leagueId,
  userId,
  nextStatus,
  entry,
}) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { data, error } = await withSupabaseRetry(() =>
    supabase.rpc('handle_join_request', {
      p_league_id: leagueId,
      p_user_id: userId,
      p_next_status: nextStatus,
      p_predictions: entry.predictions,
      p_bonus_picks: entry.bonusPicks,
    }),
  )

  if (error) throw error
  if (!data) {
    throw new Error('Supabase no devolvio respuesta al procesar la solicitud.')
  }
}

export async function saveLeagueEntryRemote(leagueId, userId, entry) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { error } = await supabase.from('league_entries').upsert({
    league_id: leagueId,
    user_id: userId,
    predictions: entry.predictions,
    bonus_picks: entry.bonusPicks,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}

export async function updateLeagueScoringRemote(leagueId, scoring) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { error } = await supabase.from('leagues').update({ scoring }).eq('id', leagueId)
  if (error) throw error
}

export async function updateLeagueBonusOverridesRemote(leagueId, bonusOverrides) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { error } = await supabase
    .from('leagues')
    .update({ bonus_edit_overrides: bonusOverrides })
    .eq('id', leagueId)

  if (error) throw error
}

export async function deleteLeagueRemote(leagueId, ownerId) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { error } = await withSupabaseRetry(() =>
    supabase.from('leagues').delete().eq('id', leagueId).eq('owner_id', ownerId),
  )

  if (error) throw error
}

export async function leaveLeagueRemote(leagueId, userId) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { error: memberError } = await withSupabaseRetry(() =>
    supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', userId),
  )

  if (memberError) throw memberError

  const { error: entryError } = await withSupabaseRetry(() =>
    supabase.from('league_entries').delete().eq('league_id', leagueId).eq('user_id', userId),
  )

  if (entryError) throw entryError
}

export async function removeLeagueMemberRemote(leagueId, userId) {
  if (!supabase) {
    throw new Error('Supabase no configurado.')
  }

  const { error: memberError } = await withSupabaseRetry(() =>
    supabase.from('league_members').delete().eq('league_id', leagueId).eq('user_id', userId),
  )

  if (memberError) throw memberError

  const { error: entryError } = await withSupabaseRetry(() =>
    supabase.from('league_entries').delete().eq('league_id', leagueId).eq('user_id', userId),
  )

  if (entryError) throw entryError

  const { error: requestError } = await withSupabaseRetry(() =>
    supabase.from('join_requests').delete().eq('league_id', leagueId).eq('user_id', userId),
  )

  if (requestError) throw requestError
}
