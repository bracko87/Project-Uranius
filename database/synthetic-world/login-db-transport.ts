import { syntheticWorldDraft } from './stage-input'

function fixture(manager: 'a' | 'b') {
  const ordinal = manager === 'a' ? 0 : 1
  const club = syntheticWorldDraft.clubProfiles[ordinal]
  return { email: 'fixture-manager-' + manager + '@' + 'uranius.example', name: 'Fixture Team ' + club.teamId, club }
}

export const CharacterData = { a: fixture('a'), b: fixture('b') }

export async function request(path: string, method = 'GET', body?: object) {
  const response = await fetch('/fixture/' + path, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return response.ok ? response.json() : null
}

export async function getFixtureDashboard(ownerTeam: number) {
  const data = await request('dashboard')
  const expected = syntheticWorldDraft.clubProfiles[ownerTeam - 1]?.clubId
  return data?.club?.id === expected && expected ? data : null
}

export const supabase = {
  auth: {
    async signInWithPassword(fields: { email: string; password: string }) {
      const ok = await request('login', 'POST', fields)
      return ok ? { data: { session: {} }, error: null } : { data: null, error: { message: 'Login rejected' } }
    },
    async signOut() {
      if (!(await request('logout', 'POST'))) throw new Error('Sign-out failed')
    },
    async getUser() {
      const data = await request('dashboard')
      return { data: { user: data?.club ? { id: data.club.owner_user_id } : null }, error: null }
    },
  },
  async rpc(name: string) {
    if (name !== 'get_my_club_id') throw new Error('Unexpected fixture RPC')
    return { data: (await request('dashboard'))?.club?.id ?? null, error: null }
  },
  from(name: string) {
    if (name !== 'clubs') throw new Error('Unexpected fixture table')
    return { select: () => ({ eq: (column: string, user: string) => ({ in: () => ({
      async order() {
        const row = (await request('dashboard'))?.club
        return { data: column === 'owner_user_id' && row?.owner_user_id === user ? [row] : [], error: null }
      },
    }) }) }) }
  },
}
