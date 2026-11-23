import { syntheticWorldDraft } from './stage-input'

function fixture(manager: 'a' | 'b') {
  const ordinal = manager === 'a' ? 0 : 1
  const club = syntheticWorldDraft.clubProfiles[ordinal]
  return {
    id: syntheticWorldDraft.managers[ordinal].slot,
    email: 'fixture-manager-' + manager + '@' + 'uranius.example',
    name: 'Fixture Team ' + club.teamId,
    club,
  }
}

export const CharacterData = { a: fixture('a'), b: fixture('b') }
let session: ReturnType<typeof fixture> | undefined

// Fixture-only reads. PostgreSQL RLS is tested separately by the native rehearsal.
export function getFixtureDashboard(ownerTeam: number) {
  if (session?.club.teamId !== ownerTeam) return null
  return { riders: 10, credits: syntheticWorldDraft.balances[ownerTeam - 1].credits, calendar: syntheticWorldDraft.calendar.length }
}

export const supabase = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      session = Object.values(CharacterData).find(manager => manager.email === email)
      if (!session || password !== 'offline-fixture-only') {
        session = undefined
        return { data: null, error: { message: 'Invalid fixture login' } }
      }
      return { data: { session: {} }, error: null }
    },
    async signOut() { session = undefined; return { error: null } },
    async getUser() { return { data: { user: session }, error: null } },
  },
  async rpc(name: string) {
    if (name !== 'get_my_club_id') throw new Error('Unexpected fixture RPC')
    return { data: session?.club.clubId ?? null, error: null }
  },
  from(name: string) {
    if (name !== 'clubs') throw new Error('Unexpected fixture table')
    return { select: () => ({ eq: (column: string, user: string) => ({ in: () => ({
      async order() {
        const row = session && column === 'owner_user_id' && session.id === user ? [{
          id: session.club.clubId, name: session.name, country_code: session.club.countryCode, club_type: 'main',
        }] : []
        return { data: row, error: null }
      },
    }) }) }) }
  },
}
