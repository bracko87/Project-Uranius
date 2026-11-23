import { syntheticWorldDraft } from './stage-input'

function fixture(manager: 'a' | 'b') {
  const ordinal = manager === 'a' ? 0 : 1
  const club = syntheticWorldDraft.clubProfiles[ordinal]
  return {
    id: syntheticWorldDraft.managers[ordinal].slot,
    email: 'offline-manager-' + manager + '@' + 'fixture.invalid',
    name: 'Fixture Team ' + club.teamId,
    club,
  }
}

export const CharacterData = { a: fixture('a'), b: fixture('b') }
let session: ReturnType<typeof fixture> | undefined

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
